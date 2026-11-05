import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addTrashIds,
  getTrashIds,
  removeTrashIds,
  setTrashItems,
  subscribeTrash,
} from '../src/client/trash-store.js';

test('trash store publishes membership changes to subscribers', () => {
  let calls = 0;
  const unsubscribe = subscribeTrash(() => { calls += 1; });
  try {
    setTrashItems([{ sessionId: 'a' }, { sessionId: 'b' }]);
    assert.deepEqual([...getTrashIds()].sort(), ['a', 'b']);
    assert.equal(calls, 1);

    addTrashIds(['b', 'c']);
    assert.deepEqual([...getTrashIds()].sort(), ['a', 'b', 'c']);
    assert.equal(calls, 2);

    addTrashIds(['c']);
    assert.equal(calls, 2);

    removeTrashIds(['a', 'missing']);
    assert.deepEqual([...getTrashIds()].sort(), ['b', 'c']);
    assert.equal(calls, 3);
  } finally {
    unsubscribe();
    setTrashItems([]);
  }
  assert.deepEqual([...getTrashIds()], []);
  assert.equal(calls, 3);
});
