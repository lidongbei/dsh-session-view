import test from 'node:test';
import assert from 'node:assert/strict';
import {
  annotateRows,
  basename,
  buildCandidates,
  buildFamilies,
  buildRows,
  countByStatus,
  filterRows,
  formatRelativeTime,
  matchesQuery,
  pendingLabelKey,
  resolveStatus,
  sessionTitle,
  statusLabelKey,
  workspaceLabel,
} from '../src/client/logic.js';

function summary(id, patch = {}) {
  return {
    id,
    title: id,
    displayTitle: id,
    running: false,
    blank: false,
    updatedAt: 0,
    ...patch,
  };
}

function listOf(rows, ids = rows.map((row) => row.id)) {
  return {
    ids,
    byId: Object.fromEntries(rows.map((row) => [row.id, row])),
    phase: 'ready',
    projectionsBySession: {},
  };
}

test('resolveStatus prefers pending, then running, then done', () => {
  assert.equal(resolveStatus({ pendingInteraction: { kind: 'question' }, running: true }, { running: true }), 'pending');
  assert.equal(resolveStatus({ running: true }, { running: false }), 'running');
  assert.equal(resolveStatus({ running: undefined }, { running: true }), 'running');
  assert.equal(resolveStatus({ completionUnread: true, running: false }, { running: false }), 'done');
  assert.equal(resolveStatus(undefined, undefined), 'idle');
});

test('pending labels cover known kinds and fall back to generic', () => {
  assert.equal(pendingLabelKey('approval'), 'pending.approval');
  assert.equal(pendingLabelKey('plan-review'), 'pending.planReview');
  assert.equal(pendingLabelKey('question'), 'pending.question');
  assert.equal(pendingLabelKey('something-else'), 'pending.generic');
  assert.equal(statusLabelKey('running'), 'status.running');
  assert.equal(statusLabelKey('unknown'), 'status.idle');
});

test('buildCandidates filters blank, archived and unlisted ordinary rows but keeps subagents', () => {
  const sessions = listOf(
    [
      summary('a', { updatedAt: 10 }),
      summary('blank', { blank: true, updatedAt: 99 }),
      summary('archived', { updatedAt: 80 }),
      summary('sub', { origin: 'subagent', parentId: 'a', updatedAt: 50 }),
      summary('stray', { updatedAt: 70 }),
    ],
    ['a', 'blank', 'archived'],
  );

  const rows = buildCandidates(sessions, ['archived']);
  assert.deepEqual(rows.map((row) => row.id), ['sub', 'a']);
});

test('buildFamilies keeps parents before children and orders roots by family recency', () => {
  const rows = [
    summary('parent', { updatedAt: 100 }),
    summary('old-child', { parentId: 'parent', updatedAt: 50 }),
    summary('new-child', { parentId: 'parent', updatedAt: 300 }),
    summary('root', { updatedAt: 200 }),
  ];
  const families = buildFamilies(rows, Object.fromEntries(rows.map((row) => [row.id, row])));

  assert.deepEqual(
    families.map((row) => [row.session.id, row.depth, row.orphan]),
    [
      ['parent', 0, false],
      ['new-child', 1, false],
      ['old-child', 1, false],
      ['root', 0, false],
    ],
  );
});

test('buildFamilies marks children of an invisible parent as orphan roots', () => {
  const child = summary('child', { parentId: 'archived-parent', updatedAt: 10 });
  const rows = buildFamilies([child], { child, 'archived-parent': summary('archived-parent') });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].depth, 0);
  assert.equal(rows[0].orphan, true);
});

test('buildFamilies survives a parent cycle', () => {
  const a = summary('a', { parentId: 'b', updatedAt: 1 });
  const b = summary('b', { parentId: 'a', updatedAt: 2 });
  const rows = buildFamilies([a, b], { a, b });
  assert.deepEqual(rows.map((row) => row.session.id), ['b', 'a']);
});

test('buildRows inherits the workspace of the nearest visible ancestor', () => {
  const parent = summary('parent', { updatedAt: 10 });
  const child = summary('child', { parentId: 'parent', updatedAt: 20 });
  const workspaces = {
    items: [{ workspaceId: 'w1', title: 'Work', path: '/tmp/work', sessionIds: ['parent'] }],
    archivedSessionIds: [],
    pinnedSessionIds: [],
    state: 'idle',
    phase: 'ready',
  };
  const rows = buildRows([parent, child], { parent, child }, workspaces);
  assert.equal(rows.find((row) => row.session.id === 'child').workspace.workspaceId, 'w1');
});

