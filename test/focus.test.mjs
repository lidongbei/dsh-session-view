import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import {
  filterRowsByFocus,
  focusGroupById,
  focusIncludesPath,
  focusIncludesWorkspace,
  focusWorkspaceIds,
  restrictWorkspaces,
} from '../src/client/logic.js';
import { getPrefs, resetPrefs, setPrefs } from '../src/client/prefs.js';

const root = resolve(import.meta.dirname, '..');

function row(id, workspaceId) {
  return {
    session: { id, displayTitle: id },
    depth: 0,
    status: 'idle',
    runningChildren: 0,
    workspace: workspaceId ? { workspaceId } : null,
  };
}

const group = { id: 'g1', name: '前端', workspaceIds: ['w1', 'w2'] };
const focused = { focusGroups: [group], focusGroupId: 'g1' };
const idle = { focusGroups: [group], focusGroupId: '' };

test('preferences sanitize focus groups and the active selection', () => {
  resetPrefs();
  assert.deepEqual(getPrefs().focusGroups, []);
  assert.equal(getPrefs().focusGroupId, '');

  setPrefs({
    focusGroups: [
      { id: ' a ', name: '  A  ', workspaceIds: ['w1', 'w1', 'w2', 7, ''] },
      { id: 'a', name: 'dup', workspaceIds: ['w9'] },
      { id: '', name: 'blank', workspaceIds: ['w1'] },
      { id: 'b', workspaceIds: 'nope' },
      { id: 'c', name: 'x'.repeat(80), workspaceIds: ['w3'] },
      null,
      'text',
    ],
  });
  const groups = getPrefs().focusGroups;
  assert.equal(groups.length, 3);
  assert.deepEqual(groups[0], { id: 'a', name: 'A', workspaceIds: ['w1', 'w2'] });
  assert.deepEqual(groups[1], { id: 'b', name: '', workspaceIds: [] });
  assert.equal(groups[2].name.length, 60);

  setPrefs({ focusGroupId: 'a' });
  assert.equal(getPrefs().focusGroupId, 'a');
  setPrefs({ focusGroupId: 'gone' });
  assert.equal(getPrefs().focusGroupId, '');
  setPrefs({ focusGroupId: 'b' });
  assert.equal(getPrefs().focusGroupId, 'b');
  resetPrefs();
  assert.equal(getPrefs().focusGroupId, '');
});

test('focus helpers filter rows and workspaces by the active group', () => {
  assert.equal(focusGroupById(focused)?.id, 'g1');
  assert.equal(focusGroupById(idle), undefined);
  assert.equal(focusGroupById(focused, 'g1')?.name, '前端');

  assert.equal(focusWorkspaceIds(idle), null);
  assert.deepEqual([...focusWorkspaceIds(focused)].sort(), ['w1', 'w2']);

  assert.equal(focusIncludesWorkspace(idle, 'w3'), true);
  assert.equal(focusIncludesWorkspace(focused, 'w1'), true);
  assert.equal(focusIncludesWorkspace(focused, 'w3'), false);
  assert.equal(focusIncludesWorkspace(focused, undefined), false);

  const rows = [row('a', 'w1'), row('b', 'w3'), row('c', null), row('d', 'w2')];
  assert.equal(filterRowsByFocus(rows, idle).length, 4);
  assert.deepEqual(filterRowsByFocus(rows, focused).map((item) => item.session.id), ['a', 'd']);

  const workspaces = {
    items: [
      { workspaceId: 'w1', path: 'C:/work/app' },
      { workspaceId: 'w2', path: 'C:/work/lib' },
      { workspaceId: 'w3', path: 'C:/work/other' },
    ],
  };
  assert.equal(restrictWorkspaces(workspaces, idle), workspaces);
  assert.deepEqual(restrictWorkspaces(workspaces, focused).items.map((item) => item.workspaceId), ['w1', 'w2']);

  assert.equal(focusIncludesPath(idle, workspaces, 'C:/work/other/deep'), true);
  assert.equal(focusIncludesPath(focused, workspaces, 'C:/work/app/deep'), true);
  assert.equal(focusIncludesPath(focused, workspaces, 'C:/work/other/deep'), false);
  assert.equal(focusIncludesPath(focused, workspaces, 'D:/elsewhere'), false);
});

const fixture = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SidebarWorkspacePane } from ${JSON.stringify(resolve(root, 'src/client/sidebar-workspace.jsx'))};
import { FocusBar, createGroupId, groupLabel, groupName, memberSummary, updateGroup } from ${JSON.stringify(resolve(root, 'src/client/focus-mode.jsx'))};
import { zh } from ${JSON.stringify(resolve(root, 'src/client/locales.js'))};
import { resetPrefs, setPrefs } from ${JSON.stringify(resolve(root, 'src/client/prefs.js'))};

const t = (key, params) => {
  const template = zh[key] ?? key;
  if (!params) return template;
  return template.split('{n}').join(String(params.n)).split('{name}').join(String(params.name));
};

