import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import {
  filterRowsByFocus,
  focusGroupById,
  focusIncludesPath,
  focusIncludesWorkspace,
  focusWorkspaceIds,
  filterRowsByWorkspaceIds,
  removeFocusGroup,
  renameFocusGroup,
  restrictWorkspacesToIds,
  restrictWorkspaces,
  toggleFocusGroupMember,
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
  setPrefs({ focusExpanded: ['a', 'a', 'gone', 7] });
  assert.deepEqual(getPrefs().focusExpanded, ['a']);
  resetPrefs();
  assert.equal(getPrefs().focusGroupId, '');
  assert.deepEqual(getPrefs().focusExpanded, []);
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

test('focus member helpers scope rows and workspaces to an explicit id set', () => {
  const rows = [row('a', 'w1'), row('b', 'w3'), row('c', null)];
  assert.deepEqual(filterRowsByWorkspaceIds(rows, new Set(['w1'])).map((item) => item.session.id), ['a']);
  assert.deepEqual(filterRowsByWorkspaceIds(rows, new Set(['w1', 'w3'])).map((item) => item.session.id), ['a', 'b']);
  assert.deepEqual(filterRowsByWorkspaceIds(rows, new Set()), []);
  assert.deepEqual(filterRowsByWorkspaceIds(rows, null), []);

  const workspaces = {
    items: [
      { workspaceId: 'w1', path: 'C:/work/app' },
      { workspaceId: 'w3', path: 'C:/work/other' },
    ],
    state: 'ready',
  };
  const one = restrictWorkspacesToIds(workspaces, new Set(['w1']));
  assert.deepEqual(one.items.map((item) => item.workspaceId), ['w1']);
  assert.equal(one.state, 'ready');
  assert.notEqual(one, workspaces);
  assert.deepEqual(restrictWorkspacesToIds(workspaces, new Set()).items, []);
});

test('focus group helpers rename, delete and toggle members in place', () => {
  const prefs = {
    focusGroups: [
      { id: 'g1', name: '前端', workspaceIds: ['w1', 'w2'] },
      { id: 'g2', name: '', workspaceIds: ['w3'] },
    ],
    focusGroupId: 'g1',
    focusExpanded: ['g1', 'g2'],
  };

  const renamed = renameFocusGroup(prefs, 'g1', '  新名字  ');
  assert.deepEqual(renamed.focusGroups[0], { id: 'g1', name: '新名字', workspaceIds: ['w1', 'w2'] });
  assert.deepEqual(renamed.focusGroups[1], prefs.focusGroups[1]);
  assert.deepEqual(renameFocusGroup(prefs, 'gone', 'x'), {});
  assert.equal(renameFocusGroup(prefs, 'g1', 'x'.repeat(80)).focusGroups[0].name.length, 60);

  const removed = removeFocusGroup(prefs, 'g1');
  assert.deepEqual(removed.focusGroups.map((entry) => entry.id), ['g2']);
  assert.deepEqual(removed.focusExpanded, ['g2']);
  assert.equal(removed.focusGroupId, '');
  assert.deepEqual(removeFocusGroup(prefs, 'gone'), {});
  assert.equal('focusGroupId' in removeFocusGroup({ ...prefs, focusGroupId: 'g2' }, 'g1'), false);

  assert.deepEqual(toggleFocusGroupMember(prefs, 'g2', 'w3').focusGroups[1].workspaceIds, []);
  assert.deepEqual(toggleFocusGroupMember(prefs, 'g2', 'w4').focusGroups[1].workspaceIds, ['w3', 'w4']);
  assert.deepEqual(toggleFocusGroupMember(prefs, 'gone', 'w1'), {});
});

const fixture = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SidebarWorkspacePane } from ${JSON.stringify(resolve(root, 'src/client/sidebar-workspace.jsx'))};
import { FocusBar, FocusMemberEditor, createGroupId, groupLabel, groupName, memberSummary, updateGroup } from ${JSON.stringify(resolve(root, 'src/client/focus-mode.jsx'))};
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
globalThis.__FOCUS_MEMBERS_HTML = renderToStaticMarkup(React.createElement(FocusMemberEditor, {
  t,
  group: { id: 'g1', name: '前端', workspaceIds: ['w1'] },
  workspaces,
  onToggle: () => {},
  onSelectAll: () => {},
  onClearAll: () => {},
}));

setPrefs({ focusGroups: [{ id: 'g2', name: '', workspaceIds: ['w3'] }], focusGroupId: 'g2' });
globalThis.__FOCUS_EMPTY_HTML = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));

