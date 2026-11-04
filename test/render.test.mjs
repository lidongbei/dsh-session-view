import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');

const fixture = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SessionView } from ${JSON.stringify(resolve(root, 'src/client/session-view.jsx'))};
import { zh } from ${JSON.stringify(resolve(root, 'src/client/locales.js'))};

const t = (key, params) => {
  const template = zh[key] ?? key;
  return params ? template.replace(/\\{(\\w+)\\}/g, (match, name) => (name in params ? String(params[name]) : match)) : template;
};

const sessions = {
  ids: ['parent', 'child', 'done', 'idle'],
  byId: {
    parent: { id: 'parent', title: 'parent', displayTitle: 'Parent task', running: true, blank: false, updatedAt: 100 },
    child: { id: 'child', title: 'child', displayTitle: 'Child task', parentId: 'parent', origin: 'subagent', running: false, blank: false, updatedAt: 400 },
    done: { id: 'done', title: 'done', displayTitle: 'Finished task', running: false, blank: false, updatedAt: 300 },
    idle: { id: 'idle', title: 'idle', displayTitle: 'Waiting task', running: false, blank: false, updatedAt: 200 },
  },
  phase: 'ready',
  projectionsBySession: {},
};
const statuses = new Map([
  ['parent', { running: true, completionUnread: false }],
  ['child', { running: false, completionUnread: false, pendingInteraction: { key: 'k', kind: 'approval', sessionId: 'child' } }],
  ['done', { running: false, completionUnread: true }],
  ['idle', { running: false, completionUnread: false }],
]);
const workspaces = {
  items: [{ workspaceId: 'w1', title: 'App', path: 'C:\\\\work\\\\app', sessionIds: ['parent', 'done', 'idle'] }],
  archivedSessionIds: [],
  pinnedSessionIds: [],
  state: 'idle',
  phase: 'ready',
};

const props = {
  t,
  useSessions: (selector) => selector(sessions),
  useSessionStatus: (selector) => selector(statuses),
  useWorkspaces: (selector) => selector(workspaces),
  openSession: () => {},
};

globalThis.__DSV_HTML = renderToStaticMarkup(React.createElement(SessionView, props));
`;

test('SessionView renders status colors and hides subagent rows', async () => {
  const dir = await mkdtemp(join(root, 'test', '.render-'));
  const outfile = join(dir, 'fixture.mjs');
  try {
    await build({
      stdin: { contents: fixture, resolveDir: root, sourcefile: 'session-view.fixture.jsx', loader: 'jsx' },
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      jsx: 'automatic',
      external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server'],
      legalComments: 'none',
      logLevel: 'silent',
    });

    await import(pathToFileURL(outfile).href);
    const html = globalThis.__DSV_HTML;
    delete globalThis.__DSV_HTML;
    assert.equal(typeof html, 'string');

    for (const text of ['会话视图', 'Parent task', 'Finished task', 'Waiting task']) {
      assert.ok(html.includes(text), `missing ${text}`);
    }
    assert.ok(!html.includes('Child task'), 'subagent row must not be rendered');
    assert.ok(html.includes('运行中'));
    assert.ok(html.includes('待处理'));
    assert.ok(html.includes('已完成'));
    assert.ok(html.includes('空闲'));
    assert.ok(!html.includes('子会话'), 'subagent tag must not be rendered');
    assert.ok(html.includes('3 个会话'));

    assert.match(html, /data-status="running"/);
    assert.match(html, /data-status="pending"/);
    assert.match(html, /data-status="done"/);
    assert.ok(!html.includes('data-depth="1"'), 'subagent depth must not be rendered');
    assert.match(html, /role="list"/);
    assert.match(html, /aria-pressed="true"/);
    assert.ok(html.includes('aria-label="状态筛选"'), 'missing translated status-group label');
    assert.ok(html.includes('aria-label="工作区"'), 'missing translated workspace label');
    assert.ok(html.indexOf('Parent task') >= 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
