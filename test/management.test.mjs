import test from 'node:test';
import assert from 'node:assert/strict';
import {
  archivedRows,
  isStaleSessionError,
  splitSections,
  topRows,
  trashRows,
} from '../src/client/logic.js';
import { deriveSessionDir, encodeSegmentFor, projectKeyFor } from '../lib/index.js';

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

function row(id, status, patch = {}) {
  return { session: summary(id), title: id, status, depth: 0, ...patch };
}

test('splitSections keeps pinned order and removes pinned rows from status buckets', () => {
  const rows = [
    row('a', 'running'),
    row('b', 'pending'),
    row('c', 'done'),
    row('d', 'idle'),
    row('e', 'running'),
  ];
  const sections = splitSections(rows, ['e', 'a']);
  assert.deepEqual(sections.pinned.map((item) => item.session.id), ['e', 'a']);
  assert.deepEqual(sections.running.map((item) => item.session.id), []);
  assert.deepEqual(sections.pending.map((item) => item.session.id), ['b']);
  assert.deepEqual(sections.done.map((item) => item.session.id), ['c']);
  assert.deepEqual(sections.idle.map((item) => item.session.id), ['d']);
});

test('splitSections preserves family order inside each bucket', () => {
  const rows = [
    row('p', 'running'),
    row('child-a', 'running', { depth: 1 }),
    row('child-b', 'idle', { depth: 1 }),
  ];
  const sections = splitSections(rows, []);
  assert.deepEqual(sections.running.map((item) => item.session.id), ['p', 'child-a']);
  assert.deepEqual(sections.idle.map((item) => item.session.id), ['child-b']);
  assert.deepEqual(topRows(sections.running, 3).map((item) => item.session.id), ['p', 'child-a']);
});

test('trashRows prefers the live summary and orders by deletion time', () => {
  const byId = { a: summary('a', { displayTitle: 'Live A', cwd: 'D:/x' }) };
  const rows = trashRows(
    [
      { sessionId: 'a', title: 'Stored A', deletedAt: 10 },
      { sessionId: 'b', title: 'Stored B', deletedAt: 30 },
      { sessionId: 'a', title: 'duplicate', deletedAt: 50 },
    ],
    byId,
  );
  assert.deepEqual(rows.map((item) => item.session.id), ['a', 'b']);
  assert.equal(rows[0].title, 'Live A');
  assert.equal(rows[0].session.cwd, 'D:/x');
  assert.equal(rows[1].title, 'Stored B');
  assert.equal(rows[0].trashed, true);
});

test('archivedRows keeps existing sessions, sorts by recency and resolves workspaces', () => {
  const sessions = {
    byId: {
      a: summary('a', { updatedAt: 10, cwd: 'D:/work/alpha' }),
      b: summary('b', { updatedAt: 40, cwd: 'D:/work/beta' }),
    },
  };
  const workspaces = {
    items: [
      { workspaceId: 'w1', path: 'D:/work/alpha', title: 'Alpha', sessionIds: [] },
      { workspaceId: 'w2', path: 'D:/work/beta', title: 'Beta', sessionIds: [] },
    ],
  };
  const rows = archivedRows(sessions, ['a', 'missing', 'b'], workspaces);
  assert.deepEqual(rows.map((item) => item.session.id), ['b', 'a']);
  assert.equal(rows[0].archived, true);
  assert.equal(rows[0].workspace?.workspaceId, 'w2');
  assert.equal(rows[1].workspace?.workspaceId, 'w1');
});

test('isStaleSessionError recognizes vanished or already-transitioned sessions', () => {
  assert.equal(isStaleSessionError(new Error('session not found')), true);
  assert.equal(isStaleSessionError(new Error('Session is already archived')), true);
  assert.equal(isStaleSessionError('该会话不存在'), true);
  assert.equal(isStaleSessionError(new Error('network timeout')), false);
});

test('projectKeyFor mirrors the JSONL backend directory naming', () => {
  assert.equal(projectKeyFor('D:\\AI\\proj'), '--D-AI-proj--');
  assert.equal(projectKeyFor('/home/u/proj'), '--home-u-proj--');
  assert.equal(projectKeyFor('C:/space dir'), '--C-space~0020dir--');
  assert.equal(projectKeyFor('D:/../../etc'), '--D-..-..-etc--');
});

test('encodeSegmentFor escapes traversal and reserved names', () => {
  assert.equal(encodeSegmentFor('..'), '~002E~002E');
  assert.equal(encodeSegmentFor('.'), '~002E');
  assert.equal(encodeSegmentFor('a\\b/c'), 'a~005Cb~002Fc');
});

test('deriveSessionDir uses _no-cwd and keeps the id as the final segment', () => {
  const root = 'C:\\Users\\Administrator\\.dsh\\sessions';
  assert.equal(
    deriveSessionDir(root, 'D:\\AI\\proj', 'session-1'),
    `${root}\\--D-AI-proj--\\session-1`,
  );
  assert.equal(deriveSessionDir(root, '', 'session-2'), `${root}\\_no-cwd\\session-2`);
  const escaped = deriveSessionDir(root, 'D:\\AI\\proj', '..\\..\\evil');
  assert.equal(escaped.split('\\').at(-1), '..~005C..~005Cevil');
});
