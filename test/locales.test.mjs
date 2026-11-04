import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { en, zh } from '../src/client/locales.js';

const root = resolve(import.meta.dirname, '..');

/** Literal locale keys referenced by the view and by the pure status helpers. */
function referencedKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/\bt\('([^']+)'/g)) keys.add(match[1]);
  for (const match of source.matchAll(/'(status\.[a-zA-Z]+|pending\.[a-zA-Z]+|time\.[a-zA-Z]+)'/g)) {
    keys.add(match[1]);
  }
  // Slot registrations are matched by the `t(...)` scan and are not messages.
  for (const slot of ['main', 'sidebar.panellist']) keys.delete(slot);
  return keys;
}

test('every referenced locale key exists in both dictionaries', async () => {
  const sources = await Promise.all(
    ['src/client/session-view.jsx', 'src/client/index.jsx', 'src/client/logic.js'].map((file) =>
      readFile(resolve(root, file), 'utf8'),
    ),
  );
  const keys = referencedKeys(sources.join('\n'));
  assert.ok(keys.size > 20);
  for (const key of keys) {
    assert.ok(key in zh, `zh is missing ${key}`);
    assert.ok(key in en, `en is missing ${key}`);
  }
});

test('dictionaries expose the same keys', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
});
