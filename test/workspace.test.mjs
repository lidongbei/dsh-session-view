import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeRows,
  applyManualOrder,
  buildCandidates,
  filterHiddenRows,
  filterHiddenWorkspaces,
  groupByWorkspace,
  limitRows,
  moveId,
  sessionTitle,
  watermarkLimit,
  workspaceByPath,
  workspaceTree,
} from '../src/client/logic.js';
import { DEFAULT_PREFS, getPrefs, resetPrefs, setPrefs } from '../src/client/prefs.js';

function row(id, patch = {}) {
  return {
    session: { id, displayTitle: id },
    depth: 0,
    status: 'idle',
    runningChildren: 0,
    workspace: null,
    ...patch,
  };
}

function workspace(workspaceId, path, patch = {}) {
  return { workspaceId, path, title: workspaceId, sessionIds: [], ...patch };
}

test('preferences default to session mode and clamp invalid input', () => {
  resetPrefs();
  assert.equal(getPrefs().mode, 'session');
  assert.equal(getPrefs().glowRunning, 'off');
  assert.equal(getPrefs().glowPending, 'off');
  assert.equal(getPrefs().glowDone, 'off');
  assert.equal(getPrefs().activeLimit, 5);
  assert.deepEqual({ ...DEFAULT_PREFS.manualOrder }, {});

  setPrefs({ activeLimit: 99, workspaceLimit: -2, mode: 'weird', showIdle: false });
  assert.equal(getPrefs().activeLimit, 5);
  assert.equal(getPrefs().workspaceLimit, 5);
  assert.equal(getPrefs().mode, 'session');
  assert.equal(getPrefs().showWorkspaces, true);
  assert.equal(getPrefs().showIdle, false);

  setPrefs({ manualOrder: { __flat: ['a', 3, 'b'] } });
  assert.deepEqual(getPrefs().manualOrder.__flat, ['a', 'b']);

  assert.equal(getPrefs().showSubagents, false);
  assert.equal(getPrefs().showRecent, true);
  assert.equal(getPrefs().showPinned, true);
  assert.equal(getPrefs().showActive, true);
  assert.equal(getPrefs().glowRunning, 'off');
  assert.equal(getPrefs().glowPending, 'off');
  assert.equal(getPrefs().glowDone, 'off');
  assert.equal(getPrefs().recentLimit, 5);
  assert.equal(getPrefs().showTimes, true);
  setPrefs({
    showSubagents: true,
    showRecent: false,
    showPinned: false,
    showActive: false,
    showWorkspaces: false,
    recentLimit: 99,
    showTimes: false,
    compact: true,
    collapsedGroups: ['w1', 3, 'w2'],
  });
  assert.equal(getPrefs().showSubagents, true);
  assert.equal(getPrefs().showRecent, false);
  assert.equal(getPrefs().showPinned, false);
  assert.equal(getPrefs().showActive, false);
  assert.equal(getPrefs().showWorkspaces, false);
  assert.equal(getPrefs().recentLimit, 5);
  assert.equal(getPrefs().showTimes, false);
  assert.equal(getPrefs().compact, true);
  setPrefs({ glowRunning: 'marquee', glowPending: 'aurora', glowDone: 'scan' });
  assert.equal(getPrefs().glowRunning, 'marquee');
  assert.equal(getPrefs().glowPending, 'aurora');
  assert.equal(getPrefs().glowDone, 'scan');
  setPrefs({ glowRunning: 'bogus', glowPending: 'nope', glowDone: 'nope' });
  assert.equal(getPrefs().glowRunning, 'off');
  assert.equal(getPrefs().glowPending, 'off');
  assert.equal(getPrefs().glowDone, 'off');
  assert.equal(getPrefs().glowDone, 'off');
  assert.deepEqual(getPrefs().collapsedGroups, ['w1', 'w2']);

  resetPrefs();
  assert.equal(getPrefs().mode, 'session');
  assert.equal(getPrefs().activeLimit, 5);
});

test('activeRows keeps running, pending, done-unread and parent-of-running rows', () => {
  const rows = [
    row('idle'),
    row('running', { status: 'running' }),
    row('pending', { status: 'pending' }),
    row('done', { status: 'done' }),
    row('parent', { status: 'idle', runningChildren: 1 }),
    row('child', { depth: 1, status: 'running' }),
  ];
  assert.deepEqual(
    activeRows(rows).map((item) => item.session.id),
    ['running', 'pending', 'done', 'parent'],
  );
});

test('a new blank draft is visible only while retained by the main view', () => {
  const draft = { id: 'draft', blank: true, retainedBy: { mainView: 1 } };
  const stale = { id: 'stale', blank: true, retainedBy: { mainView: 0 } };
  const listed = { id: 'listed', blank: false };
  const hidden = { id: 'hidden', blank: false };
  const sessions = {
    ids: ['draft', 'stale', 'listed'],
    byId: { draft, stale, listed, hidden },
  };
  assert.deepEqual(
    buildCandidates(sessions, []).map((session) => session.id).sort(),
    ['draft', 'listed'],
  );
  assert.equal(sessionTitle(draft), '');

  const rows = [
    row('draft', { session: draft }),
    row('stale', { session: stale }),
    row('listed', { session: listed }),
  ];
  assert.deepEqual(activeRows(rows).map((item) => item.session.id), ['draft']);
});

