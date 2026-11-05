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
  recentLimit: 5,
  workspaceLimit: 5,
  showIdle: true,
  showSubagents: false,
  showRecent: true,
  showPinned: true,
  showActive: true,
  showWorkspaces: true,
  showTimes: true,
  compact: false,
  archivedFilter: 'hide',
  sort: 'updated',
  nestWorkspaces: true,
  manualOrder: Object.freeze({}),
  collapsedGroups: Object.freeze([]),
  focusGroups: Object.freeze([]),
  focusGroupId: '',
});

const MODES = new Set(['session', 'native']);
const ARCHIVED = new Set(['hide', 'show', 'only']);
const SORTS = new Set(['updated', 'manual']);

function sanitizeFocusGroups(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const groups = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const id = typeof entry.id === 'string' ? entry.id.trim().slice(0, 80) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 60) : '';
    const workspaceIds = Array.isArray(entry.workspaceIds)
      ? [...new Set(entry.workspaceIds.filter((workspaceId) => typeof workspaceId === 'string' && workspaceId))]
      : [];
    groups.push({ id, name, workspaceIds });
  }
  return groups;
}

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
  const collapsedGroups = Array.isArray(value.collapsedGroups)
    ? value.collapsedGroups.filter((key) => typeof key === 'string')
    : [];
  const focusGroups = sanitizeFocusGroups(value.focusGroups);
  const focusGroupId = focusGroups.some((group) => group.id === value.focusGroupId) ? value.focusGroupId : '';
  return {
    mode: MODES.has(value.mode) ? value.mode : DEFAULT_PREFS.mode,
    activeLimit: clampLimit(value.activeLimit, DEFAULT_PREFS.activeLimit),
    recentLimit: clampLimit(value.recentLimit, DEFAULT_PREFS.recentLimit),
    workspaceLimit: clampLimit(value.workspaceLimit, DEFAULT_PREFS.workspaceLimit),
    showIdle: value.showIdle !== false,
    showSubagents: value.showSubagents === true,
    showRecent: value.showRecent !== false,
    showPinned: value.showPinned !== false,
    showActive: value.showActive !== false,
    showWorkspaces: value.showWorkspaces !== false,
    showTimes: value.showTimes !== false,
    compact: value.compact === true,
    archivedFilter: ARCHIVED.has(value.archivedFilter) ? value.archivedFilter : DEFAULT_PREFS.archivedFilter,
    sort: SORTS.has(value.sort) ? value.sort : DEFAULT_PREFS.sort,
    nestWorkspaces: value.nestWorkspaces !== false,
    manualOrder,
    collapsedGroups,
    focusGroups,
    focusGroupId,
  };
}

function fresh() {
  return { ...DEFAULT_PREFS, manualOrder: {}, collapsedGroups: [], focusGroups: [], focusGroupId: '' };
}

function load() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : fresh();
  } catch {
    return fresh();
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
  state = fresh();
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
