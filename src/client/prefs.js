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
  glowRunning: 'off',
  glowPending: 'off',
  glowDone: 'off',
  archivedFilter: 'hide',
  sort: 'updated',
  nestWorkspaces: true,
  /**
   * How the "工作区会话" section arranges workspaces:
   * - default: one flat section per workspace in registry order
   * - nested: path-based tree
   * - custom: user-managed multi-level groups
   */
  workspaceGroupMode: 'nested',
  workspaceGroups: Object.freeze([]),
  /** workspaceId -> workspace group id; a workspace belongs to at most one group. */
  workspaceAssignments: Object.freeze({}),
  manualOrder: Object.freeze({}),
  collapsedGroups: Object.freeze([]),
  focusGroups: Object.freeze([]),
  focusGroupId: '',
  focusExpanded: Object.freeze([]),
  focusEnabled: true,
  /**
   * Workspaces the user explicitly hid from the left session view. Storing the
   * hidden ids (instead of a visible allow-list) keeps every newly added
   * workspace visible by default.
   */
  hiddenWorkspaceIds: Object.freeze([]),
});

const MODES = new Set(['session', 'native']);
const ARCHIVED = new Set(['hide', 'show', 'only']);
const SORTS = new Set(['updated', 'manual']);
const GROUP_MODES = new Set(['default', 'nested', 'custom']);

function sanitizeWorkspaceGroups(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const groups = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const id = typeof entry.id === 'string' ? entry.id.trim().slice(0, 80) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 60) : '';
    const parentId = typeof entry.parentId === 'string' && entry.parentId ? entry.parentId : null;
    groups.push({ id, name, parentId });
  }
  // Drop dangling parents and break cycles so the tree is always renderable.
  const byId = new Map(groups.map((group) => [group.id, group]));
  for (const group of groups) {
    if (!group.parentId) continue;
    let node = byId.get(group.parentId);
    if (!node || group.parentId === group.id) {
      group.parentId = null;
      continue;
    }
    let steps = 0;
    let cycle = false;
    while (node && steps <= groups.length) {
      if (node.id === group.id) {
        cycle = true;
        break;
      }
      node = node.parentId ? byId.get(node.parentId) : null;
      steps += 1;
    }
    if (cycle) group.parentId = null;
  }
  return groups;
}

function sanitizeAssignments(input, groups) {
  if (!input || typeof input !== 'object') return {};
  const ids = new Set(groups.map((group) => group.id));
  const out = {};
  for (const [workspaceId, groupId] of Object.entries(input)) {
    if (!workspaceId || !ids.has(groupId)) continue;
    out[workspaceId] = groupId;
  }
  return out;
}
const GLOWS = new Set(['off', 'marquee', 'aurora', 'pulse', 'rainbow', 'comet', 'scan', 'dash']);

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
  const focusExpanded = Array.isArray(value.focusExpanded)
    ? [...new Set(value.focusExpanded.filter((id) => typeof id === 'string' && focusGroups.some((group) => group.id === id)))]
    : [];
  const hiddenWorkspaceIds = Array.isArray(value.hiddenWorkspaceIds)
    ? [...new Set(value.hiddenWorkspaceIds.filter((id) => typeof id === 'string' && id))]
    : [];
  const workspaceGroups = sanitizeWorkspaceGroups(value.workspaceGroups);
  const workspaceAssignments = sanitizeAssignments(value.workspaceAssignments, workspaceGroups);
  const workspaceGroupMode = GROUP_MODES.has(value.workspaceGroupMode)
    ? value.workspaceGroupMode
    : value.nestWorkspaces === false
      ? 'default'
      : DEFAULT_PREFS.workspaceGroupMode;
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
    // Migrate the old single glowEffect onto both statuses.
    glowRunning: GLOWS.has(value.glowRunning) ? value.glowRunning : GLOWS.has(value.glowEffect) ? value.glowEffect : 'off',
    glowPending: GLOWS.has(value.glowPending) ? value.glowPending : GLOWS.has(value.glowEffect) ? value.glowEffect : 'off',
    glowDone: GLOWS.has(value.glowDone) ? value.glowDone : GLOWS.has(value.glowEffect) ? value.glowEffect : 'off',
    sort: SORTS.has(value.sort) ? value.sort : DEFAULT_PREFS.sort,
    nestWorkspaces: workspaceGroupMode === 'nested',
    workspaceGroupMode,
    workspaceGroups,
    workspaceAssignments,
    manualOrder,
    collapsedGroups,
    focusGroups,
    focusGroupId,
    focusExpanded,
    focusEnabled: value.focusEnabled !== false,
    hiddenWorkspaceIds,
  };
}

function fresh() {
  return {
    ...DEFAULT_PREFS,
    manualOrder: {},
    collapsedGroups: [],
    focusGroups: [],
    focusGroupId: '',
    focusExpanded: [],
    focusEnabled: true,
    hiddenWorkspaceIds: [],
    workspaceGroups: [],
    workspaceAssignments: {},
  };
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
