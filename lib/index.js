/**
 * Host half of `dsh-session-view`.
 *
 * DeepSeek Harness has no public API for deleting a session: the persistence
 * seam deliberately exposes no delete call. This plugin therefore owns a small
 * trash index and performs the physical purge itself, using the same guarded
 * layout derivation as the official JSONL backend:
 *
 *   <root>/<projectKey(cwd)>/<encodeSegment(id)>/session.vN.jsonl[.zstd]
 *
 * The purge is refused when the session still has an active writer, when the
 * directory cannot be derived with certainty, or when the backend still reports
 * the session after removal.
 */
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { homedir } from 'node:os';

export const name = 'dsh-session-view';
export const inject = ['webServer', 'workspaceRegistry', 'sessionPersistence', 'sessions'];

const TRASH_FILE = process.env.DSH_SESSION_VIEW_TRASH
  || join(homedir(), '.dsh', 'session-view-trash.json');

function isSafeChar(ch) {
  return ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch);
}

/** Deterministic project directory name used by the JSONL backend. */
export function projectKeyFor(cwd) {
  const value = String(cwd ?? '');
  if (value.length === 0) throw new Error('cannot encode an empty project path');
  let readable = '';
  let separatorRun = false;
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-';
      separatorRun = true;
    } else if (isSafeChar(ch)) {
      readable += ch;
      separatorRun = false;
    } else {
      readable += `~${value.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0')}`;
      separatorRun = false;
    }
  }
  return `--${(readable.replace(/^-+/, '') || 'root').slice(0, 251)}--`;
}

/** Encode a session id into its on-disk directory segment. */
export function encodeSegmentFor(raw) {
  const value = String(raw ?? '');
  if (value.length === 0) throw new Error('cannot encode an empty path segment');
  if (value === '.') return '~002E';
  if (value === '..') return '~002E~002E';
  let out = '';
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    out += isSafeChar(ch) ? ch : `~${value.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0')}`;
  }
  return out;
}

/** Full session directory for a session header carrying `cwd`. */
export function deriveSessionDir(root, cwd, id) {
  const project = cwd === undefined || cwd === null || cwd === ''
    ? join(root, '_no-cwd')
    : join(root, projectKeyFor(cwd));
  return join(project, encodeSegmentFor(id));
}

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === 'string' && item.length > 0))];
}

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    if (!item || typeof item.sessionId !== 'string' || item.sessionId.length === 0) continue;
    if (seen.has(item.sessionId)) continue;
    seen.add(item.sessionId);
    out.push({
      sessionId: item.sessionId,
      title: typeof item.title === 'string' ? item.title : '',
      cwd: typeof item.cwd === 'string' ? item.cwd : '',
      deletedAt: Number.isFinite(item.deletedAt) ? item.deletedAt : Date.now(),
    });
  }
  return out;
}

async function readStore() {
  try {
    const text = await readFile(TRASH_FILE, 'utf8');
    const parsed = JSON.parse(text);
    return {
      version: 1,
      items: Array.isArray(parsed?.items)
        ? parsed.items
          .filter((item) => item && typeof item.sessionId === 'string')
          .map((item) => ({
            sessionId: item.sessionId,
            title: typeof item.title === 'string' ? item.title : '',
            cwd: typeof item.cwd === 'string' ? item.cwd : '',
            deletedAt: Number.isFinite(item.deletedAt) ? item.deletedAt : 0,
          }))
        : [],
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // A damaged index must not take the whole plugin down; start empty.
      console.warn('[dsh-session-view] failed to read trash index:', error?.message ?? error);
    }
    return { version: 1, items: [] };
  }
}

let writeQueue = Promise.resolve();

