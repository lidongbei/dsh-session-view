window.__ModuleLoader__.load({
  id: "dsh-session-view",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  PANEL_ID: () => PANEL_ID,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/session-view.jsx
var import_react = require("react");

// src/client/logic.js
var STATUS_LIST = ["running", "pending", "done", "idle"];
var ALL = "all";
function asSet(value) {
  return value instanceof Set ? value : new Set(value ?? []);
}
function resolveStatus(status, summary) {
  if (status?.pendingInteraction) return "pending";
  if ((status?.running ?? summary?.running) === true) return "running";
  if (status?.completionUnread === true) return "done";
  return "idle";
}
function pendingLabelKey(kind) {
  switch (kind) {
    case "approval":
      return "pending.approval";
    case "plan-review":
      return "pending.planReview";
    case "question":
      return "pending.question";
    default:
      return "pending.generic";
  }
}
function statusLabelKey(status) {
  switch (status) {
    case "running":
      return "status.running";
    case "pending":
      return "status.pending";
    case "done":
      return "status.done";
    default:
      return "status.idle";
  }
}
function buildCandidates(sessions, archived) {
  const archivedSet = asSet(archived);
  const listed = asSet(sessions?.ids);
  const rows = [];
  for (const summary of Object.values(sessions?.byId ?? {})) {
    if (!summary || !summary.id) continue;
    if (summary.blank) continue;
    if (archivedSet.has(summary.id)) continue;
    if (!listed.has(summary.id) && summary.origin !== "subagent") continue;
    rows.push(summary);
  }
  rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || String(a.id).localeCompare(String(b.id)));
  return rows;
}
function buildFamilies(candidates, byId = {}) {
  const visible = new Map(candidates.map((session) => [session.id, session]));
  const children = /* @__PURE__ */ new Map();
  const roots = [];
  for (const session of candidates) {
    const parentId = session.parentId;
    if (parentId && parentId !== session.id && visible.has(parentId)) {
      const list = children.get(parentId) ?? [];
      list.push(session);
      children.set(parentId, list);
    } else {
      roots.push(session);
    }
  }
  const newestFirst = (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  for (const list of children.values()) list.sort(newestFirst);
  const memo = /* @__PURE__ */ new Map();
  const maxUpdated = (session, stack = /* @__PURE__ */ new Set()) => {
    if (memo.has(session.id)) return memo.get(session.id);
    if (stack.has(session.id)) return session.updatedAt ?? 0;
    stack.add(session.id);
    let max = session.updatedAt ?? 0;
    for (const child of children.get(session.id) ?? []) {
      max = Math.max(max, maxUpdated(child, stack));
    }
    stack.delete(session.id);
    memo.set(session.id, max);
    return max;
  };
  roots.sort((a, b) => maxUpdated(b) - maxUpdated(a) || newestFirst(a, b));
  const rows = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (session, depth, orphan) => {
    if (seen.has(session.id)) return;
    seen.add(session.id);
    rows.push({ session, depth, orphan });
    for (const child of children.get(session.id) ?? []) visit(child, depth + 1, false);
  };
  for (const root of roots) {
    const parentId = root.parentId;
    const orphan = Boolean(parentId && parentId !== root.id && !visible.has(parentId));
    visit(root, 0, orphan);
  }
  const remaining = candidates.filter((session) => !seen.has(session.id)).sort(newestFirst);
  for (const session of remaining) {
    if (!seen.has(session.id)) visit(session, 0, false);
  }
  return rows;
}
function workspaceIndex(workspaces) {
  const index = /* @__PURE__ */ new Map();
  for (const workspace of workspaces?.items ?? []) {
    for (const sessionId of workspace?.sessionIds ?? []) {
      if (!index.has(sessionId)) index.set(sessionId, workspace);
    }
  }
  return index;
}
function resolveWorkspace(session, index, byId = {}) {
  const seen = /* @__PURE__ */ new Set();
  let current = session;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const workspace = index.get(current.id);
    if (workspace) return workspace;
    const parentId = current.parentId;
    if (!parentId || parentId === current.id) return void 0;
    current = byId[parentId];
  }
  return void 0;
}
function buildRows(candidates, byId, workspaces) {
  const index = workspaceIndex(workspaces);
  return buildFamilies(candidates, byId).map((row) => ({
    ...row,
    title: sessionTitle(row.session),
    workspace: resolveWorkspace(row.session, index, byId)
  }));
}
function annotateRows(rows, statuses) {
  const annotated = rows.map((row) => {
    const status = statuses?.get?.(row.session.id);
    return {
      ...row,
      status: resolveStatus(status, row.session),
      pendingKind: status?.pendingInteraction?.kind,
      runningChildren: 0
    };
  });
  const byId = new Map(annotated.map((row) => [row.session.id, row]));
  for (const row of annotated) {
    if (row.status !== "running") continue;
    const seen = /* @__PURE__ */ new Set([row.session.id]);
    let parentId = row.session.parentId;
    while (parentId && byId.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = byId.get(parentId);
      parent.runningChildren += 1;
      parentId = parent.session.parentId;
    }
  }
  return annotated;
}
function matchesQuery(row, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return true;
  const workspace = row.workspace;
  const haystack = [
    row.title,
    row.session?.displayTitle,
    row.session?.cwd,
    workspace?.title,
    workspace?.path,
    row.session?.id
  ].filter((value) => typeof value === "string" && value.length > 0).join("\n").toLowerCase();
  return needle.split(/\s+/).every((part) => haystack.includes(part));
}
function filterRows(rows, { query = "", workspaceId = ALL, status = ALL } = {}) {
  return rows.filter((row) => {
    if (status !== ALL && row.status !== status) return false;
    if (workspaceId !== ALL && row.workspace?.workspaceId !== workspaceId) return false;
    return matchesQuery(row, query);
  });
}
function countByStatus(rows) {
  const counts = { all: rows.length, running: 0, pending: 0, done: 0, idle: 0 };
  for (const row of rows) {
    if (counts[row.status] !== void 0) counts[row.status] += 1;
  }
  return counts;
}
function formatRelativeTime(updatedAt, now = Date.now()) {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return { key: "time.unknown" };
  const diff = Math.max(0, now - updatedAt);
  if (diff < 6e4) return { key: "time.justNow" };
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 60) return { key: "time.minutesAgo", n: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: "time.hoursAgo", n: hours };
  const days = Math.floor(hours / 24);
  if (days < 7) return { key: "time.daysAgo", n: days };
  if (days < 30) return { key: "time.weeksAgo", n: Math.floor(days / 7) };
  if (days < 365) return { key: "time.monthsAgo", n: Math.floor(days / 30) };
  return { key: "time.yearsAgo", n: Math.floor(days / 365) };
}
function sessionTitle(summary) {
  const display = summary?.displayTitle?.trim();
  if (display) return display;
  const title = summary?.title?.trim();
  if (title) return title;
  return summary?.id ?? "";
}
function workspaceLabel(workspace) {
  const title = workspace?.title?.trim();
  if (title) return title;
  return basename(workspace?.path);
}
function basename(path) {
  if (typeof path !== "string") return "";
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}
function splitSections(rows, pinnedIds) {
  const pinnedOrder = /* @__PURE__ */ new Map();
  for (const [index, id] of (pinnedIds ?? []).entries()) {
    if (!pinnedOrder.has(id)) pinnedOrder.set(id, index);
  }
  const pinned = rows.filter((row) => pinnedOrder.has(row.session.id)).sort((a, b) => pinnedOrder.get(a.session.id) - pinnedOrder.get(b.session.id));
  const pinnedSet = new Set(pinned.map((row) => row.session.id));
  const rest = rows.filter((row) => !pinnedSet.has(row.session.id));
  return {
    pinned,
    running: rest.filter((row) => row.status === "running"),
    pending: rest.filter((row) => row.status === "pending"),
    done: rest.filter((row) => row.status === "done"),
    idle: rest.filter((row) => row.status === "idle")
  };
}
function topRows(rows, limit) {
  return rows.slice(0, Math.max(0, limit));
}
function trashRows(items, byId = {}) {
  const latest = /* @__PURE__ */ new Map();
  for (const item of items ?? []) {
    if (!item || typeof item.sessionId !== "string") continue;
    const previous = latest.get(item.sessionId);
    if (previous && (previous.deletedAt ?? 0) >= (item.deletedAt ?? 0)) continue;
    latest.set(item.sessionId, item);
  }
  return [...latest.values()].map((item) => {
    const summary = byId[item.sessionId] ?? {
      id: item.sessionId,
      title: item.title,
      displayTitle: item.title,
      cwd: item.cwd,
      updatedAt: item.deletedAt
    };
    return {
      session: summary,
      title: sessionTitle(summary),
      depth: 0,
      orphan: false,
      status: "idle",
      deletedAt: item.deletedAt ?? 0,
      trashed: true
    };
  }).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}
