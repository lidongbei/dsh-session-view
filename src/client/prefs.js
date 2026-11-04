/**
 * Shared preferences for the sidebar workspace view.
 *
 * A tiny module-level store keeps the portal pane, the footer toggle and the
 * main-panel settings tab in sync without threading React context across
 * separately registered slots. The value is persisted in localStorage; a
 * private-mode failure simply keeps the in-memory defaults.
 */

const KEY = 'dsh-session-view.prefs.v1';

export const DEFAULT_PREFS = Object.freeze({
  mode: 'session',
  activeLimit: 5,
  workspaceLimit: 5,
  showIdle: true,
  archivedFilter: 'hide',
  layout: 'grouped',
  sort: 'updated',
  nestWorkspaces: true,
  manualOrder: Object.freeze({}),
});

const MODES = new Set(['session', 'native']);
const ARCHIVED = new Set(['hide', 'show', 'only']);
const LAYOUTS = new Set(['grouped', 'flat']);
const SORTS = new Set(['updated', 'manual']);

function sanitize(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const clampLimit = (input, fallback) => {
    const n = Number(input);
    return Number.isFinite(n) && n >= 0 && n <= 50 ? Math.round(n) : fallback;
  };
  const manualOrder = {};
  if (value.manualOrder && typeof value.manualOrder === 'object') {
    for (const [key, ids] of Object.entries(value.manualOrder)) {
      if (!Array.isArray(ids)) continue;
      manualOrder[key] = ids.filter((id) => typeof id === 'string');
    }
  }
  return {
    mode: MODES.has(value.mode) ? value.mode : DEFAULT_PREFS.mode,
    activeLimit: clampLimit(value.activeLimit, DEFAULT_PREFS.activeLimit),
    workspaceLimit: clampLimit(value.workspaceLimit, DEFAULT_PREFS.workspaceLimit),
    showIdle: value.showIdle !== false,
    archivedFilter: ARCHIVED.has(value.archivedFilter) ? value.archivedFilter : DEFAULT_PREFS.archivedFilter,
    layout: LAYOUTS.has(value.layout) ? value.layout : DEFAULT_PREFS.layout,
    sort: SORTS.has(value.sort) ? value.sort : DEFAULT_PREFS.sort,
    nestWorkspaces: value.nestWorkspaces !== false,
    manualOrder,
  };
}

function load() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : { ...DEFAULT_PREFS, manualOrder: {} };
  } catch {
    return { ...DEFAULT_PREFS, manualOrder: {} };
  }
}

let state = load();
const listeners = new Set();

export function getPrefs() {
  return state;
}

export function setPrefs(patch) {
  state = sanitize({ ...state, ...patch });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode: session-only preference is still coherent */
  }
  for (const listener of listeners) listener();
}

export function resetPrefs() {
  state = { ...DEFAULT_PREFS, manualOrder: {} };
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener();
}

export function subscribePrefs(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
