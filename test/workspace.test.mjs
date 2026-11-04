import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeRows,
  applyManualOrder,
  groupByWorkspace,
  limitRows,
  moveId,
  orderKey,
  watermarkLimit,
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
  assert.equal(getPrefs().activeLimit, 5);
  assert.deepEqual({ ...DEFAULT_PREFS.manualOrder }, {});

  setPrefs({ activeLimit: 99, workspaceLimit: -2, mode: 'weird', layout: 'flat', showIdle: false });
  assert.equal(getPrefs().activeLimit, 5);
  assert.equal(getPrefs().workspaceLimit, 5);
  assert.equal(getPrefs().mode, 'session');
  assert.equal(getPrefs().layout, 'flat');
  assert.equal(getPrefs().showIdle, false);

  setPrefs({ manualOrder: { __flat: ['a', 3, 'b'] } });
  assert.deepEqual(getPrefs().manualOrder.__flat, ['a', 'b']);

  assert.equal(getPrefs().showSubagents, false);
  assert.equal(getPrefs().showEmptyWorkspaces, false);
  assert.equal(getPrefs().showTimes, true);
  setPrefs({
    showSubagents: true,
    showEmptyWorkspaces: true,
    showTimes: false,
    compact: true,
    collapsedGroups: ['w1', 3, 'w2'],
  });
  assert.equal(getPrefs().showSubagents, true);
  assert.equal(getPrefs().showEmptyWorkspaces, true);
  assert.equal(getPrefs().showTimes, false);
  assert.equal(getPrefs().compact, true);
  assert.deepEqual(getPrefs().collapsedGroups, ['w1', 'w2']);

  resetPrefs();
  assert.equal(getPrefs().mode, 'session');
  assert.equal(getPrefs().activeLimit, 5);
});

test('activeRows keeps top-level running, pending and parent-of-running rows', () => {
  const rows = [
    row('idle'),
    row('running', { status: 'running' }),
    row('pending', { status: 'pending' }),
    row('parent', { status: 'idle', runningChildren: 1 }),
    row('child', { depth: 1, status: 'running' }),
  ];
  assert.deepEqual(
    activeRows(rows).map((item) => item.session.id),
    ['running', 'pending', 'parent'],
  );
});

test('limitRows treats zero and non-finite as unlimited', () => {
  const rows = [row('a'), row('b'), row('c')];
  assert.equal(limitRows(rows, 0), rows);
  assert.equal(limitRows(rows, Number.NaN), rows);
  assert.deepEqual(limitRows(rows, 2).map((item) => item.session.id), ['a', 'b']);
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

test('orderKey separates flat and ungrouped rows', () => {
  assert.equal(orderKey(row('a'), 'flat'), '__flat');
  assert.equal(orderKey(row('a'), 'grouped'), '__none');
  assert.equal(orderKey(row('a', { workspace: { workspaceId: 'w' } }), 'grouped'), 'w');
});

test('manual ordering moves pinned rows and keeps unknown rows last', () => {
  const rows = [row('a'), row('b'), row('c')];
  assert.deepEqual(
    applyManualOrder(rows, ['c', 'a']).map((item) => item.session.id),
    ['c', 'a', 'b'],
  );
  assert.deepEqual(moveId(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
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
