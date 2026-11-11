import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GROUP_ROOT_ORDER,
  buildGroupTree,
  createWorkspaceGroupId,
  descendantIds,
  groupOrderKey,
  moveGroupInTree,
  moveWorkspaceToGroup,
  orderedChildren,
} from '../src/client/group-tree.js';

const groups = () => [
  { id: 'a', name: 'A', parentId: null },
  { id: 'b', name: 'B', parentId: 'a' },
  { id: 'c', name: 'C', parentId: null },
];

test('groupOrderKey uses the root key or a parent-scoped key', () => {
  assert.equal(groupOrderKey(null), GROUP_ROOT_ORDER);
  assert.equal(groupOrderKey('a'), '__groups:a');
});

test('descendantIds collects the whole subtree', () => {
  assert.deepEqual([...descendantIds(groups(), 'a')].sort(), ['a', 'b']);
});

test('moveGroupInTree nests on inside and reorders on before/after', () => {
  const inside = moveGroupInTree(groups(), { [GROUP_ROOT_ORDER]: ['a', 'c'] }, 'c', 'a', 'inside');
  assert.equal(inside.groups.find((g) => g.id === 'c').parentId, 'a');
  assert.deepEqual(inside.orders['__groups:a'], ['b', 'c']);

  const before = moveGroupInTree(groups(), { [GROUP_ROOT_ORDER]: ['a', 'c'] }, 'c', 'a', 'before');
  assert.equal(before.groups.find((g) => g.id === 'c').parentId, null);
  assert.deepEqual(before.orders[GROUP_ROOT_ORDER], ['c', 'a']);

  const after = moveGroupInTree(groups(), { [GROUP_ROOT_ORDER]: ['a', 'c'] }, 'a', 'c', 'after');
  assert.deepEqual(after.orders[GROUP_ROOT_ORDER], ['c', 'a']);
});

test('moveGroupInTree rejects self and descendant targets', () => {
  assert.equal(moveGroupInTree(groups(), {}, 'a', 'a', 'inside'), null);
  assert.equal(moveGroupInTree(groups(), {}, 'a', 'b', 'inside'), null);
  assert.equal(moveGroupInTree(groups(), {}, 'a', 'missing', 'before'), null);
});

test('orderedChildren follows saved order and appends unknown groups', () => {
  const list = orderedChildren(groups(), { [GROUP_ROOT_ORDER]: ['c'] }, null);
  assert.deepEqual(list.map((g) => g.id), ['c', 'a']);
});

test('moveWorkspaceToGroup assigns, reorders and unassigns', () => {
  const first = moveWorkspaceToGroup({ w1: 'a' }, { a: ['w1'] }, 'w2', 'a', 'w1', false);
  assert.equal(first.assignments.w2, 'a');
  assert.deepEqual(first.orders.a, ['w2', 'w1']);

  const second = moveWorkspaceToGroup(first.assignments, first.orders, 'w1', null);
  assert.equal(second.assignments.w1, undefined);
  assert.deepEqual(second.orders.__root, ['w1']);
  assert.deepEqual(second.orders.a, ['w2']);
});

test('buildGroupTree keeps parents first, nests workspaces and lists ungrouped', () => {
  const workspaces = { items: [{ workspaceId: 'w1', path: 'C:/w1' }, { workspaceId: 'w2', path: 'C:/w2' }] };
  const tree = buildGroupTree(groups(), {}, { w1: 'b' }, workspaces);
  assert.equal(tree.nodes.length, 2);
  assert.equal(tree.nodes[0].group.id, 'a');
  assert.equal(tree.nodes[0].depth, 0);
  assert.equal(tree.nodes[0].children[0].group.id, 'b');
  assert.deepEqual(tree.nodes[0].children[0].workspaces.map((w) => w.workspaceId), ['w1']);
  assert.deepEqual(tree.ungrouped.map((w) => w.workspaceId), ['w2']);
  assert.equal(tree.nodes[1].empty, true);
});

test('createWorkspaceGroupId is unique and prefixed', () => {
  const a = createWorkspaceGroupId();
  const b = createWorkspaceGroupId();
  assert.match(a, /^wsg-/);
  assert.notEqual(a, b);
});
