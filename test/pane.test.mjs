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
import { SidebarWorkspacePane } from ${JSON.stringify(resolve(root, 'src/client/sidebar-workspace.jsx'))};
import { zh } from ${JSON.stringify(resolve(root, 'src/client/locales.js'))};
import { resetPrefs, setPrefs } from ${JSON.stringify(resolve(root, 'src/client/prefs.js'))};

const t = (key, params) => {
  const template = zh[key] ?? key;
  return params ? template.replace(/\\\\{(\\\\w+)\\\\}/g, (match, name) => (name in params ? String(params[name]) : match)) : template;
};

const ids = ['run1', 'run2', 'run3', 'wait', 'done', 'idle', 'pinned'];
const byId = Object.fromEntries(ids.map((id, index) => [id, {
  id,
  title: id,
  displayTitle: id === 'pinned' ? 'Pinned task' : 'Task ' + id,
  running: id.startsWith('run'),
  blank: false,
  updatedAt: 1000 - index,
}]));
byId.sub = { id: 'sub', title: 'sub', displayTitle: 'Sub task', parentId: 'run1', origin: 'subagent', running: false, blank: false, updatedAt: 2000 };
const sessionIds = [...ids, 'sub'];
const sessions = { ids: sessionIds, byId, phase: 'ready', projectionsBySession: {} };
const statuses = new Map([
  ['run1', { running: true, completionUnread: false }],
  ['run2', { running: true, completionUnread: false }],
  ['run3', { running: true, completionUnread: false }],
  ['wait', { running: false, completionUnread: false, pendingInteraction: { kind: 'question' } }],
  ['done', { running: false, completionUnread: true }],
  ['idle', { running: false, completionUnread: false }],
  ['pinned', { running: false, completionUnread: false }],
]);
const workspaces = {
  items: [
    { workspaceId: 'w1', title: 'App', path: 'C:/work/app', sessionIds: sessionIds },
    { workspaceId: 'w2', title: 'Empty workspace', path: 'C:/work/empty', sessionIds: [] },
  ],
  archivedSessionIds: [],
  pinnedSessionIds: ['pinned'],
  state: 'idle',
  phase: 'ready',
};

