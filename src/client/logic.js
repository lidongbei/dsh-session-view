/**
 * Pure helpers for the session view.
 *
 * Nothing here imports React or any Harness package: the functions operate on
 * the plain snapshots that the slot runtime injects, which keeps them unit
 * testable in Node without a browser.
 */

/** Status chips, in the order the toolbar renders them. */
export const STATUS_LIST = ['running', 'pending', 'done', 'idle'];

const ALL = 'all';

function asSet(value) {
  return value instanceof Set ? value : new Set(value ?? []);
}

/**
 * Collapse the three facts exposed by SessionStatus into one display status.
 * Pending wins over running because a running turn that waits for the user is
 * blocked on the user, not on the agent.
 */
export function resolveStatus(status, summary) {
  if (status?.pendingInteraction) return 'pending';
  if ((status?.running ?? summary?.running) === true) return 'running';
  if (status?.completionUnread === true) return 'done';
  return 'idle';
}

/** Locale key for the pending sub-state; unknown kinds fall back to generic. */
export function pendingLabelKey(kind) {
  switch (kind) {
    case 'approval':
      return 'pending.approval';
    case 'plan-review':
      return 'pending.planReview';
    case 'question':
      return 'pending.question';
    default:
      return 'pending.generic';
  }
}

/** Locale key for a display status. */
export function statusLabelKey(status) {
  switch (status) {
    case 'running':
      return 'status.running';
    case 'pending':
      return 'status.pending';
    case 'done':
      return 'status.done';
    default:
      return 'status.idle';
  }
}

/**
 * Visible candidates: ordinary Host-list rows plus subagent rows that exist
 * only in the catalog. Archived sessions are excluded. A blank session is only
 * visible while it is retained by the main view, i.e. the freshly created
 * draft the user is currently looking at.
 */
export function buildCandidates(sessions, archived) {
  const archivedSet = asSet(archived);
  const listed = asSet(sessions?.ids);
  const rows = [];
  for (const summary of Object.values(sessions?.byId ?? {})) {
    if (!summary || !summary.id) continue;
    const currentDraft = summary.blank && (summary.retainedBy?.mainView ?? 0) > 0;
    if (summary.blank && !currentDraft) continue;
    if (archivedSet.has(summary.id)) continue;
    if (!listed.has(summary.id) && summary.origin !== 'subagent' && !currentDraft) continue;
    rows.push(summary);
  }
  rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || String(a.id).localeCompare(String(b.id)));
  return rows;
}

/**
 * Group sessions into parent-first families, then flatten with a depth.
 *
 * A session whose parent is not visible becomes a root row marked `orphan`, so
 * archived parents never hide their children. Cycles are tolerated: the first
 * visit wins and the remaining node is emitted as a root at the end.
 */