const sessions = {
  ids: ['app1', 'app2', 'lib1'],
  byId: {
    app1: { id: 'app1', title: 'app1', displayTitle: 'App task one', running: true, blank: false, updatedAt: 300, cwd: 'C:/work/app' },
    app2: { id: 'app2', title: 'app2', displayTitle: 'App task two', running: false, blank: false, updatedAt: 200, cwd: 'C:/work/app' },
    lib1: { id: 'lib1', title: 'lib1', displayTitle: 'Lib task', running: false, blank: false, updatedAt: 100, cwd: 'C:/work/lib' },
  },
  phase: 'ready',
  projectionsBySession: {},
};
const statuses = new Map([
  ['app1', { running: true, completionUnread: false }],
  ['app2', { running: false, completionUnread: false }],
  ['lib1', { running: false, completionUnread: false }],
]);
const workspaces = {
  items: [
    { workspaceId: 'w1', title: 'App', path: 'C:/work/app', sessionIds: ['app1', 'app2'] },
    { workspaceId: 'w2', title: 'Lib', path: 'C:/work/lib', sessionIds: ['lib1'] },
    { workspaceId: 'w3', title: 'Other', path: 'C:/work/other', sessionIds: [] },
  ],
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

globalThis.__FOCUS_HELPERS = {
  id: createGroupId(),
  fallbackName: groupName(t, { id: 'x', name: '' }, 0),
  keptName: groupName(t, { id: 'x', name: '团队' }, 3),
  updated: updateGroup([{ id: 'a', name: 'A', workspaceIds: ['w1'] }], 'a', { name: '新名', workspaceIds: ['w1', 'w2'] }),
  missing: updateGroup([{ id: 'a' }], 'nope', { name: 'x' }),
  label: groupLabel(t, { focusGroups: [{ id: 'g1', name: '前端' }] }, { id: 'g1', name: '前端' }),
  summary: memberSummary({ workspaceIds: ['w1', 'w2', 'w3', 'gone'] }, workspaces, 2),
  summaryEmpty: memberSummary({ workspaceIds: [] }, workspaces),
};
setPrefs({ focusGroups: [], focusGroupId: '' });
globalThis.__FOCUS_OFF_HTML = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));

setPrefs({ focusGroups: [{ id: 'g1', name: '前端', workspaceIds: ['w1'] }], focusGroupId: 'g1' });
globalThis.__FOCUS_ON_HTML = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
globalThis.__FOCUS_BAR_HTML = renderToStaticMarkup(React.createElement(FocusBar, {
  t,
  prefs: {
    focusGroups: [{ id: 'g1', name: '前端', workspaceIds: ['w1'] }],
    focusGroupId: 'g1',
  },
  onManage: () => {},
  onExit: () => {},
}));

setPrefs({ focusGroups: [{ id: 'g2', name: '', workspaceIds: ['w3'] }], focusGroupId: 'g2' });
globalThis.__FOCUS_EMPTY_HTML = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
resetPrefs();
`;

test('focus mode filters the sidebar by the selected workspaces', async () => {
  const dir = await mkdtemp(join(root, 'test', '.focus-'));
  const outfile = join(dir, 'fixture.mjs');
  try {
    await build({
      stdin: { contents: fixture, resolveDir: root, sourcefile: 'focus.fixture.jsx', loader: 'jsx' },
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
    const off = globalThis.__FOCUS_OFF_HTML;
    const on = globalThis.__FOCUS_ON_HTML;
    const bar = globalThis.__FOCUS_BAR_HTML;
    const empty = globalThis.__FOCUS_EMPTY_HTML;
    const helpers = globalThis.__FOCUS_HELPERS;
    delete globalThis.__FOCUS_OFF_HTML;
    delete globalThis.__FOCUS_ON_HTML;
    delete globalThis.__FOCUS_BAR_HTML;
    delete globalThis.__FOCUS_EMPTY_HTML;
    delete globalThis.__FOCUS_HELPERS;

    assert.match(helpers.id, /^focus-[a-z0-9]+-[a-z0-9]+$/);
    assert.equal(helpers.fallbackName, '专注组 1');
    assert.equal(helpers.keptName, '团队');
    assert.deepEqual(helpers.updated, [{ id: 'a', name: '新名', workspaceIds: ['w1', 'w2'] }]);
    assert.deepEqual(helpers.missing, [{ id: 'a' }]);
    assert.equal(helpers.label, '前端');
    assert.deepEqual(helpers.summary, { shown: ['App', 'Lib'], extra: 1, stale: 1, known: 3 });
    assert.deepEqual(helpers.summaryEmpty, { shown: [], extra: 0, stale: 0, known: 0 });

    assert.ok(off.includes('App task one') && off.includes('Lib task'), 'focus off must list every workspace');
    assert.ok(!off.includes('<div class="dsv-focusBar">'), 'focus bar must stay hidden when no group is active');
    assert.match(off, /aria-pressed="false"/);

    assert.ok(on.includes('App task one') && on.includes('App task two'), 'focused workspace rows must render');
    assert.ok(!on.includes('Lib task'), 'sessions outside the focus group must be hidden');
    assert.ok(!on.includes('Other'), 'workspaces outside the focus group must be hidden');
    assert.ok(on.includes('<div class="dsv-focusBar">'), 'focus bar must render while a group is active');
    assert.ok(on.includes('前端'), 'focus bar must show the group name');
    assert.match(on, /aria-pressed="true"/);
    assert.ok(on.includes('退出专注'), 'focus bar must expose the exit action');

    assert.ok(bar.includes('前端') && bar.includes('class="dsv-focusBarCount"'), 'focus bar shows name and member count');
    assert.ok(bar.includes('1'), 'member count must match the group size');
    assert.ok(bar.includes('切换'), 'focus bar must expose the switch action');
    assert.ok(bar.includes('class="dsv-focusBarName"'), 'focus bar name must open the manager');

    assert.ok(empty.includes('专注'), 'an empty focused group must explain the empty state');
    assert.ok(!empty.includes('App task one'), 'empty focused group must not list unrelated sessions');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