test('annotateRows resolves statuses and counts running descendants', () => {
  const parent = summary('parent');
  const child = summary('child', { parentId: 'parent' });
  const grandchild = summary('grandchild', { parentId: 'child' });
  const rows = buildRows([parent, child, grandchild], { parent, child, grandchild }, { items: [] });
  const statuses = new Map([
    ['parent', { running: false, completionUnread: false }],
    ['child', { running: true }],
    ['grandchild', { running: true }],
  ]);
  const annotated = annotateRows(rows, statuses);
  const byId = Object.fromEntries(annotated.map((row) => [row.session.id, row]));

  assert.equal(byId.child.status, 'running');
  assert.equal(byId.child.runningChildren, 1);
  assert.equal(byId.parent.runningChildren, 2);
  assert.equal(byId.parent.status, 'idle');
});

test('filterRows combines workspace, status and free-text filters', () => {
  const rows = [
    { title: 'Fix login', status: 'running', session: { id: 's1', cwd: 'C:\\work\\app' }, workspace: { workspaceId: 'w1', title: 'App', path: 'C:\\work\\app' } },
    { title: 'Write docs', status: 'done', session: { id: 's2', cwd: 'C:\\work\\docs' }, workspace: { workspaceId: 'w2', title: 'Docs', path: 'C:\\work\\docs' } },
  ];

  assert.equal(filterRows(rows, { status: 'running' }).length, 1);
  assert.equal(filterRows(rows, { workspaceId: 'w2' }).length, 1);
  assert.equal(filterRows(rows, { query: 'login' }).length, 1);
  assert.equal(filterRows(rows, { query: 'work docs' }).length, 1);
  assert.equal(matchesQuery(rows[0], 's1'), true);
  assert.equal(filterRows(rows, {}).length, 2);
});

test('countByStatus counts every display status', () => {
  const counts = countByStatus([{ status: 'running' }, { status: 'running' }, { status: 'pending' }, { status: 'done' }, { status: 'idle' }]);
  assert.deepEqual(counts, { all: 5, running: 2, pending: 1, done: 1, idle: 1 });
});

test('formatRelativeTime covers each threshold', () => {
  const now = Date.parse('2026-11-04T12:00:00Z');
  assert.deepEqual(formatRelativeTime(now - 10_000, now), { key: 'time.justNow' });
  assert.deepEqual(formatRelativeTime(now - 5 * 60_000, now), { key: 'time.minutesAgo', n: 5 });
  assert.deepEqual(formatRelativeTime(now - 3 * 3_600_000, now), { key: 'time.hoursAgo', n: 3 });
  assert.deepEqual(formatRelativeTime(now - 2 * 86_400_000, now), { key: 'time.daysAgo', n: 2 });
  assert.deepEqual(formatRelativeTime(now - 10 * 86_400_000, now), { key: 'time.weeksAgo', n: 1 });
  assert.deepEqual(formatRelativeTime(now - 60 * 86_400_000, now), { key: 'time.monthsAgo', n: 2 });
  assert.deepEqual(formatRelativeTime(now - 800 * 86_400_000, now), { key: 'time.yearsAgo', n: 2 });
  assert.deepEqual(formatRelativeTime(0, now), { key: 'time.unknown' });
});

test('titles and workspace labels degrade deterministically', () => {
  assert.equal(sessionTitle({ id: 'x', displayTitle: 'Shown', title: 'Durable' }), 'Shown');
  assert.equal(sessionTitle({ id: 'x', displayTitle: '  ', title: 'Durable' }), 'Durable');
  assert.equal(sessionTitle({ id: 'x' }), 'x');
  assert.equal(workspaceLabel({ title: 'Named', path: '/tmp/ignored' }), 'Named');
  assert.equal(workspaceLabel({ path: 'C:\\work\\repo' }), 'repo');
  assert.equal(workspaceLabel({}), '');
  assert.equal(basename('/a/b/c/'), 'c');
  assert.equal(basename(''), '');
});