test('limitRows treats zero and non-finite as unlimited', () => {
  const rows = [row('a'), row('b'), row('c')];
  assert.equal(limitRows(rows, 0), rows);
  assert.equal(limitRows(rows, Number.NaN), rows);
  assert.deepEqual(limitRows(rows, 2).map((item) => item.session.id), ['a', 'b']);
});


test('workspaceByPath matches the longest normalized cwd prefix', () => {
  const workspaces = {
    items: [
      workspace('r', 'C:/work'),
      workspace('s', 'C:/work/sub'),
    ],
  };
  assert.equal(workspaceByPath(workspaces, 'c:/WORK/sub/project')?.workspaceId, 's');
  assert.equal(workspaceByPath(workspaces, 'C:/work')?.workspaceId, 'r');
  assert.equal(workspaceByPath(workspaces, 'D:/nope'), undefined);
  assert.equal(workspaceByPath(workspaces, ''), undefined);
});

test('workspaceTree nests by longest path prefix and keeps parents first', () => {
  const workspaces = {
    items: [
      workspace('s', 'C:\\work\\sub'),
      workspace('o', 'D:\\other'),
      workspace('r', 'C:\\work'),
      workspace('deep', 'C:\\work\\sub\\deep'),
    ],
  };
  assert.deepEqual(
    workspaceTree(workspaces).map(({ workspace: item, depth }) => [item.workspaceId, depth]),
    [
      ['o', 0],
      ['r', 0],
      ['s', 1],
      ['deep', 2],
    ],
  );
});

test('groupByWorkspace keeps empty workspaces and the ungrouped bucket', () => {
  const workspaces = {
    items: [workspace('r', 'C:\\work'), workspace('s', 'C:\\work\\sub'), workspace('empty', 'D:\\empty')],
  };
  const rows = [
    row('a', { workspace: workspaces.items[0] }),
    row('b', { workspace: workspaces.items[1] }),
    row('c'),
  ];
  const groups = groupByWorkspace(rows, workspaces);
  assert.deepEqual(
    groups.map((group) => [group.workspace?.workspaceId ?? null, group.depth, group.rows.map((item) => item.session.id)]),
    [
      ['r', 0, ['a']],
      ['s', 1, ['b']],
      ['empty', 0, []],
      [null, 0, ['c']],
    ],
  );
});

test('manual ordering moves pinned rows and keeps unknown rows last', () => {
  const rows = [row('a'), row('b'), row('c')];
  assert.deepEqual(
    applyManualOrder(rows, ['c', 'a']).map((item) => item.session.id),
    ['c', 'a', 'b'],
  );
  assert.deepEqual(moveId(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 'a', 'b', true), ['b', 'a', 'c']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 'a', 'c', true), ['b', 'c', 'a']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 'a', 'missing'), ['b', 'c', 'a']);
});


test('watermarkLimit raises the fold to the last active or unread row', () => {
  const rows = [
    row('a'), row('b'), row('c'), row('d'), row('e'), row('f'),
  ];
  assert.equal(watermarkLimit(rows, 3), 3);
  rows[6] = row('g', { status: 'running' });
  assert.equal(watermarkLimit(rows, 3), 7);
  rows[1] = row('b', { status: 'done' });
  assert.equal(watermarkLimit(rows, 3), 7);
  assert.equal(watermarkLimit(rows, 0), 0);
  const long = Array.from({ length: 60 }, (_, index) => row(`x${index}`, index === 25 ? { status: 'pending' } : {}));
  assert.equal(watermarkLimit(long, 5), 26);
});

test('hidden workspace ids only remove the selected workspaces', () => {
  const workspaces = {
    items: [workspace('a', 'C:\\work'), workspace('b', 'C:\\work\\b'), workspace('c', 'D:\\fresh')],
  };
  assert.equal(filterHiddenWorkspaces(workspaces, undefined), workspaces);
  assert.equal(filterHiddenWorkspaces(workspaces, []), workspaces);
  assert.deepEqual(
    filterHiddenWorkspaces(workspaces, ['b']).items.map((item) => item.workspaceId),
    ['a', 'c'],
  );
  // A workspace that is not in the hidden list is visible, so newly created
  // workspaces show up without any extra state.
  assert.deepEqual(
    filterHiddenWorkspaces(workspaces, ['a', 'missing']).items.map((item) => item.workspaceId),
    ['b', 'c'],
  );
});

test('rows from hidden workspaces are dropped instead of falling into the ungrouped bucket', () => {
  const rows = [
    row('one', { workspace: { workspaceId: 'a' } }),
    row('two', { workspace: { workspaceId: 'b' } }),
    row('three', { workspace: null }),
  ];
  assert.equal(filterHiddenRows(rows, undefined), rows);
  assert.equal(filterHiddenRows(rows, []), rows);
  assert.deepEqual(
    filterHiddenRows(rows, ['a']).map((item) => item.session.id),
    ['two', 'three'],
  );
  assert.deepEqual(
    filterHiddenRows(rows, ['a', 'b', 'missing']).map((item) => item.session.id),
    ['three'],
  );
});