function archivedRows(sessions, archivedIds) {
  const byId = sessions?.byId ?? {};
  const rows = [];
  for (const id of archivedIds ?? []) {
    const summary = byId[id];
    if (!summary) continue;
    rows.push({
      session: summary,
      title: sessionTitle(summary),
      depth: 0,
      orphan: false,
      status: "idle",
      archived: true
    });
  }
  return rows.sort((a, b) => (b.session.updatedAt ?? 0) - (a.session.updatedAt ?? 0));
}

// src/client/api.js
async function request(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body === void 0 ? void 0 : { "content-type": "application/json" },
    body: options.body === void 0 ? void 0 : JSON.stringify(options.body),
    credentials: "same-origin"
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}
function fetchTrash() {
  return request("/session-view/trash");
}
function addToTrash(items) {
  return request("/session-view/trash/add", { method: "POST", body: { items } });
}
function restoreTrash(sessionIds) {
  return request("/session-view/trash/restore", { method: "POST", body: { sessionIds } });
}
function purgeTrash(sessionIds) {
  return request("/session-view/trash/purge", { method: "POST", body: { sessionIds } });
}

// src/client/styles.js
var STYLES = `
.dsv-page {
  height: 100%;
  overflow: auto;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
}
.dsv-page *, .dsv-page *::before, .dsv-page *::after { box-sizing: border-box; }
.dsv-srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.dsv-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 clamp(24px, 4vw, 48px) 48px;
}
.dsv-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-top: 28px;
}
.dsv-heading { min-width: 0; }
.dsv-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.01em;
}
.dsv-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-total {
  flex: none;
  padding-top: 4px;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.dsv-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 20px;
}
.dsv-search { position: relative; flex: 1 1 260px; min-width: 200px; }
.dsv-searchIcon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: var(--dsw-alias-label-tertiary);
  pointer-events: none;
}
.dsv-input {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: inherit;
  font: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.dsv-input::placeholder { color: var(--dsw-alias-label-dimmed); }
.dsv-input:focus-visible {
  border-color: var(--dsw-alias-focus-ring-color);
  box-shadow: 0 0 0 1px var(--dsw-alias-focus-ring-color);
}
.dsv-selectWrap { position: relative; flex: none; }
.dsv-select {
  height: 36px;
  min-width: 150px;
  max-width: 220px;
  padding: 0 30px 0 12px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  appearance: none;
  cursor: pointer;
}
.dsv-select:focus-visible {
  outline: none;
  border-color: var(--dsw-alias-focus-ring-color);
  box-shadow: 0 0 0 1px var(--dsw-alias-focus-ring-color);
}
.dsv-chevron {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: var(--dsw-alias-label-tertiary);
  pointer-events: none;
}
.dsv-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.dsv-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.dsv-chip:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dsv-chip[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l4);
  color: var(--dsw-alias-label-primary);
}
.dsv-chipCount {
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-chip[aria-pressed="true"] .dsv-chipCount { color: var(--dsw-alias-label-secondary); }
.dsv-dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--dsw-alias-state-idle-primary);
}
.dsv-dot[data-status="running"] { background: var(--dsw-alias-state-business-primary); }
.dsv-dot[data-status="pending"] { background: var(--dsw-alias-state-warn-primary); }
.dsv-dot[data-status="done"] { background: var(--dsw-alias-state-success-primary); }
.dsv-banner {
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.dsv-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 18px;
  padding-bottom: 8px;
}
.dsv-row { position: relative; border-radius: 12px; }
.dsv-row[data-depth]:not([data-depth="0"])::before {
  content: "";
  position: absolute;
  left: calc(var(--dsv-depth) * 16px - 8px);
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--dsw-alias-border-l3);
  opacity: 0.7;
  pointer-events: none;
}
.dsv-row[data-depth]:not([data-depth="0"])::after {
  content: "";
  position: absolute;
  left: calc(var(--dsv-depth) * 16px - 8px);
  top: 50%;
  width: 8px;
  height: 1px;
  background: var(--dsw-alias-border-l3);
  opacity: 0.7;
  pointer-events: none;
}
.dsv-rowButton {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 8px 12px 8px calc(12px + var(--dsv-depth, 0) * 16px);
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dsv-rowButton:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-rowButton:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dsw-alias-focus-ring-color);
}
.dsv-status {
  position: relative;
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
  background: var(--dsw-alias-state-idle-primary);
}
.dsv-status[data-status="running"] {
  background: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent);
}
.dsv-status[data-status="pending"] {
  background: var(--dsw-alias-state-warn-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent);
}
.dsv-status[data-status="done"] {
  background: var(--dsw-alias-state-success-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent);
}
@media (prefers-reduced-motion: no-preference) {
  .dsv-status[data-status="running"]::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid var(--dsw-alias-state-business-primary);
    opacity: 0;
    animation: dsv-pulse 2.4s ease-out infinite;
  }
  @keyframes dsv-pulse {
    0% { transform: scale(0.7); opacity: 0.55; }
    70% { transform: scale(1.6); opacity: 0; }
    100% { transform: scale(1.6); opacity: 0; }
  }
}
.dsv-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.dsv-rowTitle {
  font-size: 13px;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsv-rowMeta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-metaText {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-workspace { max-width: 200px; }
.dsv-sep { opacity: 0.6; }
.dsv-tag {
  display: inline-flex;
  align-items: center;
  height: 17px;
  padding: 0 6px;
  flex: none;
  border-radius: 5px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
}
.dsv-tag[data-kind="orphan"] { font-style: italic; }
.dsv-pill {
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  white-space: nowrap;
}
.dsv-pill[data-status="pending"] {
  color: var(--dsw-alias-state-warn-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
}
.dsv-pill[data-status="done"] {
  color: var(--dsw-alias-state-success-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
}
.dsv-empty {
  max-width: 420px;
  margin: 56px auto 0;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-emptyTitle {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
}
.dsv-emptyHint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
}
.dsv-clear {
  margin-top: 14px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsv-clear:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-clear:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dsw-alias-focus-ring-color);
}
@media (max-width: 560px) {
  .dsv-total { display: none; }
  .dsv-workspace { max-width: 120px; }
  .dsv-select { min-width: 120px; }
}
.dsv-headActions { display: flex; align-items: center; gap: 8px; flex: none; }
.dsv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 11px;
  border-radius: 9px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.dsv-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-alias-focus-ring-color); }
.dsv-btn[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l4);
  color: var(--dsw-alias-label-primary);
}
.dsv-btn[data-tone="danger"] { color: var(--dsw-alias-state-error-primary); }
.dsv-btn[data-tone="danger"]:hover {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);
}
.dsv-btn:disabled { opacity: 0.5; cursor: default; }
.dsv-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 18px;
  border-bottom: 1px solid var(--dsw-alias-border-l3);
}
.dsv-tab {
  position: relative;
  height: 34px;
  padding: 0 11px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.dsv-tab:hover { color: var(--dsw-alias-label-primary); }
.dsv-tab[aria-selected="true"] {
  color: var(--dsw-alias-label-primary);
  border-bottom-color: var(--dsw-alias-label-primary);
}
.dsv-tab:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--dsw-alias-focus-ring-color); }
.dsv-tabCount {
  margin-left: 6px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.dsv-batch {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 8px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 10px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsv-batchText { font-size: 12px; color: var(--dsw-alias-label-secondary); margin-right: auto; }
.dsv-section { margin-top: 18px; }
.dsv-sectionHead {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  padding: 0 4px 4px;
}
.dsv-sectionTitle {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--dsw-alias-label-secondary);
}
.dsv-sectionCount {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.dsv-row { display: flex; align-items: center; gap: 2px; }
.dsv-check {
  flex: none;
  width: 15px;
  height: 15px;
  margin: 0 4px 0 11px;
  accent-color: var(--dsw-alias-state-business-primary);
  cursor: pointer;
}
.dsv-rowButton { padding-right: 112px; }
.dsv-rowActions {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 10px;
  background: linear-gradient(90deg, transparent, var(--dsw-alias-bg-base) 8px, var(--dsw-alias-bg-base));
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.1s ease;
}
.dsv-row:hover .dsv-rowActions,
.dsv-row:focus-within .dsv-rowActions { opacity: 1; pointer-events: auto; }
.dsv-iconBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}
.dsv-iconBtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-iconBtn[data-tone="danger"]:hover { color: var(--dsw-alias-state-error-primary); }
.dsv-iconBtn[aria-pressed="true"] { color: var(--dsw-alias-state-business-primary); }
.dsv-iconBtn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-alias-focus-ring-color); }
.dsv-dialogOverlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.36);
}
.dsv-dialog {
  width: min(420px, 100%);
  padding: 18px;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
}
.dsv-dialogTitle { margin: 0; font-size: 14px; font-weight: 500; }
.dsv-dialogBody {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}
.dsv-dialogWarning {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-state-error-primary);
}
.dsv-dialogActions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.dsv-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 10000;
  max-width: min(520px, calc(100vw - 32px));
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  transform: translateX(-50%);
}
.dsv-toast[data-tone="error"] { color: var(--dsw-alias-state-error-primary); }
.dsv-boardHost {
  flex: none;
  min-width: 0;
  margin: 0 2px 10px;
}
.dsv-board {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 10px;
  background: var(--dsw-alias-bg-base);
  overflow: hidden;
  font-size: 12px;
}
.dsv-board * { box-sizing: border-box; }
.dsv-boardHead {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.dsv-boardHead:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-boardChevron { display: inline-flex; flex: none; color: var(--dsw-alias-label-tertiary); transition: transform 0.12s ease; }
.dsv-boardChevron[data-collapsed="false"] { transform: rotate(90deg); }
.dsv-boardTitle { font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsv-boardHeadActions { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.dsv-boardBadge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.dsv-boardBody { max-height: min(38vh, 300px); overflow: auto; padding: 2px 4px 5px; }
.dsv-boardGroup { padding-top: 3px; }
.dsv-boardGroupTitle {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 5px 2px;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-boardRow {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 27px;
  border-radius: 7px;
  color: var(--dsw-alias-label-secondary);
}
.dsv-boardRow:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-boardOpen {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 0;
  min-height: 27px;
  padding: 3px 4px 3px 6px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.dsv-boardAction {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 22px;
  height: 22px;
  margin-right: 2px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0;
  cursor: pointer;
}
.dsv-boardRow:hover .dsv-boardAction,
.dsv-boardRow:focus-within .dsv-boardAction,
.dsv-boardAction[aria-pressed="true"] { opacity: 1; }
.dsv-boardAction:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-boardAction[aria-pressed="true"] { color: var(--dsw-alias-state-business-primary); }
.dsv-boardRowTitle { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsv-boardEmpty { padding: 8px 6px 10px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.5; }
.dsv-boardMore {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: calc(100% - 8px);
  height: 26px;
  margin: 2px 4px 4px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dsv-boardMore:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-boardPin { flex: none; color: var(--dsw-alias-state-business-primary); display: inline-flex; }
.dsv-panelIcon { display: inline-flex; align-items: center; justify-content: center; }
`;

