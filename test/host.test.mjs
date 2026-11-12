import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

const TRASH_FILE = join(tmpdir(), `dsv-trash-${process.pid}-${Date.now()}.json`);
process.env.DSH_SESSION_VIEW_TRASH = TRASH_FILE;

const { apply, deriveSessionDir } = await import('../lib/index.js');

async function makeRoot() {
  return mkdtemp(join(tmpdir(), 'dsv-root-'));
}

function makeCtx(root, header, options = {}) {
  const routes = new Map();
  const calls = { archive: [], unarchive: [], reindex: 0 };
  const ctx = {
    cleanup: undefined,
    effect(fn) {
      ctx.cleanup = fn();
    },
    webServer: {
      register({ path, handler }) {
        routes.set(path, handler);
        return () => routes.delete(path);
      },
    },
    sessionPersistence: {
      root,
      async list() {
        return header ? [{ header }] : [];
      },
      async open() {
        if (options.busy) throw new Error('session file is already owned by another writer');
        return { async close() {} };
      },
    },
    sessions: {
      get() {
        return options.live ? { id: header?.id, running: options.running === true } : undefined;
      },
    },
    workspaceRegistry: {
      async archiveSession(id) {
        calls.archive.push(id);
      },
      async unarchiveSession(id) {
        if (options.unarchiveFails === id) throw new Error('cannot restore');
        calls.unarchive.push(id);
      },
      async replaceHeaderIndex() {
        calls.reindex += 1;
      },
      rebuildEntities() {},
    },
  };
  return { ctx, routes, calls };
}

async function call(routes, path, body) {
  const request = body === undefined
    ? Readable.from([])
    : Readable.from([Buffer.from(JSON.stringify(body))]);
  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(chunk) {
      this.body = chunk ?? '';
    },
  };
  await routes.get(path)(request, response);
  return { status: response.statusCode, data: JSON.parse(response.body || '{}') };
}

async function seedSession(root, id, cwd) {
  const dir = deriveSessionDir(root, cwd, id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'session.v1.jsonl'), '{"type":"header"}\n');
  return dir;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

test('trash/purge deletes the derived directory and clears the index entry', async () => {
  await rm(TRASH_FILE, { force: true });
  const root = await makeRoot();
  const id = 'session-purge-me';
  const cwd = 'D:\\AI\\demo';
  const dir = await seedSession(root, id, cwd);
  const { ctx, routes, calls } = makeCtx(root, { id, cwd });
  apply(ctx);

  const added = await call(routes, '/session-view/trash/add', {
    items: [{ sessionId: id, title: 'Demo', cwd }],
  });
  assert.equal(added.status, 200);
  assert.equal(added.data.added, 1);
  assert.deepEqual(calls.archive, [id]);
  assert.equal(await exists(dir), true);

  const listed = await call(routes, '/session-view/trash');
  assert.deepEqual(listed.data.items.map((item) => item.sessionId), [id]);

  const purged = await call(routes, '/session-view/trash/purge', { sessionIds: [id] });
  assert.equal(purged.status, 200);
  assert.deepEqual(purged.data.purged, [id]);
  assert.equal(await exists(dir), false);
  assert.equal(calls.reindex, 1);

  const after = await call(routes, '/session-view/trash');
  assert.deepEqual(after.data.items, []);
  ctx.cleanup?.();
});

test('trash/purge refuses a live session and keeps its files', async () => {
  const root = await makeRoot();
  const id = 'session-live';
  const cwd = 'D:\\AI\\live';
  const dir = await seedSession(root, id, cwd);
  const { ctx, routes } = makeCtx(root, { id, cwd }, { live: true });
  apply(ctx);

  const result = await call(routes, '/session-view/trash/purge', { sessionIds: [id] });
  assert.equal(result.status, 200);
  assert.equal(result.data.purged.length, 0);
  assert.match(result.data.failed[0].error, /无法彻底删除/);
  assert.equal(await exists(dir), true);
  ctx.cleanup?.();
});