export function buildFamilies(candidates, byId = {}) {
  const visible = new Map(candidates.map((session) => [session.id, session]));
  const children = new Map();
  const roots = [];

  for (const session of candidates) {
    const parentId = session.parentId;
    if (parentId && parentId !== session.id && visible.has(parentId)) {
      const list = children.get(parentId) ?? [];
      list.push(session);
      children.set(parentId, list);
    } else {
      roots.push(session);
    }
  }

  const newestFirst = (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  for (const list of children.values()) list.sort(newestFirst);

  const memo = new Map();
  const maxUpdated = (session, stack = new Set()) => {
    if (memo.has(session.id)) return memo.get(session.id);
    if (stack.has(session.id)) return session.updatedAt ?? 0;
    stack.add(session.id);
    let max = session.updatedAt ?? 0;
    for (const child of children.get(session.id) ?? []) {
      max = Math.max(max, maxUpdated(child, stack));
    }
    stack.delete(session.id);
    memo.set(session.id, max);
    return max;
  };

  roots.sort((a, b) => maxUpdated(b) - maxUpdated(a) || newestFirst(a, b));

  const rows = [];
  const seen = new Set();
  const visit = (session, depth, orphan) => {
    if (seen.has(session.id)) return;
    seen.add(session.id);
    rows.push({ session, depth, orphan });
    for (const child of children.get(session.id) ?? []) visit(child, depth + 1, false);
  };

  for (const root of roots) {
    const parentId = root.parentId;
    const orphan = Boolean(parentId && parentId !== root.id && !visible.has(parentId));
    visit(root, 0, orphan);
  }
  // Only reachable through a parent cycle; emit the remainder as roots.
  const remaining = candidates.filter((session) => !seen.has(session.id)).sort(newestFirst);
  for (const session of remaining) {
    if (!seen.has(session.id)) visit(session, 0, false);
  }
  return rows;
}

/** Map every workspace member session id to its workspace. */
export function workspaceIndex(workspaces) {
  const index = new Map();
  for (const workspace of workspaces?.items ?? []) {
    for (const sessionId of workspace?.sessionIds ?? []) {
      if (!index.has(sessionId)) index.set(sessionId, workspace);
    }
  }
  return index;
}

function normalizedPath(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

/**
 * Fall back to the workspace whose path owns `cwd`. A freshly created blank
 * session is not part of `workspace.sessionIds` yet, but it already carries the
 * target workspace path, so path matching keeps it under that workspace.
 */
export function workspaceByPath(workspaces, cwd) {
  const target = normalizedPath(cwd);
  if (!target) return undefined;
  let best;
  let bestLength = -1;
  for (const workspace of workspaces?.items ?? []) {
    const path = normalizedPath(workspace?.path);
    if (!path) continue;
    if (target !== path && !target.startsWith(`${path}/`)) continue;
    if (path.length > bestLength) {
      best = workspace;
      bestLength = path.length;
    }
  }
  return best;
}

/**
 * Resolve a workspace for a row; subagent rows inherit the nearest ancestor's
 * workspace because Host workspace membership normally tracks roots only.
 */
export function resolveWorkspace(session, index, byId = {}) {
  const seen = new Set();
  let current = session;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const workspace = index.get(current.id);
    if (workspace) return workspace;
    const parentId = current.parentId;
    if (!parentId || parentId === current.id) return undefined;
    current = byId[parentId];
  }
  return undefined;
}

/** Families + workspace + resolved title, ready for the row component. */
export function buildRows(candidates, byId, workspaces) {
  const index = workspaceIndex(workspaces);
  return buildFamilies(candidates, byId).map((row) => ({
    ...row,
    title: sessionTitle(row.session),
    workspace: resolveWorkspace(row.session, index, byId) ?? workspaceByPath(workspaces, row.session.cwd),
  }));
}

/** Attach display status and count running descendants on each ancestor. */
export function annotateRows(rows, statuses) {
  const annotated = rows.map((row) => {
    const status = statuses?.get?.(row.session.id);
    return {
      ...row,
      status: resolveStatus(status, row.session),
      pendingKind: status?.pendingInteraction?.kind,
      runningChildren: 0,
    };
  });

  const byId = new Map(annotated.map((row) => [row.session.id, row]));
  for (const row of annotated) {
    if (row.status !== 'running') continue;
    const seen = new Set([row.session.id]);
    let parentId = row.session.parentId;
    while (parentId && byId.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = byId.get(parentId);
      parent.runningChildren += 1;
      parentId = parent.session.parentId;
    }
  }
  return annotated;
}

/** Search across title, workspace label/path, cwd and id. */
export function matchesQuery(row, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return true;
  const workspace = row.workspace;
  const haystack = [
    row.title,
    row.session?.displayTitle,
    row.session?.cwd,
    workspace?.title,
    workspace?.path,
    row.session?.id,
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join('\n')
    .toLowerCase();
  return needle.split(/\s+/).every((part) => haystack.includes(part));
}

/** Apply workspace, status and free-text filters without mutating input. */
export function filterRows(rows, { query = '', workspaceId = ALL, status = ALL } = {}) {
  return rows.filter((row) => {
    if (status !== ALL && row.status !== status) return false;
    if (workspaceId !== ALL && row.workspace?.workspaceId !== workspaceId) return false;
    return matchesQuery(row, query);
  });
}

/** Counts for the status chips; `all` is the total of the given rows. */
export function countByStatus(rows) {
  const counts = { all: rows.length, running: 0, pending: 0, done: 0, idle: 0 };
  for (const row of rows) {
    if (counts[row.status] !== undefined) counts[row.status] += 1;
  }
  return counts;
}

/** Deterministic relative-time descriptor; the component supplies the locale. */
export function formatRelativeTime(updatedAt, now = Date.now()) {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return { key: 'time.unknown' };
  const diff = Math.max(0, now - updatedAt);
  if (diff < 60_000) return { key: 'time.justNow' };
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return { key: 'time.minutesAgo', n: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: 'time.hoursAgo', n: hours };
  const days = Math.floor(hours / 24);
  if (days < 7) return { key: 'time.daysAgo', n: days };
  if (days < 30) return { key: 'time.weeksAgo', n: Math.floor(days / 7) };
  if (days < 365) return { key: 'time.monthsAgo', n: Math.floor(days / 30) };
  return { key: 'time.yearsAgo', n: Math.floor(days / 365) };
}

/** Human-facing session title with deterministic fallbacks. */
export function sessionTitle(summary) {
  if (summary?.blank) return '';
  const display = summary?.displayTitle?.trim();
  if (display) return display;
  const title = summary?.title?.trim();
  if (title) return title;
  return summary?.id ?? '';
}

/** Workspace title, falling back to the last path segment. */
export function workspaceLabel(workspace) {
  const title = workspace?.title?.trim();
  if (title) return title;
  return basename(workspace?.path);
}

/** Last path segment for either Windows or POSIX separators. */
export function basename(path) {
  if (typeof path !== 'string') return '';
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * Split rows into the pinned strip and one bucket per display status.
 *
 * Pinned rows stay in pinned order and are removed from the status buckets so a
 * session never appears twice. Subagent rows follow their parent inside the
 * same bucket (the input is already family-flattened).
 */
export function splitSections(rows, pinnedIds) {
  const pinnedOrder = new Map();
  for (const [index, id] of (pinnedIds ?? []).entries()) {
    if (!pinnedOrder.has(id)) pinnedOrder.set(id, index);
  }
  const pinned = rows
    .filter((row) => pinnedOrder.has(row.session.id))
    .sort((a, b) => pinnedOrder.get(a.session.id) - pinnedOrder.get(b.session.id));
  const pinnedSet = new Set(pinned.map((row) => row.session.id));
  const rest = rows.filter((row) => !pinnedSet.has(row.session.id));
  return {
    pinned,
    running: rest.filter((row) => row.status === 'running'),
    pending: rest.filter((row) => row.status === 'pending'),
    done: rest.filter((row) => row.status === 'done'),
    idle: rest.filter((row) => row.status === 'idle'),
  };
}

/** First `limit` rows, used by the compact sidebar board. */
export function topRows(rows, limit) {
  return rows.slice(0, Math.max(0, limit));
}

/** Turn host trash records into renderable rows, preferring live summaries. */
export function trashRows(items, byId = {}) {
  const latest = new Map();
  for (const item of items ?? []) {
    if (!item || typeof item.sessionId !== 'string') continue;
    const previous = latest.get(item.sessionId);
    if (previous && (previous.deletedAt ?? 0) >= (item.deletedAt ?? 0)) continue;
    latest.set(item.sessionId, item);
  }
  return [...latest.values()]
    .map((item) => {
      const summary = byId[item.sessionId] ?? {
        id: item.sessionId,
        title: item.title,
        displayTitle: item.title,
        cwd: item.cwd,
        updatedAt: item.deletedAt,
      };
      return {
        session: summary,
        title: sessionTitle(summary),
        depth: 0,
        orphan: false,
        status: 'idle',
        deletedAt: item.deletedAt ?? 0,
        trashed: true,
      };
    })
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

/** Archived session ids that still exist in the snapshot, newest first. */
export function archivedRows(sessions, archivedIds) {
  const byId = sessions?.byId ?? {};
  const rows = [];
  for (const id of archivedIds ?? []) {
    const summary = byId[id];
    if (!summary) continue;
    rows.push({
      session: summary,
      title: sessionTitle(summary),
      depth: 0,
      orphan: false,
      status: 'idle',
      archived: true,
    });
  }
  return rows.sort((a, b) => (b.session.updatedAt ?? 0) - (a.session.updatedAt ?? 0));
}

/** Top-level rows only: active children are represented by their parent. */
export function topLevelRows(rows) {
  return rows.filter((row) => (row.depth ?? 0) === 0);
}

/**
 * Sessions worth surfacing in the sticky "active" group: top-level rows that
 * are running, waiting for the user, or have a running descendant.
 */
export function activeRows(rows) {
  return topLevelRows(rows).filter(
    (row) => row.status === 'running'
      || row.status === 'pending'
      || (row.runningChildren ?? 0) > 0
      || (row.session.blank === true && (row.session.retainedBy?.mainView ?? 0) > 0),
  );
}

/** Keep at most `limit` rows; 0 means unlimited. */
export function limitRows(rows, limit) {
  if (!Number.isFinite(limit) || limit <= 0) return rows;
  return rows.slice(0, limit);
}

function normalizePath(value) {
  return String(value ?? '')
    .replace(/[\\/]+/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function isUnder(parentPath, childPath) {
  if (!parentPath || !childPath || parentPath === childPath) return false;
  return childPath.startsWith(`${parentPath}/`);
}

/**
 * Order workspaces as a tree: every parent immediately precedes its children.
 * Parents are the longest existing workspace path that prefixes the child.
 */
export function workspaceTree(workspaces) {
  const items = workspaces?.items ?? [];
  const entries = items.map((workspace, index) => ({
    workspace,
    index,
    path: normalizePath(workspace?.path),
  }));
  const parents = new Map();
  const children = new Map();
  for (const entry of entries) {
    let parent = null;
    for (const candidate of entries) {
      if (candidate === entry) continue;
      if (!isUnder(candidate.path, entry.path)) continue;
      if (!parent || candidate.path.length > parent.path.length) parent = candidate;
    }
    parents.set(entry.workspace.workspaceId, parent);
    if (parent) {
      const list = children.get(parent.workspace.workspaceId) ?? [];
      list.push(entry);
      children.set(parent.workspace.workspaceId, list);
    }
  }
  const ordered = [];
  const visit = (entry, depth) => {
    ordered.push({ workspace: entry.workspace, depth });
    for (const child of children.get(entry.workspace.workspaceId) ?? []) visit(child, depth + 1);
  };
  for (const entry of entries) {
    if (!parents.get(entry.workspace.workspaceId)) visit(entry, 0);
  }
  for (const entry of entries) {
    if (!ordered.some((item) => item.workspace === entry.workspace)) visit(entry, 0);
  }
  return ordered;
}

/**
 * Group rows by workspace while preserving family order. Pinned rows are
 * removed by the caller. Workspaces without rows are returned too so the pane
 * can still offer "new session".
 */
export function groupByWorkspace(rows, workspaces, nest = true) {
  const byId = new Map();
  for (const row of rows) {
    const key = row.workspace?.workspaceId ?? '__none';
    const list = byId.get(key) ?? [];
    list.push(row);
    byId.set(key, list);
  }
  const tree = nest ? workspaceTree(workspaces) : (workspaces?.items ?? []).map((workspace) => ({ workspace, depth: 0 }));
  const groups = tree.map(({ workspace, depth }) => ({
    workspace,
    depth,
    rows: byId.get(workspace.workspaceId) ?? [],
  }));
  const ungrouped = byId.get('__none') ?? [];
  if (ungrouped.length > 0) groups.push({ workspace: null, depth: 0, rows: ungrouped });
  const known = new Set(groups.map((group) => group.workspace?.workspaceId ?? '__none'));
  for (const [key, list] of byId) {
    if (known.has(key)) continue;
    groups.push({ workspace: null, depth: 0, rows: list });
  }
  return groups;
}

/** Apply a saved id order to rows; unknown ids keep their relative position. */
export function applyManualOrder(rows, order) {
  if (!Array.isArray(order) || order.length === 0) return rows;
  const index = new Map(order.map((id, position) => [id, position]));
  return [...rows].sort((a, b) => {
    const ai = index.get(a.session.id);
    const bi = index.get(b.session.id);
    if (ai === undefined && bi === undefined) return 0;
    if (ai === undefined) return 1;
    if (bi === undefined) return -1;
    return ai - bi;
  });
}

/** Move one id before another inside a saved order, returning a new array. */
export function moveId(order, dragId, targetId) {
  const base = Array.isArray(order) ? order.filter((id) => id !== dragId) : [];
  const target = base.indexOf(targetId);
  const next = target < 0 ? [...base, dragId] : [...base.slice(0, target), dragId, ...base.slice(target)];
  return next;
}

/**
 * How many top-level rows of a workspace stay visible before "Show more".
 *
 * Mirrors the native watermark: start from the configured count, then raise it
 * far enough to include the last running, waiting, unread-complete or
 * running-child row within the first 50. A limit of 0 means "show everything".
 */
export function watermarkLimit(rows, base, ceiling = 50) {
  if (!(base > 0)) return 0;
  const top = Array.isArray(rows) ? rows : [];
  const end = Math.min(top.length, ceiling);
  let qualifying = -1;
  for (let index = 0; index < end; index += 1) {
    const row = top[index];
    if (!row) continue;
    if (
      row.status === 'running' ||
      row.status === 'pending' ||
      row.status === 'done' ||
      (row.runningChildren ?? 0) > 0
    ) {
      qualifying = index;
    }
  }
  return Math.min(Math.max(base, qualifying + 1), ceiling);
}