// src/client/icons.jsx
var import_jsx_runtime = require("react/jsx-runtime");
function SessionViewIcon({ size = 16 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "3.5", cy: "4", r: "1.5", fill: "currentColor" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 4h6", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "3.5", cy: "8", r: "1.5", fill: "currentColor", opacity: "0.72" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 8h6", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", opacity: "0.72" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "3.5", cy: "12", r: "1.5", fill: "currentColor", opacity: "0.45" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 12h6", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", opacity: "0.45" })
  ] });
}
function SearchIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "7", cy: "7", r: "4.25", stroke: "currentColor", strokeWidth: "1.4" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m10.2 10.2 3.1 3.1", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" })
  ] });
}
function ChevronDownIcon({ size = 12 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m4 6 4 4 4-4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function ChevronRightIcon({ size = 12 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m6 4 4 4-4 4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function PinIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "path",
    {
      d: "M6 3h4l-.6 3.2 2.1 2.1v1.2H9.4V13L8 14l-1.4-1V9.5H4.5V8.3l2.1-2.1L6 3Z",
      stroke: "currentColor",
      strokeWidth: "1.2",
      strokeLinejoin: "round"
    }
  ) });
}
function ArchiveIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "2.5", y: "3", width: "11", height: "3", rx: "0.8", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 6v6.2c0 .5.4.8.8.8h6.4c.4 0 .8-.3.8-.8V6", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.5 8.6h3", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" })
  ] });
}
function TrashIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.5 8.2c0 .4.4.8.8.8h3.4c.4 0 .8-.4.8-.8l.5-8.2", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.8 6.8v4M9.2 6.8v4", stroke: "currentColor", strokeWidth: "1.1", strokeLinecap: "round" })
  ] });
}
function RestoreIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3.2 6.2A5 5 0 1 1 3 9", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 3v3.4h3.4", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" })
  ] });
}

