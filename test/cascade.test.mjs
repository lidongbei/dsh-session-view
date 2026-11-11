import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCascadeTree } from '../src/client/group-tree.js';

const groups = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B', parentId: 'a' },
  { id: 'c', name: 'C', parentId: 'b' },
  { id: 'd', name: 'D' },
];

test('cascade tree groups children by parent and keeps roots', () => {
  const tree = buildCascadeTree(groups);
  assert.deepEqual(tree.get(null).map((g) => g.id), ['a', 'd']);
  assert.deepEqual(tree.get('a').map((g) => g.id), ['b']);
  assert.deepEqual(tree.get('b').map((g) => g.id), ['c']);
});

test('excluded groups are removed and their children surface at the root', () => {
  const tree = buildCascadeTree(groups, ['a', 'c']);
  assert.deepEqual(tree.get(null).map((g) => g.id), ['b', 'd']);
  assert.equal(tree.has('a'), false);
});

test('orphaned children fall back to the root level', () => {
  const tree = buildCascadeTree([{ id: 'x', name: 'X', parentId: 'missing' }]);
  assert.deepEqual(tree.get(null).map((g) => g.id), ['x']);
});
