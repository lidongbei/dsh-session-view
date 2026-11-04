import { SessionView } from './session-view.jsx';
import { SidebarBoardIcon } from './sidebar-board.jsx';
import { SidebarModeToggle } from './sidebar-workspace.jsx';
import { en, zh } from './locales.js';

/** Stable key shared by the sidebar entry and the main panel. */
export const PANEL_ID = 'dsh-session-view';
const NS = PANEL_ID;

/** Services needed by this UI contribution. */
export const inject = ['slots', 'locale', 'uiWorkspace', 'layout', 'sessions', 'workspaces'];

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-session-view: dictionaries');
  const t = ctx.locale.bind(NS);
  const ui = ctx.uiWorkspace;

  const renameSession = async (sessionId, title) => {
    const result = await ctx.sessions.using(
      sessionId,
      { source: 'workspaceOperation' },
      (reference) => reference.binding.session.rename(title),
    );
    if (!result.ok) throw new Error(result.error.message);
  };

  const searchSessions = async (query, signal) => {
    const result = await ctx.sessions.search(query, signal);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  };

  const workspaceActions = {
    renameWorkspace: (workspaceId, title) => ctx.workspaces.rename(workspaceId, title),
    deleteWorkspace: (workspaceId) => ctx.workspaces.delete(workspaceId),
    createWorkspace: (options) => ctx.workspaces.create(options),
    insertWorkspaceBefore: (workspaceId, beforeWorkspaceId) => ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId),
  };

  const paneActions = {
    openSession: (target) => ui.openSession(target),
    openWorkspace: (workspaceId, options) => ui.openWorkspace(workspaceId, options),
    pinSession: (sessionId) => ui.pinSession(sessionId),
    unpinSession: (sessionId) => ui.unpinSession(sessionId),
    archiveSession: (sessionId, options) => ui.archiveSession(sessionId, options),
    unarchiveSession: (sessionId) => ui.unarchiveSession(sessionId),
    startSession: (workspaceId, options) => ui.startSession(workspaceId, options),
    forkSession: (sessionId, onCreated, options) => ui.forkSession(sessionId, onCreated, options),
    pickDirectory: () => ui.pickDirectory(),
    renameSession,
    searchSessions,
    ...workspaceActions,
  };

  ctx.slots.inject('main', () =>
    ctx.slots.register(
      {
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
          openSession: paneActions.openSession,
          pinSession: paneActions.pinSession,
          unpinSession: paneActions.unpinSession,
          archiveSession: paneActions.archiveSession,
          unarchiveSession: paneActions.unarchiveSession,
        }),
      },
      SessionView,
    ),
  );

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 10,
        locale: NS,
        label: () => t('panel'),
        inject: () => ({
          ...paneActions,
          openPanel: () => ctx.layout.selectPanel(PANEL_ID),
        }),
      },
      SidebarBoardIcon,
    ),
  );

  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      {
        name: 'sidebar.footer.action',
        id: `${PANEL_ID}-mode`,
        locale: NS,
        order: 10,
      },
      SidebarModeToggle,
    ),
  );
}