// src/client/session-view.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var ALL2 = "all";
var TABS = ["active", "archived", "trash"];
var CONFIRM_COPY = {
  archive: { title: "confirm.archive.title", body: "confirm.archive.body", tone: "normal" },
  trash: { title: "confirm.trash.title", body: "confirm.trash.body", tone: "normal" },
  purge: {
    title: "confirm.purge.title",
    body: "confirm.purge.body",
    warning: "confirm.purge.warning",
    tone: "danger"
  }
};
function errorText(error) {
  return String(error?.message ?? error);
}
function SessionView({
  t,
  useSessions,
  useSessionStatus,
  useWorkspaces,
  openSession,
  pinSession,
  unpinSession,
  archiveSession,
  unarchiveSession
}) {
  const sessions = useSessions((state) => state);
  const statuses = useSessionStatus((state) => state);
  const workspaces = useWorkspaces((state) => state);
  const [tab, setTab] = (0, import_react.useState)("active");
  const [query, setQuery] = (0, import_react.useState)("");
  const [workspaceId, setWorkspaceId] = (0, import_react.useState)(ALL2);
  const [status, setStatus] = (0, import_react.useState)(ALL2);
  const [now, setNow] = (0, import_react.useState)(() => Date.now());
  const [manage, setManage] = (0, import_react.useState)(false);
  const [selected, setSelected] = (0, import_react.useState)([]);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [confirm, setConfirm] = (0, import_react.useState)(null);
  const [toast, setToast] = (0, import_react.useState)(null);
  const [trash, setTrash] = (0, import_react.useState)({ state: "idle", items: [], error: null });
  (0, import_react.useEffect)(() => {
    const timer = setInterval(() => setNow(Date.now()), 6e4);
    return () => clearInterval(timer);
  }, []);
  (0, import_react.useEffect)(() => {
    if (!toast) return void 0;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  const loadTrash = (0, import_react.useCallback)(async () => {
    setTrash((prev) => ({ ...prev, state: "loading", error: null }));
    try {
      const data = await fetchTrash();
      setTrash({ state: "ready", items: Array.isArray(data.items) ? data.items : [], error: null });
    } catch (error) {
      setTrash({ state: "error", items: [], error: errorText(error) });
    }
  }, []);
  (0, import_react.useEffect)(() => {
    if (tab === "trash") loadTrash();
  }, [tab, loadTrash]);
  (0, import_react.useEffect)(() => {
    setSelected([]);
    setManage(false);
  }, [tab]);
  const annotated = (0, import_react.useMemo)(() => {
    if (!sessions || !workspaces) return [];
    const candidates = buildCandidates(sessions, workspaces.archivedSessionIds);
    const rows = buildRows(candidates, sessions.byId ?? {}, workspaces);
    return annotateRows(rows, statuses);
  }, [sessions, statuses, workspaces]);
  const workspaceOptions = (0, import_react.useMemo)(() => {
    const byWorkspace = /* @__PURE__ */ new Map();
    for (const row of annotated) {
      const workspace = row.workspace;
      if (!workspace?.workspaceId) continue;
      if (!byWorkspace.has(workspace.workspaceId)) {
        byWorkspace.set(workspace.workspaceId, workspaceLabel(workspace) || workspace.workspaceId);
      }
    }
    return Array.from(byWorkspace, ([id, label]) => ({ id, label })).sort(
      (a, b) => a.label.localeCompare(b.label)
    );
  }, [annotated]);
  const scopeRows = (0, import_react.useMemo)(
    () => filterRows(annotated, { query, workspaceId, status: ALL2 }),
    [annotated, query, workspaceId]
  );
  const activeRows = (0, import_react.useMemo)(
    () => status === ALL2 ? scopeRows : filterRows(scopeRows, { status }),
    [scopeRows, status]
  );
  const counts = (0, import_react.useMemo)(() => countByStatus(scopeRows), [scopeRows]);
  const sections = (0, import_react.useMemo)(
    () => splitSections(activeRows, workspaces?.pinnedSessionIds),
    [activeRows, workspaces?.pinnedSessionIds]
  );
  const archived = (0, import_react.useMemo)(() => {
    const rows = archivedRows(sessions, workspaces?.archivedSessionIds);
    return rows.filter((row) => matchesQuery(row, query));
  }, [sessions, workspaces?.archivedSessionIds, query]);
  const trashed = (0, import_react.useMemo)(() => {
    const rows = trashRows(trash.items, sessions?.byId);
    return rows.filter((row) => matchesQuery(row, query));
  }, [trash.items, sessions?.byId, query]);
  const pinnedSet = (0, import_react.useMemo)(
    () => new Set(workspaces?.pinnedSessionIds ?? []),
    [workspaces?.pinnedSessionIds]
  );
  const selectedSet = (0, import_react.useMemo)(() => new Set(selected), [selected]);
  const tabRows = tab === "active" ? activeRows : tab === "archived" ? archived : trashed;
  const tabIds = tabRows.map((row) => row.session.id);
  const allSelected = tabIds.length > 0 && tabIds.every((id) => selectedSet.has(id));
  const filtersActive = query.trim().length > 0 || workspaceId !== ALL2 || status !== ALL2;
  const clearFilters = () => {
    setQuery("");
    setWorkspaceId(ALL2);
    setStatus(ALL2);
  };
  const notify = (successText, failures = [], ok = 1) => {
    if (failures.length === 0) {
      setToast({ text: successText, tone: "info" });
      return;
    }
    if (successText) {
      setToast({
        text: `${successText} \xB7 ${t("toast.partial", { ok, failed: failures.length })}`,
        tone: "error"
      });
      return;
    }
    setToast({ text: t("toast.failed", { message: errorText(failures[0]) }), tone: "error" });
  };
  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };
  const togglePin = async (row) => {
    const id = row.session.id;
    const pinned = pinnedSet.has(id);
    setBusy(true);
    try {
      await (pinned ? unpinSession(id) : pinSession(id));
      setToast({ text: t(pinned ? "toast.unpinned" : "toast.pinned"), tone: "info" });
    } catch (error) {
      setToast({ text: t("toast.failed", { message: errorText(error) }), tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  const archiveMany = async (ids) => {
    const results = await Promise.allSettled(ids.map((id) => archiveSession(id)));
    const failures = results.map((result, index) => result.status === "rejected" ? { id: ids[index], error: result.reason } : null).filter(Boolean);
    const ok = ids.length - failures.length;
    notify(failures.length === ids.length ? "" : t("toast.archived", { n: ok }), failures, ok);
    setSelected([]);
  };
  const trashMany = async (rows) => {
    const ids = rows.map((row) => row.session.id);
    const archived2 = await Promise.allSettled(rows.map((row) => archiveSession(row.session.id)));
    const failures = archived2.map((result, index) => result.status === "rejected" ? { sessionId: ids[index], error: result.reason } : null).filter(Boolean);
    const ready = rows.filter((_, index) => archived2[index].status === "fulfilled");
    if (ready.length > 0) {
      try {
        const result = await addToTrash(
          ready.map((row) => ({
            sessionId: row.session.id,
            title: row.session.displayTitle || row.session.title || "",
            cwd: row.session.cwd || ""
          }))
        );
        if (Array.isArray(result.failed)) failures.push(...result.failed);
        const ok = result.added ?? ready.length - (result.failed?.length ?? 0);
        notify(ok === 0 ? "" : t("toast.trashed", { n: ok }), failures, ok);
        await loadTrash();
      } catch (error) {
        failures.push({ error });
        notify("", failures);
      }
    } else {
      notify("", failures);
    }
    setSelected([]);
  };
  const restoreMany = async (ids) => {
    const results = await Promise.allSettled(ids.map((id) => unarchiveSession(id)));
    const failures = results.filter((result) => result.status === "rejected");
    const ok = ids.length - failures.length;
    notify(ok === 0 ? "" : t("toast.restored", { n: ok }), failures, ok);
    if (tab === "trash") await loadTrash();
    setSelected([]);
  };
  const restoreFromTrash = async (ids) => {
    try {
      const result = await restoreTrash(ids);
      const failures = Array.isArray(result.failed) ? result.failed : [];
      const ok = result.restored ?? ids.length - failures.length;
      notify(ok === 0 ? "" : t("toast.restored", { n: ok }), failures, ok);
      await Promise.allSettled(ids.map((id) => unarchiveSession(id)));
      await loadTrash();
    } catch (error) {
      notify("", [{ error }]);
    }
    setSelected([]);
  };
  const purgeMany = async (ids) => {
    try {
      const result = await purgeTrash(ids);
      const failures = Array.isArray(result.failed) ? result.failed : [];
      const ok = result.purged?.length ?? 0;
      notify(ok === 0 ? "" : t("toast.purged", { n: ok }), failures, ok);
      await loadTrash();
    } catch (error) {
      notify("", [{ error }]);
    }
    setSelected([]);
  };
  const runConfirmed = async () => {
    if (!confirm) return;
    const { kind, ids, rows } = confirm;
    setConfirm(null);
    setBusy(true);
    try {
      if (kind === "archive") await archiveMany(ids);
      if (kind === "trash") await trashMany(rows);
      if (kind === "purge") await purgeMany(ids);
    } finally {
      setBusy(false);
    }
  };
  const requestConfirm = (kind, rows) => {
    const ids = rows.map((row) => row.session.id);
    if (ids.length === 0) return;
    setConfirm({ kind, ids, rows });
  };
  const togglePinFromRow = (row) => {
    togglePin(row);
  };
  const renderActions = (row) => {
    const id = row.session.id;
    if (tab === "active") {
      const pinned = pinnedSet.has(id);
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "aria-pressed": pinned,
            "aria-label": t(pinned ? "action.unpin" : "action.pin"),
            title: t(pinned ? "action.unpin" : "action.pin"),
            onClick: () => togglePinFromRow(row),
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PinIcon, { size: 13 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "aria-label": t("action.archive"),
            title: t("action.archive"),
            onClick: () => requestConfirm("archive", [row]),
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ArchiveIcon, { size: 13 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "data-tone": "danger",
            "aria-label": t("action.trash"),
            title: t("action.trash"),
            onClick: () => requestConfirm("trash", [row]),
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TrashIcon, { size: 13 })
          }
        )
      ] });
    }
    if (tab === "archived") {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "aria-label": t("action.restore"),
            title: t("action.restore"),
            onClick: () => restoreMany([id]),
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RestoreIcon, { size: 13 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "data-tone": "danger",
            "aria-label": t("action.trash"),
            title: t("action.trash"),
            onClick: () => requestConfirm("trash", [row]),
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TrashIcon, { size: 13 })
          }
        )
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "dsv-iconBtn",
          "aria-label": t("action.restore"),
          title: t("action.restore"),
          onClick: () => restoreFromTrash([id]),
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RestoreIcon, { size: 13 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "dsv-iconBtn",
          "data-tone": "danger",
          "aria-label": t("action.purge"),
          title: t("action.purge"),
          onClick: () => requestConfirm("purge", [row]),
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TrashIcon, { size: 13 })
        }
      )
    ] });
  };
  const renderRow = (row) => {
    const id = row.session.id;
    const pinned = pinnedSet.has(id);
    const time = formatRelativeTime(
      tab === "trash" ? row.deletedAt : row.session.updatedAt,
      now
    );
    const timeLabel = t(time.key, time.n === void 0 ? void 0 : { n: time.n });
    const workspaceName = row.workspace ? workspaceLabel(row.workspace) || t("workspace.unknown") : t("workspace.unknown");
    const meta = tab === "trash" ? t("trash.deletedAt", { time: timeLabel }) : `${workspaceName} \xB7 ${timeLabel}`;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "div",
      {
        className: "dsv-row",
        "data-depth": row.depth,
        style: { "--dsv-depth": row.depth },
        role: "listitem",
        "data-manage": manage,
        children: [
          manage && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              type: "checkbox",
              className: "dsv-check",
              checked: selectedSet.has(id),
              onChange: () => toggleSelect(id),
              "aria-label": t("select.count", { n: 1 })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: "dsv-rowButton",
              onClick: () => manage ? toggleSelect(id) : tab === "active" && openSession(id),
              title: tab === "active" ? t("row.open", { title: row.title }) : row.title,
              children: [
                tab !== "trash" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-status", "data-status": row.status, "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "dsv-main", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "dsv-rowTitle", children: [
                    pinned && tab === "active" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-boardPin", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PinIcon, { size: 10 }) }),
                    row.title
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "dsv-rowMeta", children: [
                    row.session.origin === "subagent" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-tag", children: t("row.child") }),
                    row.orphan && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-tag", "data-kind": "orphan", children: t("row.orphan") }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-metaText dsv-workspace", children: meta }),
                    row.runningChildren > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-sep", "aria-hidden": "true", children: "\xB7" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-metaText", children: t("row.runningChildren", { n: row.runningChildren }) })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-srOnly", children: t(statusLabelKey(row.status)) }),
                tab === "active" && row.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-pill", "data-status": "pending", children: t(pendingLabelKey(row.pendingKind)) }),
                tab === "active" && row.status === "done" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-pill", "data-status": "done", children: t("status.done") })
              ]
            }
          ),
          !manage && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-rowActions", children: renderActions(row) })
        ]
      },
      id
    );
  };
  const renderSection = (key, titleKey, rows) => {
    if (rows.length === 0) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "dsv-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-sectionHead", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "dsv-sectionTitle", children: t(titleKey) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-sectionCount", children: rows.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-list", role: "list", "aria-label": t(titleKey), children: rows.map(renderRow) })
    ] }, key);
  };
  const sectionList = tab !== "active" ? [] : status === ALL2 ? [
    ["pinned", "section.pinned", sections.pinned],
    ["running", "section.running", sections.running],
    ["pending", "section.pending", sections.pending],
    ["done", "section.done", sections.done],
    ["idle", "section.idle", sections.idle]
  ] : [["all", "section.all", activeRows]];
  const tabCounts = {
    active: annotated.length,
    archived: archived.length,
    trash: trash.items.length
  };
  const emptyNode = (() => {
    if (tab === "trash") {
      if (trash.state === "loading") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-emptyHint", children: t("loading") });
      if (trash.state === "error") {
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-emptyTitle", children: t("error.trash") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-emptyHint", children: trash.error }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dsv-clear", onClick: loadTrash, children: t("loading") })
        ] });
      }
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-emptyTitle", children: t("trash.empty") });
    }
    if (tab === "archived") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-emptyTitle", children: t("archived.empty") });
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-emptyTitle", children: annotated.length === 0 ? t("empty.title") : t("empty.filtered") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-emptyHint", children: t("empty.hint") }),
      filtersActive && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dsv-clear", onClick: clearFilters, children: t("empty.clear") })
    ] });
  })();
  const empty = tab === "active" ? activeRows.length === 0 : tab === "archived" ? archived.length === 0 : trashed.length === 0;
  const confirmCopy = confirm ? CONFIRM_COPY[confirm.kind] : null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-page", "aria-busy": busy || void 0, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "dsv-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-heading", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: "dsv-title", children: t("title") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-subtitle", children: t("subtitle") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-total", "aria-live": "polite", children: t("counts.summary", { n: tabCounts[tab] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-headActions", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-btn",
            "aria-pressed": manage,
            onClick: () => {
              setManage((prev) => !prev);
              setSelected([]);
            },
            children: t(manage ? "manage.done" : "manage.start")
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("nav", { className: "dsv-tabs", role: "tablist", "aria-label": t("title"), children: TABS.map((value) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          role: "tab",
          className: "dsv-tab",
          "aria-selected": tab === value,
          onClick: () => setTab(value),
          children: [
            t(`tab.${value}`),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-tabCount", children: tabCounts[value] })
          ]
        },
        value
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-search", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-searchIcon", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SearchIcon, {}) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              className: "dsv-input",
              type: "search",
              value: query,
              onChange: (event) => setQuery(event.target.value),
              placeholder: t("search.placeholder"),
              "aria-label": t("search.label"),
              spellCheck: false
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-selectWrap", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "select",
            {
              className: "dsv-select",
              value: workspaceId,
              onChange: (event) => setWorkspaceId(event.target.value),
              "aria-label": t("filter.workspace"),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: ALL2, children: t("filter.allWorkspaces") }),
                workspaceOptions.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: workspace.id, children: workspace.label }, workspace.id))
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-chevron", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ChevronDownIcon, {}) })
        ] })
      ] }),
      tab === "active" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-chips", role: "group", "aria-label": t("filter.status"), children: [ALL2, ...STATUS_LIST].map((value) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: "dsv-chip",
          "aria-pressed": status === value,
          onClick: () => setStatus(value),
          children: [
            value !== ALL2 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-dot", "data-status": value, "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: value === ALL2 ? t("counts.all") : t(statusLabelKey(value)) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-chipCount", children: counts[value] ?? 0 })
          ]
        },
        value
      )) }),
      manage && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-batch", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-batchText", children: t("select.count", { n: selected.length }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-btn",
            onClick: () => setSelected(allSelected ? [] : tabIds.filter((id) => !selectedSet.has(id)).concat(selected)),
            children: allSelected ? t("select.clear") : t("select.all")
          }
        ),
        tab === "active" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-btn",
              disabled: selected.length === 0,
              onClick: () => requestConfirm(
                "archive",
                activeRows.filter((row) => selectedSet.has(row.session.id))
              ),
              children: t("batch.archive")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-btn",
              "data-tone": "danger",
              disabled: selected.length === 0,
              onClick: () => requestConfirm(
                "trash",
                activeRows.filter((row) => selectedSet.has(row.session.id))
              ),
              children: t("batch.trash")
            }
          )
        ] }),
        tab === "archived" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-btn",
            disabled: selected.length === 0,
            onClick: () => restoreMany(selected),
            children: t("batch.restore")
          }
        ),
        tab === "trash" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-btn",
              disabled: selected.length === 0,
              onClick: () => restoreFromTrash(selected),
              children: t("batch.restore")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-btn",
              "data-tone": "danger",
              disabled: selected.length === 0,
              onClick: () => {
                const rows = trashed.filter((row) => selectedSet.has(row.session.id));
                requestConfirm("purge", rows);
              },
              children: t("batch.purge")
            }
          )
        ] })
      ] }),
      workspaces?.state === "error" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-banner", children: t("error.workspaces") }),
      empty ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-empty", children: emptyNode }) : sectionList.map(([key, titleKey, rows]) => renderSection(key, titleKey, rows))
    ] }),
    confirm && confirmCopy && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-dialogOverlay", role: "presentation", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "dsv-dialog-title", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "dsv-dialogTitle", id: "dsv-dialog-title", children: t(confirmCopy.title) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-dialogBody", children: t(confirmCopy.body, { n: confirm.ids.length }) }),
      confirmCopy.warning && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsv-dialogWarning", children: t(confirmCopy.warning) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-dialogActions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dsv-btn", onClick: () => setConfirm(null), children: t("confirm.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-btn",
            "data-tone": confirmCopy.tone === "danger" ? "danger" : void 0,
            onClick: runConfirmed,
            children: t("confirm.ok")
          }
        )
      ] })
    ] }) }),
    toast && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-toast", role: "status", "data-tone": toast.tone, children: toast.text })
  ] });
}

