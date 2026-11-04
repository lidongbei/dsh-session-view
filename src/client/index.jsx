import { SessionView } from './session-view.jsx';
import { SidebarBoardIcon } from './sidebar-board.jsx';
import { en, zh } from './locales.js';

/** Stable key shared by the sidebar entry and the main panel. */
export const PANEL_ID = 'dsh-session-view';
const NS = PANEL_ID;

/** Host services needed by this UI-only contribution. */
export const inject = ['slots', 'locale', 'uiWorkspace', 'layout'];

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-session-view: dictionaries');
  const t = ctx.locale.bind(NS);

  ctx.slots.inject('main', () =>
    ctx.slots.register(
      {
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
          openSession: (target) => ctx.uiWorkspace.openSession(target),
          pinSession: (sessionId) => ctx.uiWorkspace.pinSession(sessionId),
          unpinSession: (sessionId) => ctx.uiWorkspace.unpinSession(sessionId),
          archiveSession: (sessionId) => ctx.uiWorkspace.archiveSession(sessionId),
          unarchiveSession: (sessionId) => ctx.uiWorkspace.unarchiveSession(sessionId),
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
          openSession: (target) => ctx.uiWorkspace.openSession(target),
          openPanel: () => ctx.layout.selectPanel(PANEL_ID),
          pinSession: (sessionId) => ctx.uiWorkspace.pinSession(sessionId),
          unpinSession: (sessionId) => ctx.uiWorkspace.unpinSession(sessionId),
        }),
      },
      SidebarBoardIcon,
    ),
  );
}