function writeStore(store) {
  const task = writeQueue.then(async () => {
    await mkdir(dirname(TRASH_FILE), { recursive: true });
    const temp = `${TRASH_FILE}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(store, null, 2), 'utf8');
    await rename(temp, TRASH_FILE);
  });
  writeQueue = task.catch(() => {});
  return task;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.length > 1_000_000) throw new Error('request body too large');
  return JSON.parse(text);
}

function failureText(error) {
  return `${error?.name ?? ''} ${error?.message ?? error}`;
}

function isAlreadyOwned(error) {
  return /already owned/i.test(failureText(error));
}

function statusOf(error) {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
}

async function closeQuietly(handle) {
  try {
    if (handle && typeof handle.close === 'function') await handle.close();
  } catch {
    /* best-effort release */
  }
}

async function archiveQuietly(ctx, sessionId) {
  try {
    await ctx.workspaceRegistry.archiveSession(sessionId);
  } catch (error) {
    if (!/already archived|missing|not found|unknown session/i.test(failureText(error))) throw error;
  }
}

async function unarchiveQuietly(ctx, sessionId) {
  try {
    await ctx.workspaceRegistry.unarchiveSession(sessionId);
  } catch (error) {
    if (!/not archived|missing|not found|unknown session/i.test(failureText(error))) throw error;
  }
}

async function listHeaders(ctx) {
  const entries = await ctx.sessionPersistence.list();
  return (entries ?? [])
    .map((entry) => entry?.header)
    .filter((header) => header && header.id != null);
}

async function reindex(ctx, headers) {
  const registry = ctx.workspaceRegistry;
  if (!registry || typeof registry.replaceHeaderIndex !== 'function') return false;
  try {
    await registry.replaceHeaderIndex(headers);
    if (typeof registry.rebuildEntities === 'function') registry.rebuildEntities();
    return true;
  } catch (error) {
    console.warn('[dsh-session-view] workspace reindex failed:', error?.message ?? error);
    return false;
  }
}

async function purgeOne(ctx, sessionId, options = {}) {
  const persistence = ctx.sessionPersistence;
  const force = options?.force === true;
  const liveStore = ctx.sessions;
  if (liveStore && typeof liveStore.get === 'function' && liveStore.get(sessionId) !== undefined) {
    if (!force) {
      const error = new Error('会话仍在运行或已打开，无法彻底删除');
      error.status = 409;
      throw error;
    }
    const live = liveStore.get(sessionId);
    const snapshot = typeof live?.snapshot === 'function' ? live.snapshot() : undefined;
    if (live?.running === true || snapshot?.running === true) {
      const error = new Error('会话正在运行，请先停止后再强制删除');
      error.status = 409;
      throw error;
    }
    if (liveStore.store && typeof liveStore.store.delete === 'function') liveStore.store.delete(sessionId);
  }

  const root = typeof persistence?.root === 'string' ? persistence.root : '';
  if (!root) {
    const error = new Error('会话存储根目录不可用，无法彻底删除');
    error.status = 409;
    throw error;
  }

  const header = (await listHeaders(ctx)).find((item) => String(item.id) === sessionId);
  let sessionDir = '';
  // The registry forgets or refuses logs it cannot parse; fall back to the
  // trash record's cwd and then to a direct scan so stale entries stay
  // removable instead of becoming undeletable ghosts.
  let probe = Boolean(header);
  if (header) {
    sessionDir = deriveSessionDir(root, header.cwd, sessionId);
  } else {
    let cwd = '';
    try {
      const store = await readStore();
      cwd = store.items.find((item) => item?.sessionId === sessionId)?.cwd ?? '';
    } catch {
      /* an unreadable trash index must not block the scan below */
    }
    if (cwd) {
      const candidate = deriveSessionDir(root, cwd, sessionId);
      const found = await stat(candidate).catch(() => undefined);
      if (found?.isDirectory()) sessionDir = candidate;
    }
    if (!sessionDir) {
      const segment = encodeSegmentFor(sessionId);
      const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const candidate = join(root, entry.name, segment);
        const found = await stat(candidate).catch(() => undefined);
        if (found?.isDirectory()) {
          sessionDir = candidate;
          break;
        }
      }
    }
    if (!sessionDir) {
      const error = new Error('找不到该会话的日志目录（记录已失效，且磁盘上未匹配到目录）');
      error.status = 404;
      throw error;
    }
    probe = false;
  }

  if (basename(sessionDir) !== encodeSegmentFor(sessionId)) {
    const error = new Error('会话目录归属校验失败，已停止删除');
    error.status = 409;
    throw error;
  }
  const before = await stat(sessionDir).catch(() => undefined);
  if (!before || !before.isDirectory()) {
    const error = new Error('会话日志目录不存在或不可访问');
    error.status = 404;
    throw error;
  }

  if (!force && probe) {
    let writer = null;
    try {
      writer = await persistence.open(sessionId, 'write');
    } catch (error) {
      if (isAlreadyOwned(error)) {
        const busy = new Error('会话正被 DSH 打开，暂时无法彻底删除；请关闭会话后再试');
        busy.status = 409;
        throw busy;
      }
      throw error;
    }
    // Release the probe handle before deleting: Windows cannot remove open files.
    await closeQuietly(writer);
  }

  await rm(sessionDir, { recursive: true, force: true });

  const leftover = await stat(sessionDir).catch(() => undefined);
  if (leftover) {
    const error = new Error('删除后目录仍然存在，已中止（目录可能被并发重建）');
    error.status = 500;
    throw error;
  }
  return { sessionId, dir: sessionDir };
}

export function apply(ctx) {
  if (!ctx?.webServer || typeof ctx.webServer.register !== 'function') return;

  ctx.effect(() => {
    const disposers = [];

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/session-view/capabilities',
      handler: async (req, res) => {
        json(res, 200, { ok: true, trash: true, purge: true });
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/session-view/trash',
      handler: async (req, res) => {
        try {
          const store = await readStore();
          json(res, 200, { items: store.items });
        } catch (error) {
          json(res, 500, { error: String(error?.message ?? error) });
        }
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/session-view/trash/add',
      handler: async (req, res) => {
        try {
          const body = await readJsonBody(req);
          const items = normalizeItems(body?.items);
          if (items.length === 0) return json(res, 400, { error: 'missing items' });
          const store = await readStore();
          const byId = new Map(store.items.map((item) => [item.sessionId, item]));
          const failed = [];
          let added = 0;
          for (const item of items) {
            try {
              await archiveQuietly(ctx, item.sessionId);
              byId.set(item.sessionId, { ...item, deletedAt: Date.now() });
              added += 1;
            } catch (error) {
              failed.push({ sessionId: item.sessionId, error: String(error?.message ?? error) });
            }
          }
          if (added > 0) {
            store.items = [...byId.values()];
            await writeStore(store);
          }
          json(res, 200, { ok: failed.length === 0, added, failed });
        } catch (error) {
          json(res, statusOf(error), { error: String(error?.message ?? error) });
        }
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/session-view/trash/restore',
      handler: async (req, res) => {
        try {
          const body = await readJsonBody(req);
          const force = body?.force === true;
          const ids = normalizeIds(body?.sessionIds);
          if (ids.length === 0) return json(res, 400, { error: 'missing sessionIds' });
          const store = await readStore();
          const wanted = new Set(ids);
          const failed = [];
          const restoredIds = new Set();
          let restored = 0;
          for (const id of ids) {
            try {
              await unarchiveQuietly(ctx, id);
              restoredIds.add(id);
              restored += 1;
            } catch (error) {
              failed.push({ sessionId: id, error: String(error?.message ?? error) });
            }
          }
          if (restoredIds.size > 0) {
            store.items = store.items.filter((item) => !restoredIds.has(item.sessionId));
            await writeStore(store);
          }
          json(res, 200, { ok: failed.length === 0, restored, failed });
        } catch (error) {
          json(res, statusOf(error), { error: String(error?.message ?? error) });
        }
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/session-view/trash/purge',
      handler: async (req, res) => {
        try {
          const body = await readJsonBody(req);
          const force = body?.force === true;
          const ids = normalizeIds(body?.sessionIds);
          if (ids.length === 0) return json(res, 400, { error: 'missing sessionIds' });
          const store = await readStore();
          const wanted = new Set(ids);
          const purged = [];
          const failed = [];
          for (const id of ids) {
            try {
              const result = await purgeOne(ctx, id, { force });
              purged.push(result.sessionId);
            } catch (error) {
              failed.push({ sessionId: id, error: String(error?.message ?? error) });
            }
          }
          if (purged.length > 0) {
            store.items = store.items.filter((item) => !wanted.has(item.sessionId));
            await writeStore(store);
            await reindex(ctx, await listHeaders(ctx));
          }
          json(res, 200, { ok: failed.length === 0, purged, failed });
        } catch (error) {
          json(res, statusOf(error), { error: String(error?.message ?? error) });
        }
      },
    }));

    return () => {
      for (const dispose of disposers) {
        try {
          dispose?.();
        } catch {
          /* best-effort */
        }
      }
    };
  });
}