// src/client/sidebar-board.jsx
var import_react_dom = require("react-dom");
var import_react2 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
var COLLAPSE_KEY = "dsh-session-view.board.collapsed";
var NARROW_WIDTH = 150;
function readCollapsed() {
  try {
    return globalThis.localStorage?.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(value) {
  try {
    globalThis.localStorage?.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
  }
}
function BoardGroup({ t, labelKey, tone, rows, openSession, pinned, pinnedSet, togglePin }) {
  if (rows.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-boardGroup", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-boardGroupTitle", children: [
      tone && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-dot", "data-status": tone, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t(labelKey) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: rows.length })
    ] }),
    rows.map((row) => {
      const isPinned = pinnedSet?.has(row.session.id) ?? false;
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-boardRow", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "button",
          {
            type: "button",
            className: "dsv-boardOpen",
            onClick: () => openSession(row.session.id),
            title: row.title,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-dot", "data-status": row.status, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-boardRowTitle", children: row.title })
            ]
          }
        ),
        togglePin && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-boardAction",
            "aria-pressed": isPinned,
            "aria-label": t(isPinned ? "action.unpin" : "action.pin"),
            title: t(isPinned ? "action.unpin" : "action.pin"),
            onClick: () => togglePin(row),
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(PinIcon, { size: 11 })
          }
        )
      ] }, row.session.id);
    })
  ] });
}
function SidebarBoardIcon({
  size = 16,
  t,
  useSessions,
  useSessionStatus,
  useWorkspaces,
  openSession,
  openPanel,
  pinSession,
  unpinSession
}) {
  const sessions = useSessions?.((state) => state);
  const statuses = useSessionStatus?.((state) => state);
  const workspaces = useWorkspaces?.((state) => state);
  const anchorRef = (0, import_react2.useRef)(null);
  const [host, setHost] = (0, import_react2.useState)(null);
  const [narrow, setNarrow] = (0, import_react2.useState)(false);
  const [collapsed, setCollapsed] = (0, import_react2.useState)(readCollapsed);
  (0, import_react2.useLayoutEffect)(() => {
    const anchor = anchorRef.current;
    const nav = anchor?.closest?.("nav");
    if (!nav || !nav.parentElement) return void 0;
    const node = document.createElement("div");
    node.className = "dsv-boardHost";
    nav.insertAdjacentElement("afterend", node);
    setHost(node);
    let observer;
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width ?? 0;
        setNarrow(width > 0 && width < NARROW_WIDTH);
      });
      observer.observe(nav.parentElement);
    }
    return () => {
      observer?.disconnect();
      node.remove();
      setHost(null);
    };
  }, []);
  const rows = (0, import_react2.useMemo)(() => {
    if (!sessions || !workspaces) return [];
    const candidates = buildCandidates(sessions, workspaces.archivedSessionIds);
    const built = buildRows(candidates, sessions.byId ?? {}, workspaces);
    return annotateRows(built, statuses);
  }, [sessions, statuses, workspaces]);
  const sections = (0, import_react2.useMemo)(
    () => splitSections(rows, workspaces?.pinnedSessionIds),
    [rows, workspaces?.pinnedSessionIds]
  );
  const pinnedSet = (0, import_react2.useMemo)(
    () => new Set(workspaces?.pinnedSessionIds ?? []),
    [workspaces?.pinnedSessionIds]
  );
  const togglePin = async (row) => {
    const id = row.session.id;
    try {
      await (pinnedSet.has(id) ? unpinSession(id) : pinSession(id));
    } catch {
    }
  };
  const pinned = topRows(sections.pinned, 3);
  const running = topRows(sections.running, 2);
  const pending = topRows(sections.pending, 2);
  const done = topRows(sections.done, 2);
  const total = pinned.length + running.length + pending.length + done.length;
  const toggle = () => {
    setCollapsed((prev) => {
      writeCollapsed(!prev);
      return !prev;
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { ref: anchorRef, className: "dsv-panelIcon", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(SessionViewIcon, { size }) }),
    host && !narrow && (0, import_react_dom.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "div",
        {
          className: "dsv-board",
          onClick: (event) => {
            event.stopPropagation();
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: STYLES }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "button",
              {
                type: "button",
                className: "dsv-boardHead",
                "aria-expanded": !collapsed,
                "aria-label": t(collapsed ? "board.expand" : "board.collapse"),
                onClick: toggle,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "span",
                    {
                      className: "dsv-boardChevron",
                      "data-collapsed": collapsed,
                      "aria-hidden": "true",
                      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ChevronRightIcon, { size: 11 })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-boardTitle", children: t("board.title") }),
                  sections.running.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dsv-boardBadge", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-dot", "data-status": "running", "aria-hidden": "true" }),
                    sections.running.length
                  ] }),
                  sections.pending.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dsv-boardBadge", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-dot", "data-status": "pending", "aria-hidden": "true" }),
                    sections.pending.length
                  ] }),
                  sections.done.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dsv-boardBadge", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-dot", "data-status": "done", "aria-hidden": "true" }),
                    sections.done.length
                  ] })
                ]
              }
            ),
            !collapsed && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsv-boardBody", children: total === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsv-boardEmpty", children: t("board.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  BoardGroup,
                  {
                    t,
                    labelKey: "section.pinned",
                    rows: pinned,
                    openSession,
                    pinned: true,
                    pinnedSet,
                    togglePin
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  BoardGroup,
                  {
                    t,
                    labelKey: "section.running",
                    tone: "running",
                    rows: running,
                    openSession,
                    pinnedSet,
                    togglePin
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  BoardGroup,
                  {
                    t,
                    labelKey: "section.pending",
                    tone: "pending",
                    rows: pending,
                    openSession,
                    pinnedSet,
                    togglePin
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  BoardGroup,
                  {
                    t,
                    labelKey: "section.done",
                    tone: "done",
                    rows: done,
                    openSession,
                    pinnedSet,
                    togglePin
                  }
                )
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dsv-boardMore", onClick: openPanel, children: [
                t("board.more"),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ChevronRightIcon, { size: 11 })
              ] })
            ] })
          ]
        }
      ),
      host
    )
  ] });
}