setPrefs({
  focusGroups: [{ id: 'g1', name: '前端', workspaceIds: ['w1'] }],
  focusGroupId: '',
  focusExpanded: ['g1'],
});
globalThis.__FOCUS_EXPANDED_HTML = renderToStaticMarkup(React.createElement(SidebarWorkspacePane, props));
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
    const expanded = globalThis.__FOCUS_EXPANDED_HTML;
    const members = globalThis.__FOCUS_MEMBERS_HTML;
    const helpers = globalThis.__FOCUS_HELPERS;
    delete globalThis.__FOCUS_OFF_HTML;
    delete globalThis.__FOCUS_ON_HTML;
    delete globalThis.__FOCUS_BAR_HTML;
    delete globalThis.__FOCUS_EMPTY_HTML;
    delete globalThis.__FOCUS_EXPANDED_HTML;
    delete globalThis.__FOCUS_MEMBERS_HTML;
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
    assert.ok(!off.includes('class="dsv-focusBody"'), 'collapsed focus rows must not render a body');

    assert.ok(on.includes('App task one') && on.includes('App task two'), 'focused workspace rows must render');
    assert.ok(!on.includes('Lib task'), 'sessions outside the focus group must be hidden');
    assert.ok(!on.includes('Other'), 'workspaces outside the focus group must be hidden');
    assert.ok(on.includes('<div class="dsv-focusBar">'), 'focus bar must render while a group is active');
    assert.ok(on.includes('前端'), 'focus bar must show the group name');
    assert.match(on, /aria-expanded="false"/, 'focus rows start collapsed');
    assert.ok(!on.includes('class="dsv-focusBody"'), 'entering a group must not expand it on its own');
    assert.ok(on.includes('退出专注'), 'focus bar must expose the exit action');

    assert.ok(bar.includes('前端') && bar.includes('class="dsv-focusBarCount"'), 'focus bar shows name and member count');
    assert.ok(bar.includes('1'), 'member count must match the group size');
    assert.ok(bar.includes('切换'), 'focus bar must expose the switch action');
    assert.ok(bar.includes('class="dsv-focusBarName"'), 'focus bar name must open the manager');

    assert.ok(empty.includes('专注'), 'an empty focused group must explain the empty state');
    assert.ok(!empty.includes('App task one'), 'empty focused group must not list unrelated sessions');

    assert.ok(off.includes('class="dsv-sideGroup dsv-sideFocus"'), 'focus section must sit in the sidebar list');
    assert.ok(off.includes('还没有专注组') && off.includes('新建专注组'), 'empty focus section must offer creation');
    assert.ok(on.includes('<div class="dsv-focusRow" data-active="true">'), 'active focus row must be marked');
    assert.match(on, /class="dsv-focusRowName">前端</, 'focus section must list the group name');
    assert.ok(!on.includes('dsv-focusRowEdit'), 'focus rows must not render a per-row manage button');
    assert.match(on, /class="dsv-focusChevron" data-collapsed="true"/, 'focus rows must expose an expand chevron');

    const bodyStart = expanded.indexOf('class="dsv-focusBody"');
    assert.ok(bodyStart > -1, 'expanded focus rows must render a body');
    const body = expanded.slice(bodyStart, expanded.indexOf('</section>', bodyStart));
    assert.match(expanded, /data-open="true"/, 'expanded focus rows must be marked open');
    assert.ok(body.includes('dsv-sideGroupHead'), 'the body must render workspace headers in the workspace style');
    assert.ok(body.includes('App task one') && body.includes('App task two'), 'the body must list member sessions');
    assert.ok(!body.includes('Lib task'), 'the body must not list sessions of non-member workspaces');
    assert.ok(!expanded.includes('dsv-focusRowEdit'), 'expanded rows must still avoid a per-row manage button');

    assert.ok(members.includes('class="dsv-focusMembers"'), 'member editor must render for the members dialog');
    assert.equal((members.match(/type="checkbox"/g) ?? []).length, 3, 'member editor must offer one checkbox per workspace');
    assert.match(members, /已选 1 个工作区/, 'member editor must show the selected count');
    assert.ok(members.includes('全选') && members.includes('清空'), 'member editor must offer bulk selection');
    assert.ok(members.includes('App') && members.includes('Lib') && members.includes('Other'), 'member editor must list every workspace');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('focus context menu stays wired into the sidebar menu portal', async () => {
  const source = await readFile(resolve(root, 'src/client/sidebar-workspace.jsx'), 'utf8');
  assert.match(source, /const contextItems = contextRow/, 'context menu items must be resolved once');
  assert.match(source, /\{contextMenu && contextItems && createPortal\(/, 'context menu portal must render every resolved kind');
  assert.match(source, /setContextMenu\(\{ kind: 'focus', id: entry\.id/, 'focus rows must open the context menu');
  assert.match(source, /kind === 'focus'/, 'focus kind must be recognized when resolving the menu target');
  assert.match(source, /setDialog\(\{ kind: 'focusRename', id: focus\.id \}\)/, 'focus menu must offer an in-place rename');
  assert.match(source, /setDialog\(\{ kind: 'focusMembers', id: focus\.id \}\)/, 'focus menu must offer member editing');
  assert.match(source, /setDialog\(\{ kind: 'focusDelete', id: focus\.id \}\)/, 'focus menu must offer deletion');
  const menuStart = source.indexOf('const contextFocusItems =');
  const menuEnd = source.indexOf('const contextRow', menuStart);
  assert.ok(menuStart > -1 && menuEnd > menuStart, 'per-group menu must stay resolvable');
  assert.ok(!source.slice(menuStart, menuEnd).includes("t('focus.manage')"), 'per-group menu must not fall back to the global manager entry');
});