setPrefs({ activeLimit: 2 });
const props = {
  t,
  useSessions: (selector) => selector(sessions),
  useSessionStatus: (selector) => selector(statuses),
  useWorkspaces: (selector) => selector(workspaces),
  openSession: () => {},
  pinSession: () => {},
  unpinSession: () => {},
  archiveSession: () => {},
  unarchiveSession: () => {},
  startSession: () => {},
  forkSession: () => {},
  renameSession: () => {},
  renameWorkspace: () => {},
  deleteWorkspace: () => {},
  createWorkspace: () => {},
  pickDirectory: () => {},
  searchSessions: () => {},
  openPanel: () => {},
};
globalThis.__DSV_PANE_HTML = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
const idleStatuses = new Map(ids.map((id) => [id, { running: false, completionUnread: false }]));
setPrefs({ showIdle: false });
setPrefs({ glowRunning: 'marquee', glowPending: 'aurora' });
globalThis.__DSV_PANE_HTML_GLOW = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
resetPrefs();
globalThis.__DSV_PANE_HTML_EMPTY = renderToStaticMarkup(
  React.createElement(SidebarWorkspacePane, { ...props, useSessionStatus: () => idleStatuses }),
);
resetPrefs();
setPrefs({ showRecent: false, showPinned: false, showActive: false });
globalThis.__DSV_PANE_HTML_HIDDEN = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
setPrefs({ showRecent: true, showPinned: true, showActive: true, collapsedGroups: ['__active', '__recent', '__pinned', '__workspaces'] });
globalThis.__DSV_PANE_HTML_COLLAPSED = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
setPrefs({ compact: true, showTimes: true, collapsedGroups: [] });
globalThis.__DSV_PANE_HTML_COMPACT = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
setPrefs({ compact: false, sort: 'manual', collapsedGroups: [] });
globalThis.__DSV_PANE_HTML_MANUAL = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
resetPrefs();
`;

test('SidebarWorkspacePane renders pinned and a limited active group', async () => {
  const dir = await mkdtemp(join(root, 'test', '.pane-'));
  const outfile = join(dir, 'fixture.mjs');
  try {
    await build({
      stdin: { contents: fixture, resolveDir: root, sourcefile: 'pane.fixture.jsx', loader: 'jsx' },
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
    const html = globalThis.__DSV_PANE_HTML;
    delete globalThis.__DSV_PANE_HTML;
    assert.equal(typeof html, 'string');

    assert.ok(html.includes('活跃会话'), 'missing active group heading');
    const empty = globalThis.__DSV_PANE_HTML_EMPTY;
    assert.ok(empty.includes('aria-label="活跃会话"'), 'empty active group heading must stay visible');
    assert.ok(empty.includes('aria-label="最近会话"'), 'empty recent group heading must stay visible');
    assert.ok(!html.includes('class="dsv-sideGlow'), 'glow must default to off');
    const glow = globalThis.__DSV_PANE_HTML_GLOW;
    assert.ok(glow.includes('dsv-sideGlow--marquee'), 'marquee glow missing');
    assert.ok(glow.includes('dsv-sideGlow--aurora'), 'aurora glow missing');
    assert.ok(glow.includes('data-status="running"') && glow.includes('data-status="pending"'), 'glow must mark running and pending rows');
    assert.ok(html.includes('置顶'), 'missing pinned heading');
    assert.ok(html.includes('Pinned task'), 'missing pinned row');
    const active = html.match(/<section class="dsv-sideGroup" aria-label="活跃会话">([\s\S]*?)<\/section>/)?.[1] ?? '';
    assert.ok(active.includes('Task run1') && active.includes('Task run2'), 'missing first two active rows');
    assert.ok(!active.includes('Task run3'), 'active limit was not applied');
    assert.ok(active.includes('更多'), 'missing show-more control');
    assert.match(active, /data-status="running"/);
    const activeHead = active.match(/<div class="dsv-sideGroupHead dsv-sideSectionHead">([\s\S]*?)<\/div>/)?.[1] ?? '';
    assert.ok(activeHead.includes('width="12"'), 'active section icon must be 12px');
    assert.ok(!activeHead.includes('dsv-dot'), 'active section must use an icon, not a status dot');
    assert.match(html, /data-status="pending"/);
    assert.match(html, /data-status="done"/);
    assert.ok(!html.includes('Sub task'), 'subagent row must not be rendered');
    assert.ok(html.includes('Empty workspace'), 'empty workspace must stay visible');
    assert.ok(!html.includes('暂无会话'), 'empty-workspace hint must not be rendered');
    assert.ok(html.includes('最近会话'), 'missing recent group');
    const recent = html.match(/<section class="dsv-sideGroup" aria-label="最近会话">([\s\S]*?)<\/section>/)?.[1] ?? '';
    assert.ok(recent.includes('Task run1'), 'recent group must include active sessions too');
    const app = html.match(/<section class="dsv-sideGroup" aria-label="App">([\s\S]*?)<\/section>/)?.[1] ?? '';
    assert.ok(app.includes('Task run1'), 'active session must also appear under its workspace');
    assert.ok(app.includes('Task run3'), 'workspace must keep all sessions even when active is limited');
    assert.match(app, /class="dsv-sideActiveMark" role="img" title="有活跃会话"/, 'workspace active marker missing');
    assert.ok(html.includes('aria-label="会话管理"'), 'missing manage-sessions button');
    assert.ok(!html.includes('data-dsv-settings-toggle'), 'sidebar settings trigger must be gone');
    assert.ok(!html.includes('dsv-sideFolder'), 'workspace folder icon must be gone');
    assert.ok(html.includes('dsv-sideChevron'), 'workspace disclosure chevron missing');
    assert.ok(html.includes('工作区会话'), 'missing workspace section heading');
    assert.ok(!html.includes('更多操作'), 'workspace ellipsis menu should be gone');
    assert.ok(!html.includes('dsv-sidePin'), 'row pin indicator must be gone');
    assert.ok(html.includes('dsv-sideActiveMark'), 'workspace active marker missing');
    assert.ok(html.includes('title="有活跃会话"'), 'workspace active marker label missing');
    assert.match(html, /@keyframes dsv-dotPulse/);
    assert.match(html, /aria-label="活跃会话"[\s\S]*?aria-expanded="true"/, 'active section must start expanded');

    const hidden = globalThis.__DSV_PANE_HTML_HIDDEN;
    delete globalThis.__DSV_PANE_HTML_HIDDEN;
    assert.ok(!hidden.includes('<section class="dsv-sideGroup" aria-label="活跃会话"'), 'active group toggle did not hide the section');
    assert.ok(!hidden.includes('<section class="dsv-sideGroup" aria-label="置顶"'), 'pinned group toggle did not hide the section');
    assert.ok(!hidden.includes('<section class="dsv-sideGroup" aria-label="最近会话"'), 'recent group toggle did not hide the section');
    assert.ok(hidden.includes('aria-label="App"'), 'workspaces must remain when shortcut groups are hidden');

    const collapsed = globalThis.__DSV_PANE_HTML_COLLAPSED;
    delete globalThis.__DSV_PANE_HTML_COLLAPSED;
    assert.ok(collapsed.includes('工作区会话'), 'workspace heading must remain while collapsed');
    assert.match(collapsed, /aria-label="活跃会话"[\s\S]*?aria-expanded="false"/, 'active section must be collapsible');
    const activeCollapsed = collapsed.match(/<section class="dsv-sideGroup" aria-label="活跃会话">([\s\S]*?)<\/section>/)?.[1] ?? '';
    assert.ok(!activeCollapsed.includes('dsv-sideRow'), 'collapsed active section must not render rows');
    assert.match(collapsed, /aria-label="置顶"[\s\S]*?aria-expanded="false"/, 'pinned section must be collapsible');
    const pinnedCollapsed = collapsed.match(/<section class="dsv-sideGroup" aria-label="置顶">([\s\S]*?)<\/section>/)?.[1] ?? '';
    assert.ok(!pinnedCollapsed.includes('dsv-sideRow'), 'collapsed pinned section must not render rows');
    assert.ok(!collapsed.includes('aria-label="App"'), 'collapsed workspace section must not render groups');

    const compact = globalThis.__DSV_PANE_HTML_COMPACT;
    delete globalThis.__DSV_PANE_HTML_COMPACT;
    assert.match(compact, /data-compact="true"/, 'compact mode must be applied');
    assert.ok(compact.includes('dsv-sideTime'), 'compact rows must keep the session time');
    assert.ok(!compact.includes('.dsv-side[data-compact="true"] .dsv-sideTime { display: none; }'), 'compact mode must not hide the session time');

    const manual = globalThis.__DSV_PANE_HTML_MANUAL;
    delete globalThis.__DSV_PANE_HTML_MANUAL;
    assert.match(manual, /class="dsv-sideRow"[^>]*draggable="true"/, 'manual sort rows must be draggable');
    assert.match(manual, /class="dsv-sideGroupHead"[^>]*draggable="true"/, 'manual sort workspace heads must be draggable');
    assert.match(manual, /body\.dsv-dragging/, 'drag selection lock CSS missing');
    assert.match(manual, /\.dsv-dragSource/, 'drag source style missing');
    assert.match(manual, /\.dsv-sideRow\.dsv-dropBefore::before/, 'row drop indicator missing');
    assert.match(manual, /\.dsv-sideGroupHead\.dsv-dropTarget/, 'workspace drop indicator missing');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