// src/client/locales.js
var zh = {
  panel: "\u4F1A\u8BDD\u89C6\u56FE",
  title: "\u4F1A\u8BDD\u89C6\u56FE",
  subtitle: "\u6309\u5DE5\u4F5C\u533A\u548C\u72B6\u6001\u6D4F\u89C8\u4F1A\u8BDD\uFF0C\u70B9\u51FB\u5373\u53EF\u5728\u4E3B\u7A97\u53E3\u6253\u5F00\u3002",
  "search.placeholder": "\u641C\u7D22\u4F1A\u8BDD\u3001\u5DE5\u4F5C\u533A\u6216\u8DEF\u5F84",
  "search.label": "\u641C\u7D22\u4F1A\u8BDD",
  "filter.workspace": "\u5DE5\u4F5C\u533A",
  "filter.allWorkspaces": "\u5168\u90E8\u5DE5\u4F5C\u533A",
  "filter.status": "\u72B6\u6001\u7B5B\u9009",
  "counts.all": "\u5168\u90E8",
  "counts.summary": "{n} \u4E2A\u4F1A\u8BDD",
  "status.running": "\u8FD0\u884C\u4E2D",
  "status.pending": "\u5F85\u5904\u7406",
  "status.done": "\u5DF2\u5B8C\u6210",
  "status.idle": "\u7A7A\u95F2",
  "pending.approval": "\u7B49\u5F85\u6279\u51C6",
  "pending.planReview": "\u7B49\u5F85\u65B9\u6848\u5BA1\u6838",
  "pending.question": "\u7B49\u5F85\u56DE\u7B54",
  "pending.generic": "\u7B49\u5F85\u5904\u7406",
  "row.child": "\u5B50\u4F1A\u8BDD",
  "row.orphan": "\u7236\u4F1A\u8BDD\u4E0D\u53EF\u89C1",
  "row.runningChildren": "{n} \u4E2A\u5B50\u4F1A\u8BDD\u8FD0\u884C\u4E2D",
  "row.open": "\u6253\u5F00\u4F1A\u8BDD\uFF1A{title}",
  "row.meta": "{status}\uFF0C{workspace}\uFF0C{time}",
  "empty.title": "\u8FD8\u6CA1\u6709\u53EF\u663E\u793A\u7684\u4F1A\u8BDD",
  "empty.filtered": "\u6CA1\u6709\u5339\u914D\u7684\u4F1A\u8BDD",
  "empty.hint": "\u8C03\u6574\u7B5B\u9009\u6761\u4EF6\uFF0C\u6216\u6362\u4E00\u4E2A\u641C\u7D22\u5173\u952E\u8BCD\u3002",
  "empty.clear": "\u6E05\u9664\u7B5B\u9009",
  "workspace.unknown": "\u672A\u5F52\u5C5E\u5DE5\u4F5C\u533A",
  "time.justNow": "\u521A\u521A",
  "time.minutesAgo": "{n} \u5206\u949F\u524D",
  "time.hoursAgo": "{n} \u5C0F\u65F6\u524D",
  "time.daysAgo": "{n} \u5929\u524D",
  "time.weeksAgo": "{n} \u5468\u524D",
  "time.monthsAgo": "{n} \u4E2A\u6708\u524D",
  "time.yearsAgo": "{n} \u5E74\u524D",
  "time.unknown": "\u65F6\u95F4\u672A\u77E5",
  "error.workspaces": "\u5DE5\u4F5C\u533A\u4FE1\u606F\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u4F1A\u8BDD\u4ECD\u6309\u672C\u5730\u72B6\u6001\u663E\u793A\u3002",
  "error.trash": "\u56DE\u6536\u7AD9\u4FE1\u606F\u6682\u65F6\u4E0D\u53EF\u7528\u3002",
  "tab.active": "\u4F1A\u8BDD",
  "tab.archived": "\u5DF2\u5F52\u6863",
  "tab.trash": "\u56DE\u6536\u7AD9",
  "section.pinned": "\u7F6E\u9876",
  "section.running": "\u8FD0\u884C\u4E2D",
  "section.pending": "\u5F85\u5904\u7406",
  "section.done": "\u5B8C\u6210\u672A\u8BFB",
  "section.idle": "\u5176\u4ED6\u4F1A\u8BDD",
  "section.all": "\u5168\u90E8\u4F1A\u8BDD",
  "section.empty": "\u6682\u65E0\u4F1A\u8BDD",
  "manage.start": "\u7BA1\u7406",
  "manage.done": "\u5B8C\u6210",
  "select.all": "\u5168\u9009",
  "select.clear": "\u53D6\u6D88\u9009\u62E9",
  "select.count": "\u5DF2\u9009 {n} \u9879",
  "action.pin": "\u7F6E\u9876",
  "action.unpin": "\u53D6\u6D88\u7F6E\u9876",
  "action.archive": "\u5F52\u6863",
  "action.trash": "\u79FB\u5230\u56DE\u6536\u7AD9",
  "action.restore": "\u6062\u590D",
  "action.purge": "\u5F7B\u5E95\u5220\u9664",
  "action.open": "\u6253\u5F00",
  "batch.archive": "\u5F52\u6863\u6240\u9009",
  "batch.trash": "\u79FB\u5165\u56DE\u6536\u7AD9",
  "batch.restore": "\u6062\u590D\u6240\u9009",
  "batch.purge": "\u5F7B\u5E95\u5220\u9664\u6240\u9009",
  "confirm.cancel": "\u53D6\u6D88",
  "confirm.ok": "\u786E\u8BA4",
  "confirm.archive.title": "\u5F52\u6863\u4F1A\u8BDD",
  "confirm.archive.body": "\u5C06\u5F52\u6863 {n} \u4E2A\u4F1A\u8BDD\uFF0C\u53EF\u968F\u65F6\u5728\u201C\u5DF2\u5F52\u6863\u201D\u4E2D\u6062\u590D\u3002",
  "confirm.trash.title": "\u79FB\u5230\u56DE\u6536\u7AD9",
  "confirm.trash.body": "\u5C06 {n} \u4E2A\u4F1A\u8BDD\u79FB\u5165\u56DE\u6536\u7AD9\u5E76\u4ECE\u5217\u8868\u9690\u85CF\uFF0C\u53EF\u5728\u56DE\u6536\u7AD9\u4E2D\u6062\u590D\u3002",
  "confirm.purge.title": "\u5F7B\u5E95\u5220\u9664\u4F1A\u8BDD",
  "confirm.purge.body": "\u5C06\u6C38\u4E45\u5220\u9664 {n} \u4E2A\u4F1A\u8BDD\u7684\u65E5\u5FD7\u4E0E\u672C\u5730\u6587\u4EF6\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",
  "confirm.purge.warning": "\u4EC5\u53EF\u5220\u9664\u672A\u8FD0\u884C\u3001\u4E14\u65E5\u5FD7\u76EE\u5F55\u53EF\u5B9A\u4F4D\u7684\u4F1A\u8BDD\u3002",
  "toast.pinned": "\u5DF2\u7F6E\u9876",
  "toast.unpinned": "\u5DF2\u53D6\u6D88\u7F6E\u9876",
  "toast.archived": "\u5DF2\u5F52\u6863 {n} \u4E2A\u4F1A\u8BDD",
  "toast.trashed": "\u5DF2\u79FB\u5165\u56DE\u6536\u7AD9 {n} \u4E2A\u4F1A\u8BDD",
  "toast.restored": "\u5DF2\u6062\u590D {n} \u4E2A\u4F1A\u8BDD",
  "toast.purged": "\u5DF2\u5F7B\u5E95\u5220\u9664 {n} \u4E2A\u4F1A\u8BDD",
  "toast.failed": "\u64CD\u4F5C\u5931\u8D25\uFF1A{message}",
  "toast.partial": "\u5DF2\u5B8C\u6210 {ok} \u4E2A\uFF0C\u5931\u8D25 {failed} \u4E2A",
  "board.title": "\u4F1A\u8BDD",
  "board.more": "\u67E5\u770B\u5168\u90E8",
  "board.collapse": "\u6536\u8D77\u770B\u677F",
  "board.expand": "\u5C55\u5F00\u770B\u677F",
  "board.empty": "\u6CA1\u6709\u8FD0\u884C\u4E2D\u3001\u5F85\u5904\u7406\u6216\u672A\u8BFB\u4F1A\u8BDD",
  "board.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "board.pinBadge": "\u7F6E\u9876",
  "trash.empty": "\u56DE\u6536\u7AD9\u4E3A\u7A7A",
  "trash.deletedAt": "\u5220\u9664\u4E8E {time}",
  "archived.empty": "\u6CA1\u6709\u5DF2\u5F52\u6863\u4F1A\u8BDD",
  "loading": "\u52A0\u8F7D\u4E2D\u2026"
};
var en = {
  panel: "Session view",
  title: "Session view",
  subtitle: "Browse sessions by workspace and state, then open one in the main window.",
  "search.placeholder": "Search sessions, workspaces, or paths",
  "search.label": "Search sessions",
  "filter.workspace": "Workspace",
  "filter.allWorkspaces": "All workspaces",
  "filter.status": "Filter by status",
  "counts.all": "All",
  "counts.summary": "{n} sessions",
  "status.running": "Running",
  "status.pending": "Needs input",
  "status.done": "Done",
  "status.idle": "Idle",
  "pending.approval": "Awaiting approval",
  "pending.planReview": "Awaiting plan review",
  "pending.question": "Awaiting answer",
  "pending.generic": "Awaiting input",
  "row.child": "Sub-session",
  "row.orphan": "Parent hidden",
  "row.runningChildren": "{n} sub-sessions running",
  "row.open": "Open session: {title}",
  "row.meta": "{status}, {workspace}, {time}",
  "empty.title": "No sessions to show yet",
  "empty.filtered": "No matching sessions",
  "empty.hint": "Adjust the filters or try another search term.",
  "empty.clear": "Clear filters",
  "workspace.unknown": "No workspace",
  "time.justNow": "Just now",
  "time.minutesAgo": "{n} min ago",
  "time.hoursAgo": "{n} h ago",
  "time.daysAgo": "{n} d ago",
  "time.weeksAgo": "{n} wk ago",
  "time.monthsAgo": "{n} mo ago",
  "time.yearsAgo": "{n} y ago",
  "time.unknown": "Unknown time",
  "error.workspaces": "Workspace information is unavailable; sessions still use local state.",
  "error.trash": "Trash information is unavailable.",
  "tab.active": "Sessions",
  "tab.archived": "Archived",
  "tab.trash": "Trash",
  "section.pinned": "Pinned",
  "section.running": "Running",
  "section.pending": "Needs input",
  "section.done": "Unread completions",
  "section.idle": "Other sessions",
  "section.all": "All sessions",
  "section.empty": "No sessions",
  "manage.start": "Manage",
  "manage.done": "Done",
  "select.all": "Select all",
  "select.clear": "Clear selection",
  "select.count": "{n} selected",
  "action.pin": "Pin",
  "action.unpin": "Unpin",
  "action.archive": "Archive",
  "action.trash": "Move to trash",
  "action.restore": "Restore",
  "action.purge": "Delete permanently",
  "action.open": "Open",
  "batch.archive": "Archive selected",
  "batch.trash": "Move selected to trash",
  "batch.restore": "Restore selected",
  "batch.purge": "Delete selected permanently",
  "confirm.cancel": "Cancel",
  "confirm.ok": "Confirm",
  "confirm.archive.title": "Archive sessions",
  "confirm.archive.body": "Archive {n} session(s). You can restore them from Archived at any time.",
  "confirm.trash.title": "Move to trash",
  "confirm.trash.body": "Move {n} session(s) to the trash and hide them. You can restore them later.",
  "confirm.purge.title": "Delete sessions permanently",
  "confirm.purge.body": "Permanently delete the logs and local files of {n} session(s). This cannot be undone.",
  "confirm.purge.warning": "Only sessions that are not running and whose log directory can be located are eligible.",
  "toast.pinned": "Pinned",
  "toast.unpinned": "Unpinned",
  "toast.archived": "Archived {n} session(s)",
  "toast.trashed": "Moved {n} session(s) to trash",
  "toast.restored": "Restored {n} session(s)",
  "toast.purged": "Permanently deleted {n} session(s)",
  "toast.failed": "Action failed: {message}",
  "toast.partial": "{ok} succeeded, {failed} failed",
  "board.title": "Sessions",
  "board.more": "View all",
  "board.collapse": "Collapse board",
  "board.expand": "Expand board",
  "board.empty": "No running, waiting, or unread sessions",
  "board.loading": "Loading\u2026",
  "board.pinBadge": "Pinned",
  "trash.empty": "Trash is empty",
  "trash.deletedAt": "Deleted {time}",
  "archived.empty": "No archived sessions",
  "loading": "Loading\u2026"
};