test('trash/purge with force removes a non-running live session entry', async () => {
  const root = await makeRoot();
  const header = { id: 'session-force', cwd: 'C:/work/force', title: 'force' };
  const { ctx, routes } = makeCtx(root, header, { live: true });
  ctx.cleanup = undefined;
  apply(ctx);
  const dir = deriveSessionDir(root, header.cwd, header.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'log.jsonl'), '{}\n');
  const result = await call(routes, '/session-view/trash/purge', { sessionIds: [header.id], force: true });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.purged, [header.id]);
  assert.equal(await stat(dir).then(() => true, () => false), false);
});

test('trash/purge with force still refuses a running session', async () => {
  const root = await makeRoot();
  const header = { id: 'session-running', cwd: 'C:/work/running', title: 'running' };
  const { ctx, routes } = makeCtx(root, header, { live: true, running: true });
  ctx.cleanup = undefined;
  apply(ctx);
  const dir = deriveSessionDir(root, header.cwd, header.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'log.jsonl'), '{}\n');
  const result = await call(routes, '/session-view/trash/purge', { sessionIds: [header.id], force: true });
  assert.equal(result.status, 200);
  assert.equal(result.data.purged.length, 0);
  assert.match(result.data.failed[0].error, /正在运行/);
  assert.equal(await stat(dir).then(() => true, () => false), true);
});

test('trash/purge removes a stale log the registry no longer lists', async () => {
  const root = await makeRoot();
  const id = 'session-forgotten';
  const { ctx, routes } = makeCtx(root, undefined);
  ctx.cleanup = undefined;
  apply(ctx);
  const dir = deriveSessionDir(root, 'C:/work/forgotten', id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'session.v4.jsonl.zstd'), 'stale');
  const result = await call(routes, '/session-view/trash/purge', { sessionIds: [id] });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.purged, [id]);
  assert.equal(await stat(dir).then(() => true, () => false), false);
});

test('trash/purge refuses a writer-owned session', async () => {
  const root = await makeRoot();
  const id = 'session-busy';
  const cwd = 'D:\\AI\\busy';
  const dir = await seedSession(root, id, cwd);
  const { ctx, routes } = makeCtx(root, { id, cwd }, { busy: true });
  apply(ctx);

  const result = await call(routes, '/session-view/trash/purge', { sessionIds: [id] });
  assert.equal(result.status, 200);
  assert.equal(result.data.purged.length, 0);
  assert.match(result.data.failed[0].error, /正被 DSH 打开/);
  assert.equal(await exists(dir), true);
  ctx.cleanup?.();
});

test('trash/purge reports an unknown id without touching disk', async () => {
  const root = await makeRoot();
  const { ctx, routes } = makeCtx(root, undefined);
  apply(ctx);

  const result = await call(routes, '/session-view/trash/purge', { sessionIds: ['session-unknown'] });
  assert.equal(result.status, 200);
  assert.equal(result.data.purged.length, 0);
  assert.match(result.data.failed[0].error, /找不到该会话/);
  ctx.cleanup?.();
});

test('trash/restore only drops ids that were restored', async () => {
  await rm(TRASH_FILE, { force: true });
  const root = await makeRoot();
  const good = 'session-good';
  const bad = 'session-bad';
  const { ctx, routes, calls } = makeCtx(root, undefined, { unarchiveFails: bad });
  apply(ctx);

  await call(routes, '/session-view/trash/add', {
    items: [
      { sessionId: good, title: 'Good', cwd: '' },
      { sessionId: bad, title: 'Bad', cwd: '' },
    ],
  });
  const restored = await call(routes, '/session-view/trash/restore', { sessionIds: [good, bad] });
  assert.equal(restored.status, 200);
  assert.deepEqual(restored.data.restored, 1);
  assert.deepEqual(calls.unarchive, [good]);
  assert.match(restored.data.failed[0].error, /cannot restore/);

  const listed = await call(routes, '/session-view/trash');
  assert.deepEqual(listed.data.items.map((item) => item.sessionId), [bad]);
  ctx.cleanup?.();
});