// src/client/index.jsx
var PANEL_ID = "dsh-session-view";
var NS = PANEL_ID;
var inject = ["slots", "locale", "uiWorkspace", "layout"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-session-view: dictionaries");
  const t = ctx.locale.bind(NS);
  ctx.slots.inject(
    "main",
    () => ctx.slots.register(
      {
        name: "main",
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
          openSession: (target) => ctx.uiWorkspace.openSession(target),
          pinSession: (sessionId) => ctx.uiWorkspace.pinSession(sessionId),
          unpinSession: (sessionId) => ctx.uiWorkspace.unpinSession(sessionId),
          archiveSession: (sessionId) => ctx.uiWorkspace.archiveSession(sessionId),
          unarchiveSession: (sessionId) => ctx.uiWorkspace.unarchiveSession(sessionId)
        })
      },
      SessionView
    )
  );
  ctx.slots.inject(
    "sidebar.panellist",
    () => ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 10,
        locale: NS,
        label: () => t("panel"),
        inject: () => ({
          openSession: (target) => ctx.uiWorkspace.openSession(target),
          openPanel: () => ctx.layout.selectPanel(PANEL_ID),
          pinSession: (sessionId) => ctx.uiWorkspace.pinSession(sessionId),
          unpinSession: (sessionId) => ctx.uiWorkspace.unpinSession(sessionId)
        })
      },
      SidebarBoardIcon
    )
  );
}

    return module.exports;
  }
});
