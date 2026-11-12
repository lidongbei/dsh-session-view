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
var import_react5 = require("react");

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
function groupStatus(rows = []) {
  if (rows.some((row) => row.status === "pending")) return "pending";
  if (rows.some((row) => row.status === "running" || row.runningChildren > 0)) return "running";
  if (rows.some((row) => row.status === "done")) return "done";
  return null;
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
    const currentDraft = summary.blank && (summary.retainedBy?.mainView ?? 0) > 0;
    if (summary.blank && !currentDraft) continue;
    if (archivedSet.has(summary.id)) continue;
    if (!listed.has(summary.id) && summary.origin !== "subagent" && !currentDraft) continue;
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
function normalizedPath(value) {
  return String(value ?? "").replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}
function workspaceByPath(workspaces, cwd) {
  const target = normalizedPath(cwd);
  if (!target) return void 0;
  let best;
  let bestLength = -1;
  for (const workspace of workspaces?.items ?? []) {
    const path = normalizedPath(workspace?.path);
    if (!path) continue;
    if (target !== path && !target.startsWith(`${path}/`)) continue;
    if (path.length > bestLength) {
      best = workspace;
      bestLength = path.length;
    }
  }
  return best;
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
    workspace: resolveWorkspace(row.session, index, byId) ?? workspaceByPath(workspaces, row.session.cwd)
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
  if (summary?.blank) return "";
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
function trashRows(items2, byId = {}, workspaces) {
  const latest = /* @__PURE__ */ new Map();
  for (const item of items2 ?? []) {
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
      workspace: resolveWorkspace(summary, /* @__PURE__ */ new Map(), byId) ?? workspaceByPath(workspaces, summary.cwd),
      depth: 0,
      orphan: false,
      status: "idle",
      deletedAt: item.deletedAt ?? 0,
      trashed: true
    };
  }).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}
function errorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error.message === "string" && error.message) return error.message;
  if (typeof error.error === "string" && error.error) return error.error;
  if (error.error && typeof error.error.message === "string" && error.error.message) return error.error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
function isStaleSessionError(error) {
  const text = String(error?.message ?? error?.error?.message ?? error ?? "");
  return /not found|does not exist|no such session|unknown session|missing session|already archived|not archived|already trashed|not in trash|找不到|不存在|已归档|未归档|回收站中不存在/i.test(text);
}
function archivedRows(sessions, archivedIds, workspaces) {
  const byId = sessions?.byId ?? {};
  const index = workspaceIndex(workspaces);
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
      workspace: resolveWorkspace(summary, index, byId) ?? workspaceByPath(workspaces, summary.cwd),
      archived: true
    });
  }
  return rows.sort((a, b) => (b.session.updatedAt ?? 0) - (a.session.updatedAt ?? 0));
}
function topLevelRows(rows) {
  return rows.filter((row) => (row.depth ?? 0) === 0);
}
function activeRows(rows) {
  return topLevelRows(rows).filter(
    (row) => row.status === "running" || row.status === "pending" || row.status === "done" || (row.runningChildren ?? 0) > 0 || row.session.blank === true && (row.session.retainedBy?.mainView ?? 0) > 0
  );
}
function normalizePath(value) {
  return String(value ?? "").replace(/[\\/]+/g, "/").replace(/\/+$/, "").toLowerCase();
}
function isUnder(parentPath, childPath) {
  if (!parentPath || !childPath || parentPath === childPath) return false;
  return childPath.startsWith(`${parentPath}/`);
}
function workspaceTree(workspaces) {
  const items2 = workspaces?.items ?? [];
  const entries = items2.map((workspace, index) => ({
    workspace,
    index,
    path: normalizePath(workspace?.path)
  }));
  const parents = /* @__PURE__ */ new Map();
  const children = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    let parent = null;
    for (const candidate of entries) {
      if (candidate === entry) continue;
      if (!isUnder(candidate.path, entry.path)) continue;
      if (!parent || candidate.path.length > parent.path.length) parent = candidate;
    }
    parents.set(entry.workspace.workspaceId, parent);
    if (parent) {
      const list = children.get(parent.workspace.workspaceId) ?? [];
      list.push(entry);
      children.set(parent.workspace.workspaceId, list);
    }
  }
  const ordered2 = [];
  const visit = (entry, depth) => {
    ordered2.push({ workspace: entry.workspace, depth });
    for (const child of children.get(entry.workspace.workspaceId) ?? []) visit(child, depth + 1);
  };
  for (const entry of entries) {
    if (!parents.get(entry.workspace.workspaceId)) visit(entry, 0);
  }
  for (const entry of entries) {
    if (!ordered2.some((item) => item.workspace === entry.workspace)) visit(entry, 0);
  }
  return ordered2;
}
function groupByWorkspace(rows, workspaces, nest = true) {
  const byId = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = row.workspace?.workspaceId ?? "__none";
    const list = byId.get(key) ?? [];
    list.push(row);
    byId.set(key, list);
  }
  const tree = nest ? workspaceTree(workspaces) : (workspaces?.items ?? []).map((workspace) => ({ workspace, depth: 0 }));
  const groups = tree.map(({ workspace, depth }) => ({
    workspace,
    depth,
    rows: byId.get(workspace.workspaceId) ?? []
  }));
  const ungrouped = byId.get("__none") ?? [];
  if (ungrouped.length > 0) groups.push({ workspace: null, depth: 0, rows: ungrouped });
  const known = new Set(groups.map((group) => group.workspace?.workspaceId ?? "__none"));
  for (const [key, list] of byId) {
    if (known.has(key)) continue;
    groups.push({ workspace: null, depth: 0, rows: list });
  }
  return groups;
}
function moveId(order, dragId, targetId, after = false) {
  const base = Array.isArray(order) ? order.filter((id) => id !== dragId) : [];
  const target = base.indexOf(targetId);
  const index = target < 0 ? base.length : Math.min(base.length, target + (after ? 1 : 0));
  return [...base.slice(0, index), dragId, ...base.slice(index)];
}
function watermarkLimit(rows, base, ceiling = 50) {
  if (!(base > 0)) return 0;
  const top = Array.isArray(rows) ? rows : [];
  const end = Math.min(top.length, ceiling);
  let qualifying = -1;
  for (let index = 0; index < end; index += 1) {
    const row = top[index];
    if (!row) continue;
    if (row.status === "running" || row.status === "pending" || row.status === "done" || (row.runningChildren ?? 0) > 0) {
      qualifying = index;
    }
  }
  return Math.min(Math.max(base, qualifying + 1), ceiling);
}
function flattenWorkspaceGroups(groups = []) {
  const items2 = Array.isArray(groups) ? groups.filter((group) => group && group.id) : [];
  const byId = new Map(items2.map((group) => [group.id, group]));
  const children = /* @__PURE__ */ new Map();
  for (const group of items2) {
    const parentId = group.parentId && byId.has(group.parentId) && group.parentId !== group.id ? group.parentId : null;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(group);
  }
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const walk = (parentId, depth) => {
    for (const group of children.get(parentId) ?? []) {
      if (seen.has(group.id)) continue;
      seen.add(group.id);
      out.push({ ...group, depth });
      walk(group.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const group of items2) {
    if (!seen.has(group.id)) out.push({ ...group, depth: 0 });
  }
  return out;
}
function focusGroupById(prefs, id = prefs?.focusGroupId) {
  if (prefs?.focusEnabled === false) return void 0;
  if (!id) return void 0;
  return (prefs?.focusGroups ?? []).find((group) => group.id === id);
}
function focusWorkspaceIds(prefs) {
  const group = focusGroupById(prefs);
  if (!group) return null;
  return new Set(group.workspaceIds ?? []);
}
function filterRowsByFocus(rows, prefs) {
  const ids2 = focusWorkspaceIds(prefs);
  if (!ids2) return rows;
  return rows.filter((row) => ids2.has(row.workspace?.workspaceId));
}
function restrictWorkspaces(workspaces, prefs) {
  const ids2 = focusWorkspaceIds(prefs);
  if (!ids2) return workspaces;
  return {
    ...workspaces,
    items: (workspaces?.items ?? []).filter((workspace) => ids2.has(workspace.workspaceId))
  };
}
function filterHiddenWorkspaces(workspaces, hiddenWorkspaceIds) {
  const hidden = new Set(
    Array.isArray(hiddenWorkspaceIds) ? hiddenWorkspaceIds.filter((id) => typeof id === "string" && id) : []
  );
  if (hidden.size === 0) return workspaces;
  return {
    ...workspaces,
    items: (workspaces?.items ?? []).filter((workspace) => workspace && !hidden.has(workspace.workspaceId))
  };
}
function filterHiddenRows(rows, hiddenWorkspaceIds) {
  const hidden = new Set(
    Array.isArray(hiddenWorkspaceIds) ? hiddenWorkspaceIds.filter((id) => typeof id === "string" && id) : []
  );
  if (hidden.size === 0) return rows;
  return rows.filter((row) => !hidden.has(row?.workspace?.workspaceId));
}
function focusIncludesPath(prefs, workspaces, cwd) {
  const ids2 = focusWorkspaceIds(prefs);
  if (!ids2) return true;
  const workspace = workspaceByPath(workspaces, cwd);
  return Boolean(workspace) && ids2.has(workspace.workspaceId);
}
function filterRowsByWorkspaceIds(rows, ids2) {
  if (!ids2 || ids2.size === 0) return [];
  return rows.filter((row) => {
    const workspaceId = row.workspace?.workspaceId;
    return typeof workspaceId === "string" && ids2.has(workspaceId);
  });
}
function restrictWorkspacesToIds(workspaces, ids2) {
  if (!ids2 || ids2.size === 0) return { ...workspaces, items: [] };
  return {
    ...workspaces,
    items: (workspaces?.items ?? []).filter((workspace) => workspace && ids2.has(workspace.workspaceId))
  };
}
function renameFocusGroup(prefs, id, name) {
  const groups = prefs?.focusGroups ?? [];
  if (!groups.some((group) => group.id === id)) return {};
  const next = String(name ?? "").trim().slice(0, 60);
  return {
    focusGroups: groups.map((group) => group.id === id ? { ...group, name: next } : group)
  };
}
function removeFocusGroup(prefs, id) {
  const groups = prefs?.focusGroups ?? [];
  if (!groups.some((group) => group.id === id)) return {};
  return {
    focusGroups: groups.filter((group) => group.id !== id),
    focusExpanded: (prefs?.focusExpanded ?? []).filter((entry) => entry !== id),
    ...prefs?.focusGroupId === id ? { focusGroupId: "" } : {}
  };
}
function toggleFocusGroupMember(prefs, id, workspaceId) {
  const groups = prefs?.focusGroups ?? [];
  if (!groups.some((group) => group.id === id)) return {};
  return {
    focusGroups: groups.map((group) => {
      if (group.id !== id) return group;
      const current = group.workspaceIds ?? [];
      const workspaceIds = current.includes(workspaceId) ? current.filter((entry) => entry !== workspaceId) : [...current, workspaceId];
      return { ...group, workspaceIds };
    })
  };
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
function addToTrash(items2) {
  return request("/session-view/trash/add", { method: "POST", body: { items: items2 } });
}
function restoreTrash(sessionIds) {
  return request("/session-view/trash/restore", { method: "POST", body: { sessionIds } });
}
function purgeTrash(sessionIds, force = false) {
  return request("/session-view/trash/purge", { method: "POST", body: { sessionIds, force } });
}

// src/client/session-groups.jsx
var import_react4 = require("react");

// src/client/dialog.jsx
var import_react = require("react");
var import_react_dom = require("react-dom");
var import_jsx_runtime = require("react/jsx-runtime");
function Dialog({ title, children, onClose, footer, wide = false }) {
  (0, import_react.useEffect)(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsv-dialogOverlay", onMouseDown: (event) => event.target === event.currentTarget && onClose(), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `dsv-dialog${wide ? " dsv-dialogWide" : ""}`, role: "dialog", "aria-modal": "true", "aria-labelledby": "dsv-side-dialog-title", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsv-dialogHead", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { id: "dsv-side-dialog-title", children: title }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsv-dialogBody", children }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsv-dialogFoot", children: footer })
    ] }) }),
    document.body
  );
}
function PromptDialog({ t, title, label, initial = "", busy, browse, onSubmit, onClose }) {
  const [value, setValue] = (0, import_react.useState)(initial);
  const [picked, setPicked] = (0, import_react.useState)("");
  const effective = picked || value;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    Dialog,
    {
      title,
      onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsv-btn", onClick: onClose, children: t("dialog.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-btn",
            "data-tone": "primary",
            disabled: busy || !effective.trim(),
            onClick: () => onSubmit(effective.trim()),
            children: t("dialog.save")
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsv-sideField", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsv-sidePathRow", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                autoFocus: true,
                value: effective,
                onChange: (event) => {
                  setPicked("");
                  setValue(event.target.value);
                },
                onKeyDown: (event) => {
                  if (event.key === "Enter" && effective.trim()) onSubmit(effective.trim());
                }
              }
            ),
            browse && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "dsv-btn",
                onClick: async () => {
                  const path = await browse();
                  if (path) setPicked(path);
                },
                children: t("dialog.addWorkspace.browse")
              }
            )
          ] })
        ] }),
        browse && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsv-sideHint", children: t("dialog.addWorkspace.hint") })
      ]
    }
  );
}
function ConfirmDialog({ t, title, body, confirmKey, tone = "danger", busy, onConfirm, onClose }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Dialog,
    {
      title,
      onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsv-btn", onClick: onClose, children: t("dialog.cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsv-btn", "data-tone": tone, disabled: busy, onClick: onConfirm, children: t(confirmKey) })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: body })
    }
  );
}

// src/client/workspace-groups.jsx
var import_react3 = require("react");

// src/client/group-cascade.jsx
var import_react2 = require("react");

// src/client/group-tree.js
var GROUP_ROOT_ORDER = "__groupRoot";
function createWorkspaceGroupId() {
  return `wsg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function groupDisplayName(t, group, index) {
  return group?.name?.trim() || t("group.defaultName", { n: index + 1 });
}
function descendantIds(groups, id) {
  const out = /* @__PURE__ */ new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of groups) {
      if (group.parentId && out.has(group.parentId) && !out.has(group.id)) {
        out.add(group.id);
        changed = true;
      }
    }
  }
  return out;
}
function groupOrderKey(parentId) {
  return parentId ? `__groups:${parentId}` : GROUP_ROOT_ORDER;
}
function idsOf(entries) {
  return entries.map((entry) => entry.id);
}
function ordered(entries, ids2) {
  if (!Array.isArray(ids2) || ids2.length === 0) return entries;
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const out = [];
  for (const id of ids2) {
    const entry = byId.get(id);
    if (entry) {
      out.push(entry);
      byId.delete(id);
    }
  }
  for (const entry of entries) if (byId.has(entry.id)) out.push(entry);
  return out;
}
function childrenOf(groups, parentId) {
  return groups.filter((group) => (group.parentId || null) === (parentId || null));
}
function orderedChildren(groups, orders, parentId) {
  return ordered(childrenOf(groups, parentId), orders?.[groupOrderKey(parentId)]);
}
function moveGroupInTree(groups, orders, dragId, targetId, edge) {
  if (!dragId || !targetId || dragId === targetId) return null;
  const drag = groups.find((group) => group.id === dragId);
  const target = groups.find((group) => group.id === targetId);
  if (!drag || !target) return null;
  const targetParent = target.parentId || null;
  if (targetParent && descendantIds(groups, dragId).has(targetParent)) return null;
  if (edge === "inside" && descendantIds(groups, dragId).has(targetId)) return null;
  const nextParent = edge === "inside" ? targetId : targetParent;
  const nextGroups = groups.map((group) => group.id === dragId ? { ...group, parentId: nextParent } : group);
  const nextOrders = { ...orders || {} };
  for (const key2 of Object.keys(nextOrders)) {
    if (Array.isArray(nextOrders[key2])) nextOrders[key2] = nextOrders[key2].filter((id) => id !== dragId);
  }
  const key = groupOrderKey(nextParent);
  const siblings = (nextOrders[key] ? [...nextOrders[key]] : idsOf(childrenOf(nextGroups, nextParent))).filter((id) => id !== dragId);
  let index = siblings.length;
  if (edge !== "inside") {
    const at = siblings.indexOf(targetId);
    if (at >= 0) index = at + (edge === "after" ? 1 : 0);
  }
  siblings.splice(index, 0, dragId);
  nextOrders[key] = siblings;
  return { groups: nextGroups, orders: nextOrders };
}
function moveWorkspaceToGroup(assignments, orders, workspaceId, groupId, beforeId = null, after = false) {
  const nextAssignments = { ...assignments || {} };
  if (groupId) nextAssignments[workspaceId] = groupId;
  else delete nextAssignments[workspaceId];
  const key = groupId || "__root";
  const nextOrders = { ...orders || {} };
  for (const orderKey of Object.keys(nextOrders)) {
    if (Array.isArray(nextOrders[orderKey])) nextOrders[orderKey] = nextOrders[orderKey].filter((id) => id !== workspaceId);
  }
  const list = nextOrders[key] ? [...nextOrders[key]] : [];
  let index = list.length;
  if (beforeId) {
    const at = list.indexOf(beforeId);
    if (at >= 0) index = at + (after ? 1 : 0);
  }
  list.splice(index, 0, workspaceId);
  nextOrders[key] = list;
  return { assignments: nextAssignments, orders: nextOrders };
}
function buildGroupTree(groups, orders, assignments, workspaces) {
  const items2 = workspaces?.items ?? [];
  const byGroup = /* @__PURE__ */ new Map();
  const ungrouped = [];
  for (const workspace of items2) {
    const groupId = assignments?.[workspace.workspaceId];
    if (groupId && groups.some((group) => group.id === groupId)) {
      if (!byGroup.has(groupId)) byGroup.set(groupId, []);
      byGroup.get(groupId).push(workspace);
    } else {
      ungrouped.push(workspace);
    }
  }
  const groupHasContent = (id) => {
    if ((byGroup.get(id) || []).length > 0) return true;
    return childrenOf(groups, id).some((child) => groupHasContent(child.id));
  };
  const nodes = (parentId, depth) => orderedChildren(groups, orders, parentId).map((group) => ({
    group,
    depth,
    workspaces: ordered(byGroup.get(group.id) || [], orders?.[group.id]),
    children: nodes(group.id, depth + 1),
    empty: !groupHasContent(group.id)
  }));
  return { nodes: nodes(null, 0), ungrouped: ordered(ungrouped, orders?.__root) };
}
function buildCascadeTree(groups = [], excludeIds = []) {
  const blocked = new Set(excludeIds);
  const map = /* @__PURE__ */ new Map();
  const ids2 = new Set(groups.map((group) => group.id));
  for (const group of groups) {
    if (blocked.has(group.id)) continue;
    const parentId = group.parentId && ids2.has(group.parentId) && !blocked.has(group.parentId) ? group.parentId : null;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(group);
  }
  return map;
}

// src/client/group-cascade.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function GroupCascade({ t, groups = [], excludeIds = [], onPick, rootLabel, onRoot }) {
  const [path, setPath] = (0, import_react2.useState)([]);
  const closeTimer = (0, import_react2.useRef)(null);
  const children = (0, import_react2.useMemo)(() => buildCascadeTree(groups, excludeIds), [groups, excludeIds]);
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setPath([]);
    }, 220);
  };
  (0, import_react2.useEffect)(() => cancelClose, []);
  const openChild = (level, group, event) => {
    if (!(children.get(group.id) ?? []).length) {
      setPath((prev) => prev.slice(0, level + 1));
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setPath((prev) => {
      const next = prev.slice(0, level + 1);
      next[level + 1] = { id: group.id, left: rect.right + 2, top: rect.top };
      return next;
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-cascade", onMouseEnter: cancelClose, onMouseLeave: scheduleClose, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "div",
      {
        className: "dsv-menuCascadeItem",
        role: "menuitem",
        onMouseEnter: (event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPath([{ left: rect.right + 2, top: rect.top }]);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("action.moveToGroup") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-menuArrow", "aria-hidden": "true", children: "\u25B8" })
        ]
      }
    ),
    path.map((position, level) => {
      const parentId = path[level]?.id ?? null;
      const items2 = children.get(parentId) ?? [];
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsv-menu dsv-submenu", style: { left: position.left, top: position.top }, children: [
        level === 0 && rootLabel && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
          setPath([]);
          onRoot?.();
        }, children: rootLabel }),
        items2.map((group) => {
          const hasChildren = (children.get(group.id) ?? []).length > 0;
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              role: "menuitem",
              className: hasChildren ? "dsv-menuHasSub" : void 0,
              onMouseEnter: (event) => {
                cancelClose();
                openChild(level, group, event);
              },
              onClick: () => {
                setPath([]);
                onPick?.(group.id);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: group.name }),
                hasChildren && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsv-menuArrow", "aria-hidden": "true", children: "\u25B8" })
              ]
            },
            group.id
          );
        }),
        items2.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsv-menuEmpty", children: t("groups.emptyGroups") })
      ] }, level);
    })
  ] });
}

// src/client/workspace-groups.jsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function TreeRow({
  t,
  node,
  collapsed,
  onToggle,
  dragState,
  setDragState,
  dropState,
  setDropState,
  onDropGroup,
  onAssignWorkspace,
  onDropWorkspace,
  onRename,
  renaming,
  renameValue,
  setRenameValue,
  commitRename,
  cancelRename,
  onAddChild,
  onDelete,
  onMenu,
  onWorkspaceMenu
}) {
  const group = node.group;
  const isCollapsed = collapsed.has(group.id);
  const drop = dropState?.id === group.id ? dropState.edge : null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-treeNode", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "div",
      {
        className: `dsv-treeRow dsv-treeGroup${drop ? ` dsv-treeDrop-${drop}` : ""}`,
        style: { paddingLeft: 8 + node.depth * 16 },
        draggable: !renaming,
        onDragStart: (event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", group.id);
          setDragState({ type: "group", id: group.id });
        },
        onDragEnd: () => {
          setDragState(null);
          setDropState(null);
        },
        onClick: (event) => {
          if (event.target.closest("button, input, select, a, textarea, label")) return;
          onToggle(group.id);
        },
        onDragOver: (event) => {
          if (dragState?.type === "workspace") {
            event.preventDefault();
            setDropState({ id: group.id, edge: "inside" });
            return;
          }
          if (dragState?.type !== "group") return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientY - rect.top) / rect.height;
          const edge = ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
          setDropState({ id: group.id, edge });
        },
        onDragLeave: () => setDropState((current) => current?.id === group.id ? null : current),
        onContextMenu: (event) => {
          event.preventDefault();
          event.stopPropagation();
          onMenu(group, event);
        },
        onDrop: (event) => {
          event.preventDefault();
          if (dragState?.type === "workspace") onAssignWorkspace(group.id);
          else onDropGroup(group.id);
          setDragState(null);
          setDropState(null);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-treeChevron",
              "aria-label": isCollapsed ? t("action.expand") : t("action.collapse"),
              "aria-expanded": !isCollapsed,
              onClick: () => onToggle(group.id),
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { "data-collapsed": isCollapsed, children: "\u25BE" })
            }
          ),
          renaming ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "input",
            {
              className: "dsv-input dsv-treeRename",
              value: renameValue,
              autoFocus: true,
              maxLength: 60,
              onChange: (event) => setRenameValue(event.target.value),
              onBlur: commitRename,
              onKeyDown: (event) => {
                if (event.key === "Enter") commitRename();
                if (event.key === "Escape") cancelRename();
              }
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-treeName", children: groupDisplayName(t, group, node.depth) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-treeMeta", children: node.workspaces.length }),
          !renaming && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dsv-treeActions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", onClick: () => onAddChild(group.id), children: t("group.addChild") }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", onClick: () => onRename(group), children: t("action.rename") }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", "data-tone": "danger", onClick: () => onDelete(group.id), children: t("dialog.delete") })
          ] })
        ]
      }
    ),
    !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-treeChildren", children: [
      node.children.map((child) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        TreeRow,
        {
          t,
          node: child,
          collapsed,
          onToggle,
          dragState,
          setDragState,
          dropState,
          setDropState,
          onDropGroup,
          onAssignWorkspace,
          onDropWorkspace,
          onRename,
          renaming: renaming?.id === child.group.id,
          renameValue,
          setRenameValue,
          commitRename,
          cancelRename,
          onAddChild,
          onDelete,
          onMenu,
          onWorkspaceMenu
        },
        child.group.id
      )),
      node.workspaces.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "div",
        {
          className: `dsv-treeRow dsv-treeWorkspace${dropState?.id === workspace.workspaceId ? ` dsv-treeDrop-${dropState.edge}` : ""}`,
          style: { paddingLeft: 8 + (node.depth + 1) * 16 },
          draggable: true,
          onDragStart: (event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", workspace.workspaceId);
            setDragState({ type: "workspace", id: workspace.workspaceId });
          },
          onDragEnd: () => {
            setDragState(null);
            setDropState(null);
          },
          onContextMenu: (event) => {
            event.preventDefault();
            event.stopPropagation();
            onWorkspaceMenu(workspace, event);
          },
          onDragOver: (event) => {
            if (dragState?.type !== "workspace") return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientY - rect.top) / rect.height;
            setDropState({ id: workspace.workspaceId, edge: ratio < 0.5 ? "before" : "after" });
          },
          onDrop: (event) => {
            event.preventDefault();
            onDropWorkspace(workspace.workspaceId);
            setDragState(null);
            setDropState(null);
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-treeDot", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-treeName", children: workspaceLabel(workspace) }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-treeMeta", children: (workspace.sessionIds || []).length }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { className: "dsv-treePath", children: workspace.path })
          ]
        },
        workspace.workspaceId
      ))
    ] })
  ] });
}
function WorkspaceGroupsDialog({ t, prefs, workspaces, onChange, onClose, embedded = false }) {
  const groups = prefs.workspaceGroups ?? [];
  const orders = prefs.workspaceGroupOrders ?? {};
  const assignments = prefs.workspaceAssignments ?? {};
  const [creating, setCreating] = (0, import_react3.useState)(false);
  const [newName, setNewName] = (0, import_react3.useState)("");
  const [newParent, setNewParent] = (0, import_react3.useState)("");
  const [renaming, setRenaming] = (0, import_react3.useState)(null);
  const [renameValue, setRenameValue] = (0, import_react3.useState)("");
  const [deleting, setDeleting] = (0, import_react3.useState)("");
  const [collapsed, setCollapsed] = (0, import_react3.useState)(() => /* @__PURE__ */ new Set());
  const [filter, setFilter] = (0, import_react3.useState)("");
  const [dragState, setDragState] = (0, import_react3.useState)(null);
  const [dropState, setDropState] = (0, import_react3.useState)(null);
  const [menu, setMenu] = (0, import_react3.useState)(null);
  const tree = (0, import_react3.useMemo)(
    () => buildGroupTree(groups, orders, assignments, workspaces),
    [groups, orders, assignments, workspaces]
  );
  const setGroups = (next) => onChange({ workspaceGroups: next });
  const setOrders = (next) => onChange({ workspaceGroupOrders: next });
  const setAssignments = (next) => onChange({ workspaceAssignments: next });
  const create = () => {
    const name = newName.trim().slice(0, 60);
    if (!name) return;
    const id = createWorkspaceGroupId();
    const parentId = newParent || null;
    const nextGroups = [...groups, { id, name, parentId }];
    const key = groupOrderKey(parentId);
    const nextOrders = { ...orders, [key]: [...orders[key] || [], id] };
    onChange({ workspaceGroups: nextGroups, workspaceGroupOrders: nextOrders });
    setNewName("");
    setCreating(false);
  };
  const commitRename = () => {
    if (!renaming) return;
    const value = renameValue.trim().slice(0, 60);
    setGroups(groups.map((group) => group.id === renaming.id ? { ...group, name: value || group.name } : group));
    setRenaming(null);
  };
  const remove = () => {
    const target = groups.find((group) => group.id === deleting);
    if (!target) return;
    const removed = descendantIds(groups, target.id);
    const nextGroups = groups.filter((group) => !removed.has(group.id)).map((group) => removed.has(group.parentId) ? { ...group, parentId: target.parentId || null } : group);
    const nextAssignments = Object.fromEntries(Object.entries(assignments).filter(([, id]) => !removed.has(id)));
    const nextOrders = Object.fromEntries(Object.entries(orders).map(([key, list]) => [
      key,
      Array.isArray(list) ? list.filter((id) => !removed.has(id)) : list
    ]));
    onChange({ workspaceGroups: nextGroups, workspaceAssignments: nextAssignments, workspaceGroupOrders: nextOrders });
    setDeleting("");
  };
  const dropGroup = (targetId) => {
    if (dragState?.type !== "group" || !dropState) return;
    const result = moveGroupInTree(groups, orders, dragState.id, targetId, dropState.edge);
    if (result) onChange({ workspaceGroups: result.groups, workspaceGroupOrders: result.orders });
  };
  const assignWorkspaceToGroup = (groupId) => {
    if (dragState?.type !== "workspace") return;
    const result = moveWorkspaceToGroup(assignments, orders, dragState.id, groupId, null, false);
    onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
  };
  const dropWorkspace = (targetWorkspaceId) => {
    if (dragState?.type !== "workspace" || !dropState) return;
    const target = (workspaces?.items ?? []).find((workspace) => workspace.workspaceId === targetWorkspaceId);
    const groupId = target ? assignments[target.workspaceId] || null : null;
    const result = moveWorkspaceToGroup(assignments, orders, dragState.id, groupId, targetWorkspaceId, dropState.edge === "after");
    onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
  };
  const moveGroupToRoot = (groupId) => {
    const nextGroups = groups.map((group) => group.id === groupId ? { ...group, parentId: null } : group);
    const rootKey = groupOrderKey(null);
    const nextOrders = { ...orders };
    for (const key of Object.keys(nextOrders)) {
      if (Array.isArray(nextOrders[key])) nextOrders[key] = nextOrders[key].filter((id) => id !== groupId);
    }
    nextOrders[rootKey] = [...nextOrders[rootKey] || [], groupId];
    onChange({ workspaceGroups: nextGroups, workspaceGroupOrders: nextOrders });
  };
  const openMenu = (kind, id, event) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ kind, id, x: Math.min(event.clientX, window.innerWidth - 200), y: Math.min(event.clientY, window.innerHeight - 220) });
  };
  (0, import_react3.useEffect)(() => {
    if (!menu) return void 0;
    const close = () => setMenu(null);
    const onKey = (event) => {
      if (event.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);
  const toggle = (id) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const query = filter.trim().toLowerCase();
  const matches = (value) => !query || String(value || "").toLowerCase().includes(query);
  const filteredNodes = (0, import_react3.useMemo)(() => {
    if (!query) return tree.nodes;
    const filterNodes = (nodes) => nodes.map((node) => {
      const children = filterNodes(node.children);
      const workspaces2 = node.workspaces.filter((workspace) => matches(workspaceLabel(workspace)) || matches(workspace.path));
      if (children.length || workspaces2.length || matches(groupDisplayName(t, node.group, node.depth))) {
        return { ...node, children, workspaces: workspaces2 };
      }
      return null;
    }).filter(Boolean);
    return filterNodes(tree.nodes);
  }, [tree.nodes, query]);
  const body = /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsv-sideHint dsv-groupIntro", children: t("group.manage.hint") }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-groupToolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-focusListTitle", children: t("group.count", { n: groups.length }) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-groupToolbarActions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", onClick: () => setCollapsed(new Set((groups ?? []).map((group) => group.id))), children: t("action.collapseAll") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", onClick: () => setCollapsed(/* @__PURE__ */ new Set()), children: t("action.expandAll") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", "data-tone": creating ? void 0 : "primary", onClick: () => setCreating((value) => !value), children: creating ? t("dialog.cancel") : t("group.new") })
      ] })
    ] }),
    creating && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-groupCreate", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          autoFocus: true,
          className: "dsv-input",
          maxLength: 60,
          placeholder: t("group.namePlaceholder"),
          value: newName,
          onChange: (event) => setNewName(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter") create();
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dsv-groupParentField", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("group.parent") }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { className: "dsv-select", value: newParent, onChange: (event) => setNewParent(event.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "", children: t("group.parentNone") }),
          groups.map((group, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: group.id, children: groupDisplayName(t, group, index) }, group.id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsv-groupCreateFoot", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", "data-tone": "primary", disabled: !newName.trim(), onClick: create, children: t("dialog.save") }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "input",
      {
        className: "dsv-input dsv-groupSearch",
        type: "search",
        value: filter,
        placeholder: t("group.searchAll"),
        onChange: (event) => setFilter(event.target.value)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsv-tree", children: [
      filteredNodes.map((node) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        TreeRow,
        {
          t,
          node,
          collapsed,
          onToggle: toggle,
          dragState,
          setDragState,
          dropState,
          setDropState,
          onDropGroup: dropGroup,
          onAssignWorkspace: assignWorkspaceToGroup,
          onDropWorkspace: dropWorkspace,
          onRename: (group) => {
            setRenaming(group);
            setRenameValue(group.name || "");
          },
          renaming: renaming?.id === node.group.id ? renaming : null,
          renameValue,
          setRenameValue,
          commitRename,
          cancelRename: () => setRenaming(null),
          onAddChild: (id) => {
            setCreating(true);
            setNewParent(id);
          },
          onDelete: (id) => setDeleting(id),
          onMenu: (group, event) => openMenu("group", group.id, event),
          onWorkspaceMenu: (workspace, event) => openMenu("workspace", workspace.workspaceId, event)
        },
        node.group.id
      )),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "div",
        {
          className: `dsv-treeChildren dsv-treeRoot${dropState?.id === "__root" ? " dsv-treeDropInside" : ""}`,
          onDragOver: (event) => {
            if (dragState?.type !== "workspace") return;
            event.preventDefault();
            setDropState({ id: "__root", edge: "inside" });
          },
          onDrop: (event) => {
            if (dragState?.type !== "workspace") return;
            event.preventDefault();
            const result = moveWorkspaceToGroup(assignments, orders, dragState.id, null);
            onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
            setDragState(null);
            setDropState(null);
          },
          children: [
            tree.ungrouped.filter((workspace) => matches(workspaceLabel(workspace)) || matches(workspace.path)).map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "div",
              {
                className: `dsv-treeRow dsv-treeWorkspace dsv-treeUngrouped${dropState?.id === workspace.workspaceId ? ` dsv-treeDrop-${dropState.edge}` : ""}`,
                style: { paddingLeft: 8 },
                draggable: true,
                onDragStart: (event) => {
                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", workspace.workspaceId);
                  setDragState({ type: "workspace", id: workspace.workspaceId });
                },
                onDragEnd: () => {
                  setDragState(null);
                  setDropState(null);
                },
                onContextMenu: (event) => openMenu("workspace", workspace.workspaceId, event),
                onDragOver: (event) => {
                  if (dragState?.type !== "workspace") return;
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = (event.clientY - rect.top) / rect.height;
                  setDropState({ id: workspace.workspaceId, edge: ratio < 0.5 ? "before" : "after" });
                },
                onDrop: (event) => {
                  event.preventDefault();
                  if (dragState?.type !== "workspace") return;
                  const result = moveWorkspaceToGroup(assignments, orders, dragState.id, null, workspace.workspaceId, dropState?.edge === "after");
                  onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
                  setDragState(null);
                  setDropState(null);
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-treeDot", "aria-hidden": "true" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-treeName", children: workspaceLabel(workspace) }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-treeMeta", children: (workspace.sessionIds || []).length }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { className: "dsv-treePath", children: workspace.path })
                ]
              },
              workspace.workspaceId
            )),
            tree.ungrouped.length === 0 && filteredNodes.length === 0 && !query && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsv-sideEmpty", children: t("group.emptyList") })
          ]
        }
      )
    ] }),
    menu && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        className: "dsv-menu dsv-contextMenu",
        role: "menu",
        style: { left: menu.x, top: menu.y },
        onPointerDown: (event) => event.stopPropagation(),
        children: menu.kind === "group" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            GroupCascade,
            {
              t,
              groups,
              excludeIds: [menu.id, ...descendantIds(groups, menu.id)],
              onPick: (groupId) => {
                const result = moveGroupInTree(groups, orders, menu.id, groupId, "inside");
                if (result) onChange({ workspaceGroups: result.groups, workspaceGroupOrders: result.orders });
                setMenu(null);
              },
              rootLabel: groups.find((group) => group.id === menu.id)?.parentId ? t("action.moveToRoot") : void 0,
              onRoot: () => {
                moveGroupToRoot(menu.id);
                setMenu(null);
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsv-menuDivider", role: "separator" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
            setCreating(true);
            setNewParent(menu.id);
            setMenu(null);
          }, children: t("group.addChild") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
            const target = groups.find((group) => group.id === menu.id);
            if (target) {
              setRenaming(target);
              setRenameValue(target.name || "");
            }
            setMenu(null);
          }, children: t("action.rename") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", role: "menuitem", className: "dsv-danger", onClick: () => {
            setDeleting(menu.id);
            setMenu(null);
          }, children: t("dialog.delete") })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          GroupCascade,
          {
            t,
            groups,
            onPick: (groupId) => {
              const result = moveWorkspaceToGroup(assignments, orders, menu.id, groupId, null, false);
              onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
              setMenu(null);
            },
            rootLabel: assignments[menu.id] ? t("action.removeFromGroup") : void 0,
            onRoot: () => {
              const result = moveWorkspaceToGroup(assignments, orders, menu.id, null);
              onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
              setMenu(null);
            }
          }
        )
      }
    ),
    deleting && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      ConfirmDialog,
      {
        t,
        title: t("group.delete.title"),
        body: t("group.delete.body", { name: groupDisplayName(t, groups.find((group) => group.id === deleting), 0) }),
        confirmKey: "dialog.delete",
        onConfirm: remove,
        onClose: () => setDeleting("")
      }
    )
  ] });
  if (embedded) return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsv-groupEmbedded", children: body });
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    Dialog,
    {
      wide: true,
      title: t("group.manage.title"),
      onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dsv-btn", "data-tone": "primary", onClick: onClose, children: t("focus.done") }),
      children: body
    }
  );
}

// src/client/session-groups.jsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function createSessionGroupId() {
  return `ssg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function descendantIds2(groups, id) {
  const out = /* @__PURE__ */ new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of groups) {
      if (group.parentId && out.has(group.parentId) && !out.has(group.id)) {
        out.add(group.id);
        changed = true;
      }
    }
  }
  return out;
}
function SessionGroupsDialog({ t, prefs, sessions = [], onChange, onClose }) {
  const groups = prefs.sessionGroups ?? [];
  const flattened = flattenWorkspaceGroups(groups);
  const assignments = prefs.sessionAssignments ?? {};
  const [creating, setCreating] = (0, import_react4.useState)(false);
  const [newName, setNewName] = (0, import_react4.useState)("");
  const [newParent, setNewParent] = (0, import_react4.useState)("");
  const [renamingId, setRenamingId] = (0, import_react4.useState)("");
  const [renameValue, setRenameValue] = (0, import_react4.useState)("");
  const [editingId, setEditingId] = (0, import_react4.useState)("");
  const [deleteId, setDeleteId] = (0, import_react4.useState)("");
  const [filter, setFilter] = (0, import_react4.useState)("");
  const [memberFilter, setMemberFilter] = (0, import_react4.useState)("");
  const setGroups = (next) => onChange({ sessionGroups: next });
  const create = () => {
    const name = newName.trim().slice(0, 60);
    if (!name) return;
    setGroups([...groups, { id: createSessionGroupId(), name, parentId: newParent || null }]);
    setNewName("");
    setNewParent("");
    setCreating(false);
  };
  const commitRename = () => {
    if (!renamingId) return;
    const name = renameValue.trim().slice(0, 60);
    setGroups(groups.map((group) => group.id === renamingId ? { ...group, name } : group));
    setRenamingId("");
    setRenameValue("");
  };
  const remove = () => {
    const target = groups.find((group) => group.id === deleteId);
    if (!target) return;
    const removed = descendantIds2(groups, target.id);
    const nextGroups = groups.filter((group) => !removed.has(group.id)).map((group) => group.parentId && removed.has(group.parentId) ? { ...group, parentId: target.parentId ?? null } : group);
    const nextAssignments = {};
    for (const [sessionId, groupId] of Object.entries(assignments)) {
      if (!removed.has(groupId)) nextAssignments[sessionId] = groupId;
    }
    onChange({ sessionGroups: nextGroups, sessionAssignments: nextAssignments });
    if (editingId && removed.has(editingId)) setEditingId("");
    setDeleteId("");
  };
  const moveSession = (group, sessionId) => {
    const next = { ...assignments };
    if (next[sessionId] === group.id) delete next[sessionId];
    else next[sessionId] = group.id;
    onChange({ sessionAssignments: next });
  };
  const membersOf = (groupId) => sessions.filter((session) => assignments[session.id] === groupId);
  const deleting = groups.find((group) => group.id === deleteId);
  const query = filter.trim().toLowerCase();
  const memberQuery = memberFilter.trim().toLowerCase();
  const visibleSessions = memberQuery ? sessions.filter((session) => `${session.title} ${session.workspace ?? ""}`.toLowerCase().includes(memberQuery)) : sessions;
  const visibleFlattened = flattened.filter((group, index) => !query || groupDisplayName(t, group, index).toLowerCase().includes(query) || membersOf(group.id).some((session) => `${session.title} ${session.workspace ?? ""}`.toLowerCase().includes(query)));
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    Dialog,
    {
      wide: true,
      title: t("group.manage.session.title"),
      onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dsv-btn", "data-tone": "primary", onClick: onClose, children: t("focus.done") }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dsv-sideHint dsv-groupIntro", children: t("group.manage.session.hint") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dsv-groupToolbar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dsv-focusListTitle", children: t("group.count", { n: groups.length }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-btn dsv-btnSm",
              "data-tone": creating ? void 0 : "primary",
              onClick: () => setCreating((value) => !value),
              children: creating ? t("dialog.cancel") : t("group.new")
            }
          )
        ] }),
        creating && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dsv-groupCreate", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "input",
            {
              autoFocus: true,
              className: "dsv-input",
              maxLength: 60,
              placeholder: t("group.namePlaceholder"),
              value: newName,
              onChange: (event) => setNewName(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter") create();
                if (event.key === "Escape") setCreating(false);
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dsv-groupParentField", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("group.parent") }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("select", { className: "dsv-select", value: newParent, onChange: (event) => setNewParent(event.target.value), children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "", children: t("group.parentNone") }),
              flattened.map((group, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: group.id, children: `${"\u2014".repeat(group.depth)} ${groupDisplayName(t, group, index)}`.trim() }, group.id))
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dsv-groupCreateFoot", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", "data-tone": "primary", disabled: !newName.trim(), onClick: create, children: t("group.create") }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "input",
          {
            className: "dsv-input dsv-groupSearch",
            placeholder: t("group.searchAll"),
            "aria-label": t("group.searchAll"),
            value: filter,
            onChange: (event) => setFilter(event.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dsv-groupList", children: [
          visibleFlattened.map((group) => {
            const index = flattened.findIndex((entry) => entry.id === group.id);
            const members = membersOf(group.id);
            return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("article", { className: "dsv-groupCard", style: { marginLeft: group.depth * 16 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dsv-groupCardHead", children: [
                renamingId === group.id ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dsv-focusRename", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                    "input",
                    {
                      autoFocus: true,
                      className: "dsv-input",
                      maxLength: 60,
                      value: renameValue,
                      onChange: (event) => setRenameValue(event.target.value),
                      onKeyDown: (event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") setRenamingId("");
                      }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", "data-tone": "primary", onClick: commitRename, children: t("dialog.save") })
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dsv-groupCardName", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dsv-groupDepth", "aria-hidden": "true", children: group.depth > 0 ? "\u21B3" : "" }),
                  groupDisplayName(t, group, index)
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dsv-groupMeta", children: t("group.memberCount", { n: members.length }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dsv-groupChips", children: [
                members.slice(0, 4).map((session) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dsv-focusChip", children: session.title }, session.id)),
                members.length > 4 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dsv-focusChip", "data-more": "true", children: [
                  "+",
                  members.length - 4
                ] }),
                members.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dsv-focusChipEmpty", children: t("group.empty") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dsv-groupCardActions", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", onClick: () => {
                  setEditingId(editingId === group.id ? "" : group.id);
                }, children: t("group.members.sessions") }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", onClick: () => {
                  setCreating(true);
                  setNewParent(group.id);
                }, children: t("group.addChild") }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", onClick: () => {
                  setRenamingId(group.id);
                  setRenameValue(group.name);
                }, children: t("action.rename") }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", "data-tone": "danger", onClick: () => setDeleteId(group.id), children: t("dialog.delete") })
              ] }),
              editingId === group.id && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dsv-groupMembers", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "input",
                  {
                    className: "dsv-input dsv-groupMemberFilter",
                    placeholder: t("group.sessionFilter"),
                    value: memberFilter,
                    onChange: (event) => setMemberFilter(event.target.value)
                  }
                ),
                sessions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dsv-sideHint", children: t("group.noSessions") }) : visibleSessions.map((session) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dsv-sideCheck", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                    "input",
                    {
                      type: "checkbox",
                      checked: assignments[session.id] === group.id,
                      onChange: () => moveSession(group, session.id)
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
                    session.title,
                    session.workspace ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("em", { className: "dsv-groupMemberMeta", children: session.workspace }) : null
                  ] })
                ] }, session.id))
              ] })
            ] }, group.id);
          }),
          visibleFlattened.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dsv-sideEmpty", children: t("group.emptyList") })
        ] }),
        deleting && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          ConfirmDialog,
          {
            t,
            title: t("group.delete.title"),
            body: t("group.delete.body", { name: groupDisplayName(t, deleting, flattened.findIndex((entry) => entry.id === deleting.id)) }),
            confirmKey: "dialog.delete",
            onConfirm: remove,
            onClose: () => setDeleteId("")
          }
        )
      ]
    }
  );
}

// src/client/prefs.js
var KEY = "dsh-session-view.prefs.v1";
var DEFAULT_PREFS = Object.freeze({
  mode: "session",
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
  glowRunning: "off",
  glowPending: "off",
  glowDone: "off",
  archivedFilter: "hide",
  sort: "updated",
  nestWorkspaces: true,
  /**
   * How the "工作区会话" section arranges rows:
   * - default: one flat section per workspace in registry order
   * - nested: path-based workspace tree
   * - session: user-managed multi-level session groups
   * - workspace: user-managed multi-level workspace groups
   */
  workspaceGroupMode: "nested",
  workspaceGroups: Object.freeze([]),
  /** workspaceId -> workspace group id; a workspace belongs to at most one group. */
  workspaceAssignments: Object.freeze({}),
  workspaceGroupOrders: Object.freeze({}),
  sessionGroupOrders: Object.freeze({}),
  sessionGroups: Object.freeze([]),
  /** sessionId -> session group id; a session belongs to at most one group. */
  sessionAssignments: Object.freeze({}),
  manualOrder: Object.freeze({}),
  collapsedGroups: Object.freeze([]),
  focusGroups: Object.freeze([]),
  focusGroupId: "",
  focusExpanded: Object.freeze([]),
  focusEnabled: true,
  /**
   * Workspaces the user explicitly hid from the left session view. Storing the
   * hidden ids (instead of a visible allow-list) keeps every newly added
   * workspace visible by default.
   */
  hiddenWorkspaceIds: Object.freeze([])
});
var MODES = /* @__PURE__ */ new Set(["session", "native"]);
var ARCHIVED = /* @__PURE__ */ new Set(["hide", "show", "only"]);
var SORTS = /* @__PURE__ */ new Set(["updated", "manual"]);
var GROUP_MODES = /* @__PURE__ */ new Set(["default", "nested", "workspace"]);
function sanitizeWorkspaceGroups(input) {
  if (!Array.isArray(input)) return [];
  const seen = /* @__PURE__ */ new Set();
  const groups = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const id = typeof entry.id === "string" ? entry.id.trim().slice(0, 80) : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof entry.name === "string" ? entry.name.trim().slice(0, 60) : "";
    const parentId = typeof entry.parentId === "string" && entry.parentId ? entry.parentId : null;
    groups.push({ id, name, parentId });
  }
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
function sanitizeOrders(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [key, list] of Object.entries(value)) {
    if (typeof key !== "string" || !key || !Array.isArray(list)) continue;
    const ids2 = [...new Set(list.filter((id) => typeof id === "string" && id))];
    if (ids2.length > 0) out[key] = ids2;
  }
  return out;
}
function sanitizeAssignments(input, groups) {
  if (!input || typeof input !== "object") return {};
  const ids2 = new Set(groups.map((group) => group.id));
  const out = {};
  for (const [workspaceId, groupId] of Object.entries(input)) {
    if (!workspaceId || !ids2.has(groupId)) continue;
    out[workspaceId] = groupId;
  }
  return out;
}
var GLOWS = /* @__PURE__ */ new Set(["off", "marquee", "aurora", "pulse", "rainbow", "comet", "scan", "dash"]);
function sanitizeFocusGroups(input) {
  if (!Array.isArray(input)) return [];
  const seen = /* @__PURE__ */ new Set();
  const groups = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const id = typeof entry.id === "string" ? entry.id.trim().slice(0, 80) : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof entry.name === "string" ? entry.name.trim().slice(0, 60) : "";
    const workspaceIds = Array.isArray(entry.workspaceIds) ? [...new Set(entry.workspaceIds.filter((workspaceId) => typeof workspaceId === "string" && workspaceId))] : [];
    groups.push({ id, name, workspaceIds });
  }
  return groups;
}
function sanitize(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const clampLimit = (input, fallback) => {
    const n = Number(input);
    return Number.isFinite(n) && n >= 0 && n <= 50 ? Math.round(n) : fallback;
  };
  const manualOrder = {};
  if (value.manualOrder && typeof value.manualOrder === "object") {
    for (const [key, ids2] of Object.entries(value.manualOrder)) {
      if (!Array.isArray(ids2)) continue;
      manualOrder[key] = ids2.filter((id) => typeof id === "string");
    }
  }
  const collapsedGroups = Array.isArray(value.collapsedGroups) ? value.collapsedGroups.filter((key) => typeof key === "string") : [];
  const focusGroups = sanitizeFocusGroups(value.focusGroups);
  const focusGroupId = focusGroups.some((group) => group.id === value.focusGroupId) ? value.focusGroupId : "";
  const focusExpanded = Array.isArray(value.focusExpanded) ? [...new Set(value.focusExpanded.filter((id) => typeof id === "string" && focusGroups.some((group) => group.id === id)))] : [];
  const hiddenWorkspaceIds = Array.isArray(value.hiddenWorkspaceIds) ? [...new Set(value.hiddenWorkspaceIds.filter((id) => typeof id === "string" && id))] : [];
  const workspaceGroups = sanitizeWorkspaceGroups(value.workspaceGroups);
  const workspaceAssignments = sanitizeAssignments(value.workspaceAssignments, workspaceGroups);
  const sessionGroups = sanitizeWorkspaceGroups(value.sessionGroups);
  const sessionAssignments = sanitizeAssignments(value.sessionAssignments, sessionGroups);
  const rawGroupMode = value.workspaceGroupMode === "custom" ? "workspace" : value.workspaceGroupMode === "session" ? "nested" : value.workspaceGroupMode;
  const workspaceGroupMode = GROUP_MODES.has(rawGroupMode) ? rawGroupMode : value.nestWorkspaces === false ? "default" : DEFAULT_PREFS.workspaceGroupMode;
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
    glowRunning: GLOWS.has(value.glowRunning) ? value.glowRunning : GLOWS.has(value.glowEffect) ? value.glowEffect : "off",
    glowPending: GLOWS.has(value.glowPending) ? value.glowPending : GLOWS.has(value.glowEffect) ? value.glowEffect : "off",
    glowDone: GLOWS.has(value.glowDone) ? value.glowDone : GLOWS.has(value.glowEffect) ? value.glowEffect : "off",
    sort: SORTS.has(value.sort) ? value.sort : DEFAULT_PREFS.sort,
    nestWorkspaces: workspaceGroupMode === "nested",
    workspaceGroupMode,
    workspaceGroups,
    workspaceAssignments,
    workspaceGroupOrders: sanitizeOrders(value.workspaceGroupOrders),
    sessionGroups,
    sessionAssignments,
    sessionGroupOrders: sanitizeOrders(value.sessionGroupOrders),
    manualOrder,
    collapsedGroups,
    focusGroups,
    focusGroupId,
    focusExpanded,
    focusEnabled: value.focusEnabled !== false,
    hiddenWorkspaceIds
  };
}
function fresh() {
  return {
    ...DEFAULT_PREFS,
    manualOrder: {},
    collapsedGroups: [],
    focusGroups: [],
    focusGroupId: "",
    focusExpanded: [],
    focusEnabled: true,
    hiddenWorkspaceIds: [],
    workspaceGroups: [],
    workspaceAssignments: {},
    workspaceGroupOrders: {},
    sessionGroupOrders: {},
    sessionGroups: [],
    sessionAssignments: {}
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
var state = load();
var listeners = /* @__PURE__ */ new Set();
function getPrefs() {
  return state;
}
function setPrefs(patch) {
  state = sanitize({ ...state, ...patch });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
  } catch {
  }
  for (const listener of listeners) listener();
}
function resetPrefs() {
  state = fresh();
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
  }
  for (const listener of listeners) listener();
}
function subscribePrefs(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// src/client/panel-intent.js
var pending = null;
var listeners2 = /* @__PURE__ */ new Set();
function requestPanelIntent(intent) {
  pending = intent;
  for (const listener of listeners2) listener();
}
function consumePanelIntent() {
  const current = pending;
  pending = null;
  return current;
}
function getPanelIntent() {
  return pending;
}
function subscribePanelIntent(listener) {
  listeners2.add(listener);
  return () => listeners2.delete(listener);
}

// src/client/trash-store.js
var ids = /* @__PURE__ */ new Set();
var items = [];
var listeners3 = /* @__PURE__ */ new Set();
var inflight;
function emit() {
  listeners3.forEach((listener) => listener());
}
function sameIds(next) {
  if (next.size !== ids.size) return false;
  for (const id of next) if (!ids.has(id)) return false;
  return true;
}
function subscribeTrash(listener) {
  listeners3.add(listener);
  return () => listeners3.delete(listener);
}
function getTrashIds() {
  return ids;
}
function setTrashItems(nextItems) {
  items = Array.isArray(nextItems) ? nextItems : [];
  const next = new Set(items.map((item) => item.sessionId).filter(Boolean));
  if (sameIds(next)) return;
  ids = next;
  emit();
}
function addTrashIds(list) {
  const add = list.filter(Boolean).filter((id) => !ids.has(id));
  if (add.length === 0) return;
  ids = /* @__PURE__ */ new Set([...ids, ...add]);
  emit();
}
function removeTrashIds(list) {
  const remove = list.filter(Boolean).filter((id) => ids.has(id));
  if (remove.length === 0) return;
  const next = new Set(ids);
  remove.forEach((id) => next.delete(id));
  ids = next;
  items = items.filter((item) => next.has(item.sessionId));
  emit();
}
function refreshTrash() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const data = await fetchTrash();
      setTrashItems(data?.items);
      return data;
    } finally {
      inflight = void 0;
    }
  })();
  return inflight;
}

// src/client/styles.js
var STYLES = `
.dsv-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
}
.dsv-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
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
  font-size: 13px;
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
  font-size: 13px;
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
  position: relative;
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--dsw-alias-state-idle-primary);
}
.dsv-dot[data-status="running"] { background: var(--dsw-alias-state-business-primary); }
.dsv-dot[data-status="running"]::after {
  content: "";
  position: absolute;
  inset: -3px;
  border: 1px solid var(--dsw-alias-state-business-primary);
  border-radius: 50%;
  animation: dsv-dotPulse 1.6s ease-out infinite;
}
@keyframes dsv-dotPulse {
  0% { transform: scale(0.7); opacity: 0.75; }
  70% { transform: scale(1.6); opacity: 0; }
  100% { transform: scale(1.6); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .dsv-dot[data-status="running"]::after { animation: none; opacity: 0; }
}
.dsv-dot[data-status="pending"] { background: var(--dsw-alias-state-warn-primary); }
.dsv-dot[data-status="done"] { background: var(--dsw-alias-state-success-primary); }
.dsv-banner {
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
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
  gap: 6px;
  width: 100%;
  min-height: 34px;
  padding: 3px 10px 3px calc(10px + var(--dsv-depth, 0) * 16px);
  border: 0;
  border-radius: 8px;
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
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.dsv-rowTitle {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsv-rowMeta {
  display: flex;
  flex: none;
  align-items: center;
  gap: 5px;
  max-width: 46%;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-metaText {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-workspace { max-width: 160px; }
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
  font-size: 13px;
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
  font-size: 13px;
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
.dsv-toolbarActions { display: flex; align-items: center; gap: 8px; margin-left: auto; flex: none; }
.dsv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.dsv-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-btn[data-tone="primary"] {
  background: var(--dsw-alias-state-business-primary);
  border-color: transparent;
  color: #fff;
}
.dsv-btn[data-tone="primary"]:hover {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 86%, #000);
  color: #fff;
}
.dsv-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-alias-focus-ring-color); }
.dsv-btn[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
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
  font-size: 13px;
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
.dsv-batchText { font-size: 13px; color: var(--dsw-alias-label-secondary); margin-right: auto; }
.dsv-section { margin-top: 14px; }
.dsv-sectionHead {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 22px;
  padding: 0 4px 2px;
}
.dsv-sectionToggle {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dsv-sectionChevron { display: inline-flex; color: var(--dsw-alias-label-tertiary); transition: transform 0.15s ease; }
.dsv-sectionChevron[data-collapsed="true"] { transform: rotate(-90deg); }
.dsv-sectionTitle {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--dsw-alias-label-secondary);
}
.dsv-sectionCount {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.dsv-sectionSelect {
  margin-left: auto;
  border: 0;
  padding: 2px 6px;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dsv-sectionSelect:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
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
  width: 28px;
  height: 28px;
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
.dsv-dialogOverlay,
.dsv-dialogOverlay *,
.dsv-dialogOverlay *::before,
.dsv-dialogOverlay *::after { box-sizing: border-box; }
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
  font-size: 13px;
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
  font-size: 13px;
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
  font-size: 13px;
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
  font-size: 13px;
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

/* Sidebar takeover pane */
.dsv-boardHost {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  margin: 0;
}
.dsv-boardHost[hidden] { display: none; }
.dsv-boardHost--inline .dsv-side { margin-right: 0; }
.dsv-workarea {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--dsw-alias-specific-sidebar-fill, var(--dsw-alias-bg-base));
}
.dsv-side {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  height: auto;
  max-height: none;
  margin-left: -4px;
  margin-right: calc(-1 * var(--dsh-sidebar-inline-padding, 12px));
  padding-left: 4px;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
}
.dsv-side * { box-sizing: border-box; }
.dsv-sideHead { position: relative; display: flex; flex: none; align-items: center; height: 36px; padding: 0 4px 0 0; }
.dsv-sideTitleRow { display: flex; align-items: center; gap: 4px; width: 100%; min-width: 0; }
.dsv-sideTitle {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-sideHeadActions { display: flex; flex: none; align-items: center; gap: 2px; }
.dsv-sideIconBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.dsv-sideIconBtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-sideIconBtn[aria-pressed="true"] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-sideSearch {
  display: flex;
  align-items: center;
  width: calc(100% + 4px);
  height: 30px;
  margin-inline: -2px;
  padding: 0 2px 0 0;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md, 8px);
  color: var(--dsw-alias-label-caption);
}
.dsv-sideSearchIcon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.dsv-sideSearch input {
  flex: 1;
  min-width: 0;
  height: 28px;
  margin-left: -2px;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 18px;
}
.dsv-sideSearch input::placeholder { color: var(--dsw-alias-label-tertiary); }
.dsv-sideFlash { padding: 2px 8px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.4; }
.dsv-sideFlash[data-tone="error"] { color: var(--dsw-alias-state-error-primary); }
.dsv-sideScroll { flex: 1; min-height: 0; overflow: auto; padding: 0 10px 16px 0; }
.dsv-sideGroup { margin-top: 4px; }
.dsv-sideGroup:first-child { margin-top: 2px; }
.dsv-sideGroupHead.dsv-sideSectionHead { height: 36px; margin-top: 2px; margin-bottom: 4px; }
.dsv-sideSectionHead .dsv-sideGroupToggle { height: 36px; gap: 4px; color: var(--dsw-alias-label-tertiary); font-size: 14px; line-height: 20px; }
.dsv-sideSectionHead .dsv-sideGroupTitle { max-width: 45%; color: var(--dsw-alias-label-tertiary); font-size: 14px; line-height: 20px; }
.dsv-sideSectionHead .dsv-sideCount { font-size: 11px; line-height: 16px; }
.dsv-sideGroupHead { display: flex; align-items: center; gap: 4px; height: 34px; padding: 0 4px 0 0; }
.dsv-sideGroupHead[draggable="true"] { cursor: grab; }
.dsv-sideGroupHead[draggable="true"]:active { cursor: grabbing; }
.dsv-sideGroupToggle {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 34px;
  padding: 0 4px;
  border: 0;
  border-radius: var(--dsw-radius-md, 8px);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
}
.dsv-sideGroupToggle:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-sideChevron { display: inline-flex; flex: none; align-items: center; color: var(--dsw-alias-label-tertiary); transition: transform 0.15s ease; }
.dsv-sideGroupTitle {
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-sideCount { flex: none; margin-left: auto; padding-right: 2px; color: var(--dsw-alias-label-tertiary); font-size: 10px; font-variant-numeric: tabular-nums; }
.dsv-sideActiveMark { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 12px; height: 20px; }
.dsv-sideStatusMark { display:inline-flex; flex:none; align-items:center; justify-content:center; width:12px; height:20px; }
.dsv-sideStatusMark .dsv-dot { width:7px; height:7px; }
.dsv-groupStatusMark { display:inline-flex; flex:none; align-items:center; width:12px; }
.dsv-groupStatusMark .dsv-dot { width:7px; height:7px; }
.dsv-sideActiveMark .dsv-dot { width: 7px; height: 7px; }
.dsv-sideGroupActions { display: flex; flex: none; gap: 2px; opacity: 0; }
.dsv-sideGroupHead:hover .dsv-sideGroupActions,
.dsv-sideGroupHead:focus-within .dsv-sideGroupActions { opacity: 1; }

/* Optional animated border for running / waiting session rows (system settings). */
.dsv-sideGlow {
  --glow-a: var(--dsw-alias-state-business-primary);
  --glow-b: #7dd3fc;
  --glow-c: #a78bfa;
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 1.5px;
  border-radius: inherit;
  pointer-events: none;
  background: var(--glow-a);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}
.dsv-sideGlow[data-status="pending"] {
  --glow-a: var(--dsw-alias-state-warn-primary);
  --glow-b: #fdba74;
  --glow-c: #f472b6;
}
.dsv-sideGlow[data-status="done"] {
  --glow-a: var(--dsw-alias-state-success-primary);
  --glow-b: #6ee7b7;
  --glow-c: #22d3ee;
}
.dsv-sideGlow--marquee {
  background: linear-gradient(100deg, transparent 12%, color-mix(in srgb, var(--glow-a) 55%, transparent) 36%, var(--glow-a) 47%, color-mix(in srgb, var(--glow-b) 90%, white) 50%, var(--glow-a) 53%, color-mix(in srgb, var(--glow-a) 55%, transparent) 64%, transparent 88%);
  background-size: 260% 100%;
  animation: dsvGlowMarquee 2.6s linear infinite;
}
.dsv-sideGlow--aurora {
  background: linear-gradient(115deg, var(--glow-a), var(--glow-b), var(--glow-c), var(--glow-a));
  background-size: 340% 340%;
  animation: dsvGlowAurora 6s ease-in-out infinite;
}
.dsv-sideGlow--pulse {
  background: var(--glow-a);
  animation: dsvGlowPulse 2s ease-in-out infinite;
}
@property --dsv-glow-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
.dsv-sideGlow--rainbow {
  background: conic-gradient(from var(--dsv-glow-angle), #ff6b6b, #feca57, #48dbfb, #1dd1a1, #5f27cd, #ff6b6b);
  animation: dsvGlowSpin 4s linear infinite;
}
.dsv-sideGlow--comet {
  background: linear-gradient(100deg, transparent 24%, color-mix(in srgb, var(--glow-a) 45%, transparent) 40%, var(--glow-a) 48%, #fff 50%, var(--glow-a) 52%, transparent 62% 100%);
  background-size: 320% 100%;
  animation: dsvGlowComet 2.2s linear infinite;
}
.dsv-sideGlow--scan {
  background: linear-gradient(90deg, transparent 36%, color-mix(in srgb, var(--glow-a) 35%, transparent) 45%, var(--glow-b) 50%, transparent 55% 100%);
  background-size: 300% 100%;
  animation: dsvGlowScan 3s linear infinite;
}
.dsv-sideGlow--dash {
  background: repeating-conic-gradient(from var(--dsv-glow-angle), var(--glow-a) 0deg 7deg, transparent 7deg 17deg);
  animation: dsvGlowSpin 3s linear infinite;
}
@keyframes dsvGlowSpin {
  to { --dsv-glow-angle: 360deg; }
}
@keyframes dsvGlowComet {
  from { background-position: 170% 0; }
  to { background-position: -120% 0; }
}
@keyframes dsvGlowScan {
  from { background-position: 180% 0; }
  to { background-position: -80% 0; }
}
@keyframes dsvGlowMarquee {
  from { background-position: 160% 0; }
  to { background-position: -120% 0; }
}
@keyframes dsvGlowAurora {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes dsvGlowPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .dsv-sideGlow { animation: none !important; opacity: 0.8; }
}

.dsv-glowCard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 12px;
  margin-bottom: 8px;
}
.dsv-glowCardHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dsv-glowCardTitle {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.dsv-glowPreview {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsv-glowPreviewTitle {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-glowPreviewTime {
  flex: none;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-glowChoices {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.dsv-glowChoice {
  flex: 1 1 0;
  height: 26px;
  padding: 0 6px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  cursor: pointer;
}
.dsv-glowChoice:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dsv-glowChoice[aria-pressed="true"] {
  border-color: var(--dsw-alias-state-business-primary);
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);
}

.dsv-sideGroupIcon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 7px;
  background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 75%, transparent);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.dsv-sideGroupIcon:hover {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l4);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsv-sideGroupIcon[data-collapsed="true"] {
  color: var(--dsw-alias-state-business-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);
}

.dsv-sideRow {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: 0 6px 0 calc(8px + var(--dsv-indent, 0px));
  border-radius: var(--dsw-radius-md, 8px);
  color: var(--dsw-alias-label-primary);
}
.dsv-sideRow + .dsv-sideRow { margin-top: 2px; }
.dsv-sideRow[draggable="true"],
.dsv-sideGroupHead[draggable="true"] { -webkit-user-select: none; user-select: none; }
.dsv-sideRow[draggable="true"] { cursor: grab; }
.dsv-sideRow[draggable="true"]:active { cursor: grabbing; }
body.dsv-dragging,
body.dsv-dragging * { -webkit-user-select: none !important; user-select: none !important; }
.dsv-dragSource { opacity: 0.45; }
.dsv-sideRow.dsv-dropBefore::before,
.dsv-sideRow.dsv-dropAfter::after {
  position: absolute;
  right: 8px;
  left: 8px;
  z-index: 2;
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  content: "";
  pointer-events: none;
}
.dsv-sideRow.dsv-dropBefore::before { top: -2px; }
.dsv-sideRow.dsv-dropAfter::after { bottom: -2px; }
.dsv-sideGroupHead.dsv-dropTarget {
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-interactive-bg-hover);
  box-shadow: inset 0 2px 0 var(--dsw-alias-state-business-primary);
}
.dsv-sideRow:hover,
.dsv-sideRow:focus-within { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-sideOpen {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dsv-sideSlot { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 16px; height: 20px; margin-right: 4px; color: var(--dsw-alias-label-tertiary); }
.dsv-sideRowTitle {
  flex: 1;
  min-width: 0;
  margin: 0 6px 0 4px;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-sideTag {
  flex: none;
  margin-right: 4px;
  padding: 0 4px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 14px;
}
.dsv-sideRunning { flex: none; margin-right: 4px; color: var(--dsw-alias-state-business-primary); font-size: 10px; font-variant-numeric: tabular-nums; }
.dsv-sideTime { flex: none; margin-left: 6px; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 16px; font-variant-numeric: tabular-nums; }
.dsv-sideWaiting { flex: none; margin-left: 6px; color: var(--dsw-alias-state-warn-primary); font-size: 10px; line-height: 16px; }
.dsv-side[data-compact="true"] .dsv-sideRow,
.dsv-side[data-compact="true"] .dsv-sideOpen { min-height: 26px; height: 26px; }
.dsv-side[data-compact="true"] .dsv-sideRowTitle { font-size: 13px; line-height: 18px; }
.dsv-side[data-compact="true"] .dsv-sideTag { display: none; }
.dsv-side[data-compact="true"] .dsv-sideTime { font-size: 10px; }
.dsv-sideRowActions {
  position: absolute;
  right: 4px;
  top: 50%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 12px;
  background: var(--dsw-alias-interactive-bg-hover);
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
}
.dsv-sideRow:hover .dsv-sideRowActions,
.dsv-sideRow:focus-within .dsv-sideRowActions { opacity: 1; pointer-events: auto; }
.dsv-sideRowActions .dsv-sideIconBtn { width: 24px; height: 24px; }
.dsv-sideRow:hover .dsv-sideTime,
.dsv-sideRow:hover .dsv-sideWaiting,
.dsv-sideRow:focus-within .dsv-sideTime,
.dsv-sideRow:focus-within .dsv-sideWaiting { display: none; }
.dsv-sideMore {
  display: flex;
  align-items: center;
  width: 100%;
  height: 28px;
  padding: 0 12px 0 28px;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.dsv-sideMore:hover { color: var(--dsw-alias-label-secondary); }
.dsv-sideEmpty {
  padding: 16px 12px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
}
.dsv-sideHint { margin: 2px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 1.4; }
.dsv-sideHit {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1px;
  width: 100%;
  min-height: 48px;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--dsw-radius-lg, 10px);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dsv-sideHit:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-sideHitSnippet {
  overflow: hidden;
  margin-left: 20px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-sideField { display: flex; flex-direction: column; gap: 5px; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.dsv-sideField input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 7px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
}
.dsv-sideField input:focus { border-color: var(--dsw-alias-state-business-primary); }
.dsv-sidePathRow { display: flex; gap: 6px; }
.dsv-sidePathRow input { flex: 1; min-width: 0; }
.dsv-sideCheck { display: flex; align-items: center; gap: 6px; min-height: 26px; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.dsv-sideCheck input { accent-color: var(--dsw-alias-state-business-primary); }
.dsv-sideSettings {
  position: absolute;
  top: auto;
  bottom: 4px;
  right: 4px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 236px;
  max-height: min(70vh, 420px);
  padding: 10px;
  overflow: auto;
  overscroll-behavior: contain;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-lg, 10px);
  background: var(--dsw-alias-bg-base);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.24);
}
.dsv-sideSettingsHead { display: flex; align-items: center; justify-content: space-between; padding: 0 1px 6px; font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsv-sideSettingsFoot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 5px; padding-top: 6px; border-top: 1px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 1.4; }
.dsv-sideTextBtn { padding: 0; border: 0; background: transparent; color: var(--dsw-alias-state-business-primary); font: inherit; font-size: 11px; cursor: pointer; }
.dsv-sideTextBtn:hover { text-decoration: underline; }
.dsv-sideClear { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 0; border-radius: var(--dsw-radius-sm, 6px); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dsv-sideClear:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-menuWrap { position: absolute; top: 26px; right: 2px; z-index: 70; }
.dsv-contextMenu { position: fixed; z-index: 140; min-width: 176px; padding: 4px; }
.dsv-menuCascadeItem { display:flex; align-items:center; justify-content:space-between; gap:12px; height:28px; padding:0 10px; border-radius:8px; font-size:13px; line-height:28px; color:var(--dsw-alias-label-primary); cursor:default; }
.dsv-menuCascadeItem:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsv-menuArrow { font-size:10px; line-height:1; color:var(--dsw-alias-label-tertiary); }
.dsv-submenu { position:fixed; z-index:160; min-width:176px; max-height:min(70vh,360px); overflow:auto; }
.dsv-menu button.dsv-menuHasSub { justify-content:space-between; }
.dsv-menu {
  min-width: 176px;
  padding: 4px;
  border: 0;
  border-radius: 16px;
  background: var(--dsw-alias-bg-base);
  box-shadow:
    0 0 0 0.5px var(--dsw-alias-border-l3),
    0 3px 8px rgba(0, 0, 0, 0.04),
    0 0 20px rgba(0, 0, 0, 0.05);
}
.dsv-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
}
.dsv-menu button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-menu .dsv-danger { color: var(--dsw-alias-state-error-primary); }
.dsv-menuSep { height: 1px; margin: 4px 5px; background: var(--dsw-alias-border-l3); }
.dsv-dialogHead h2 { margin: 0; font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsv-dialogHead { padding-bottom: 8px; }
.dsv-dialogFoot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.dsv-footBtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dsv-footBtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-footIcon { display: inline-flex; }
.dsv-footAnchor { display: none; }
.dsv-settings { width: 100%; max-width: 680px; padding: 2px 0 32px; color: var(--dsw-alias-label-primary); }
.dsv-settingsPage { padding-bottom: 24px; }
.dsv-settingsHeader { padding: 4px 2px 6px; }
.dsv-settingsTitle { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsv-settingsIntro { margin: 0; max-width: 560px; font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }
.dsv-settingsGroup {
  margin-top: 18px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 12px;
  background: var(--dsw-alias-bg-base);
  overflow: hidden;
}
.dsv-settingsGroupHead { padding: 12px 16px 10px; }
.dsv-settingsGroupTitle { margin: 0; font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsv-settingsGroupHint { margin: 4px 0 0; font-size: 11px; line-height: 1.55; color: var(--dsw-alias-label-tertiary); }
.dsv-settingRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 54px;
  padding: 9px 16px;
  border-top: 1px solid var(--dsw-alias-border-l3);
}
.dsv-settingRow--plain { min-height: 36px; padding: 6px 16px; }
.dsv-settingRow--toggle { cursor: pointer; }
.dsv-settingRow--toggle:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-settingText { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dsv-settingLabel { font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsv-settingDesc { max-width: 420px; font-size: 11px; line-height: 1.55; color: var(--dsw-alias-label-tertiary); }
.dsv-settingControl { display: flex; align-items: center; justify-content: flex-end; flex: none; gap: 8px; }
.dsv-settingControl .dsv-select,
.dsv-settingControl .dsv-input { width: 188px; height: 32px; }
.dsv-settingControl .dsv-number { width: 78px; text-align: right; }
.dsv-switch {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  width: 34px;
  height: 20px;
  margin: 0;
  flex: none;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-border-l4);
  cursor: pointer;
  transition: background 0.16s ease;
}
.dsv-switch::after {
  content: "";
  position: absolute;
  left: 2px;
  top: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.24);
  transition: transform 0.16s ease;
}
.dsv-switch:checked { background: var(--dsw-alias-state-business-primary); }
.dsv-switch:checked::after { transform: translateX(14px); }
.dsv-switch:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-alias-focus-ring-color); }
.dsv-settingsFooter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
  padding: 0 2px;
}
.dsv-settingsFooterHint { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dsv-settingsShortcuts { flex-basis: 100%; margin-top: 2px; font-size: 11px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }
.dsv-hint { margin: 12px 0; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dsv-focusBar {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  margin: 0 2px 4px;
  padding: 4px 6px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 8px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
}
.dsv-focusBarIcon { display: inline-flex; flex: none; color: var(--dsw-alias-state-business-primary); }
.dsv-focusBarName {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 11px;
  font-weight: 500;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.dsv-focusBarName:hover { color: var(--dsw-alias-state-business-primary); }
.dsv-focusBarCount { flex: none; font-size: 10px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dsv-focusBarBtn {
  flex: none;
  height: 20px;
  padding: 0 5px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}
.dsv-focusBarBtn:hover { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); }

.dsv-dialogWide { width: min(760px, 96vw); max-height: 88vh; }
.dsv-btnSm { height: 28px; padding: 0 9px; border-radius: 7px; font-size: 11px; }

.dsv-focusStatus {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  padding: 8px 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 9px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.dsv-focusStatus[data-active="true"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, var(--dsw-alias-border-l3));
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent);
  color: var(--dsw-alias-label-primary);
}
.dsv-focusStatusIcon { display: inline-flex; flex: none; color: var(--dsw-alias-label-tertiary); }
.dsv-focusStatus[data-active="true"] .dsv-focusStatusIcon { color: var(--dsw-alias-state-business-primary); }
.dsv-focusStatusText { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.dsv-focusListHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 4px 0 8px;
}
.dsv-focusListTitle { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsv-focusList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 380px;
  overflow: auto;
  padding-right: 2px;
}
.dsv-focusCard { padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l3); border-radius: 10px; }
.dsv-focusCard[data-active="true"] {
  border-color: var(--dsw-alias-state-business-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, transparent);
}
.dsv-focusCardHead { display: flex; align-items: center; gap: 6px; }
.dsv-focusCardName {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  height: 24px;
  padding: 0 4px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.dsv-focusCardName:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-focusCardName span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsv-focusBadge {
  flex: none;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--dsw-alias-state-business-primary);
  color: #fff;
  font-size: 10px;
  line-height: 14px;
}
.dsv-focusMeta { flex: none; margin-left: auto; font-size: 10px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dsv-focusChips { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 0; }
.dsv-focusChip {
  max-width: 150px;
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-focusChip[data-more="true"] { color: var(--dsw-alias-label-tertiary); }
.dsv-focusChip[data-stale="true"] {
  color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
}
.dsv-focusChipEmpty { font-size: 10px; line-height: 15px; color: var(--dsw-alias-label-tertiary); }
.dsv-focusCardFoot { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.dsv-focusCardActions { display: flex; gap: 2px; margin-left: auto; }
.dsv-focusRename { display: inline-flex; flex: 1; align-items: center; gap: 6px; min-width: 0; }
.dsv-focusRename .dsv-input { height: 26px; padding: 0 10px; }
.dsv-focusMembers {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--dsw-alias-border-l3);
}
.dsv-focusMembersHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-focusMembersTools { display: flex; gap: 2px; }
.dsv-focusDanger { color: var(--dsw-alias-state-error-primary); }
.dsv-focusCreate {
  margin: 0 0 10px;
  padding: 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 10px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsv-focusCreate .dsv-input { width: 100%; height: 30px; margin-bottom: 8px; padding: 0 10px; }
.dsv-focusCreate .dsv-focusMembers { margin-top: 0; padding-top: 0; border-top: 0; max-height: 150px; overflow: auto; }
.dsv-focusCreateFoot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
.dsv-focusCreateFoot .dsv-sideHint { margin: 0; }
.dsv-sideFocus .dsv-focusRow { display: flex; align-items: center; gap: 4px; }
.dsv-focusRowMain {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.dsv-focusRowMain:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-focusRow[data-active="true"] .dsv-focusRowMain { color: var(--dsw-alias-label-primary); }
.dsv-focusDot { flex: none; width: 6px; height: 6px; border-radius: 999px; background: var(--dsw-alias-border-l4); }
.dsv-focusRow[data-active="true"] .dsv-focusDot { background: var(--dsw-alias-state-business-primary); }
.dsv-focusRowName { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsv-focusRowMeta { flex: none; font-size: 10px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dsv-focusChevron { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 10px; color: var(--dsw-alias-label-tertiary); }
.dsv-focusRowMain .dsv-focusChevron { margin-right: -1px; }
.dsv-focusBody { display: flex; flex-direction: column; gap: 2px; margin: 0 0 4px 9px; padding-left: 5px; border-left: 1px solid var(--dsw-alias-border-l3); }
.dsv-focusBody .dsv-sideGroupHead { border-radius: 7px; }
.dsv-focusEmptyBody { padding: 2px 6px 4px; }
.dsv-focusDialogName { margin: 0 0 6px; color: var(--dsw-alias-label-secondary); font-size: 13px; font-weight: 600; }
.dsv-workspaceFilterRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 54px;
  padding: 9px 16px;
  border-top: 1px solid var(--dsw-alias-border-l3);
}
.dsv-workspaceFilterText { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dsv-workspaceFilterName { font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsv-workspaceFilterPath {
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-workspaceFilterEmpty { margin: 0; padding: 14px 16px; border-top: 1px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-tertiary); font-size: 13px; }
.dsv-workspaceFilterFoot { display: flex; justify-content: flex-end; padding: 10px 16px; border-top: 1px solid var(--dsw-alias-border-l3); }
/* Workspace visibility menu opened from the "\u5DE5\u4F5C\u533A\u4F1A\u8BDD" header / workspace context menu. */
.dsv-workspaceFilterMenu {
  width: 320px;
  max-height: min(70vh, 460px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.dsv-wsFilterHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 4px;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}
.dsv-wsFilterClear {
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-state-business-primary);
  font: inherit;
  cursor: pointer;
}
.dsv-wsFilterClear:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-wsFilterList {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-height: 0;
  max-height: 320px;
  overflow-y: auto;
}
.dsv-wsFilterRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
}
.dsv-wsFilterRow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsv-wsFilterRow[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent);
}
.dsv-wsFilterRow[data-active="true"] .dsv-wsFilterName { color: var(--dsw-alias-state-business-primary); }
.dsv-wsFilterText { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.dsv-wsFilterApply {
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dsv-wsFilterName {
  font-size: 13px;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-wsFilterPath {
  font-size: 10px;
  line-height: 14px;
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-wsFilterEmpty { margin: 0; padding: 8px; font-size: 13px; color: var(--dsw-alias-label-tertiary); }
.dsv-wsFilterReset {
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  cursor: pointer;
}
.dsv-wsFilterReset:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsv-menuDivider { display:block; height: 1px; margin: 2px 6px; background: var(--dsw-alias-border-l4); }

.dsv-sectionTitleWrap { display:flex; flex-direction:column; gap:1px; min-width:0; text-align:left; }
.dsv-sectionPath { max-width:min(520px,60vw); overflow:hidden; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:10px; line-height:13px; color:var(--dsw-alias-label-tertiary); text-overflow:ellipsis; white-space:nowrap; }
.dsv-wsFilter { position:relative; flex:none; }
.dsv-wsPage { display:flex; flex-direction:column; gap:12px; padding:2px 0 24px; }
.dsv-wsIntro { display:flex; flex-direction:column; gap:4px; }
.dsv-wsTitle { margin:0; font-size:16px; line-height:24px; font-weight:600; color:var(--dsw-alias-label-primary); }
.dsv-wsHint { margin:0; font-size:12px; line-height:18px; color:var(--dsw-alias-label-tertiary); }
.dsv-wsTools { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 10px; border:0.5px solid var(--dsw-alias-border-l4); border-radius:10px; }
.dsv-wsShowToggle { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.dsv-wsList { display:flex; flex-direction:column; gap:2px; }
.dsv-wsRow { display:flex; align-items:center; gap:12px; padding:8px 10px; border-radius:10px; }
.dsv-wsRow:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsv-wsRow[data-active="true"] { background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent); }
.dsv-wsRow[data-hidden="true"] { opacity:.55; }
.dsv-wsMain { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; padding:0; border:0; background:transparent; font:inherit; text-align:left; cursor:pointer; }
.dsv-wsName { font-size:14px; line-height:20px; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsv-wsRow[data-active="true"] .dsv-wsName { color:var(--dsw-alias-state-business-primary); }
.dsv-wsPath { font-family:var(--dsw-font-mono, ui-monospace, monospace); font-size:11px; line-height:16px; color:var(--dsw-alias-label-tertiary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsv-wsCount { flex:none; font-size:12px; line-height:18px; color:var(--dsw-alias-label-tertiary); }
.dsv-wsRowAll .dsv-wsName { font-weight:600; }
.dsv-wsEmpty { margin:0; padding:12px; font-size:12px; color:var(--dsw-alias-label-tertiary); }
.dsv-wsFilterPop { position:absolute; top:calc(100% + 6px); right:0; z-index:60; display:flex; flex-direction:column; width:340px; max-height:min(70vh,460px); padding:6px; border:0.5px solid var(--dsw-alias-border-l4); border-radius:12px; background:var(--dsw-alias-bg-base); box-shadow:0 8px 24px rgba(0,0,0,.18); }
.dsv-wsFilterShow { margin-bottom:4px; border-bottom:1px solid var(--dsw-alias-border-l4); border-radius:8px 8px 0 0; }

.dsv-menuLabel { padding:2px 10px 0; font-size:13px; line-height:18px; color:var(--dsw-alias-label-secondary); cursor:default; }
.dsv-menu button.dsv-menuChoiceSub { height:24px; padding:0 8px 0 20px; font-size:11px; line-height:24px; }
.dsv-menuChoice { display:flex; align-items:center; gap:6px; }
.dsv-menuCheck { width:12px; flex:none; color:var(--dsw-alias-state-business-primary); font-size:11px; line-height:1; }
.dsv-groupIntro { margin:0 0 8px; }
.dsv-groupToolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
.dsv-groupToolbarActions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.dsv-groupCreate { display:flex; flex-direction:column; gap:8px; margin-bottom:10px; padding:10px; border:1px solid var(--dsw-alias-border-l4); border-radius:10px; }
.dsv-groupParentField { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--dsw-alias-label-secondary); }
.dsv-groupParentField .dsv-select { flex:1; min-width:0; }
.dsv-groupCreateFoot { display:flex; justify-content:flex-end; }
.dsv-groupList { display:flex; flex-direction:column; gap:8px; max-height:420px; overflow:auto; padding-right:2px; }
.dsv-groupCard { padding:8px 10px; border:1px solid var(--dsw-alias-border-l3); border-radius:10px; }
.dsv-groupCardHead { display:flex; align-items:center; gap:6px; }
.dsv-groupCardName { display:inline-flex; align-items:center; gap:4px; min-width:0; font-size:14px; font-weight:600; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsv-groupDepth { width:10px; color:var(--dsw-alias-label-tertiary); }
.dsv-groupMeta { flex:none; margin-left:auto; font-size:10px; color:var(--dsw-alias-label-tertiary); }
.dsv-groupChips { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
.dsv-groupCardActions { display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; }
.dsv-groupMembers { display:flex; flex-direction:column; gap:4px; max-height:180px; overflow:auto; margin-top:8px; padding-top:6px; border-top:1px solid var(--dsw-alias-border-l4); }
.dsv-groupMemberFilter { margin-bottom:2px; }
.dsv-groupMemberMeta { display:block; color:var(--dsw-alias-label-tertiary); font-size:11px; font-style:normal; }


.dsv-groupsEmbedded .dsv-groupEmbedded { margin-top: 2px; }
.dsv-groupsEmbedded .dsv-groupIntro { margin-bottom: 8px; }
.dsv-groupsPage { display:flex; flex-direction:column; gap:12px; padding:8px 0 32px; max-width:980px; }
.dsv-groupsHead { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.dsv-groupsTitle { margin:0 0 4px; font-size:14px; font-weight:600; color:var(--dsw-alias-label-primary); }
.dsv-groupsHint { margin:0; font-size:11px; line-height:18px; color:var(--dsw-alias-label-tertiary); }
.dsv-groupsSearch { width:100%; }
.dsv-groupsList { display:flex; flex-direction:column; gap:8px; }
.dsv-groupBlock { border:1px solid var(--dsw-alias-border-l3); border-radius:12px; background:var(--dsw-alias-bg-base); overflow:hidden; }
.dsv-groupBlockHead { display:flex; align-items:center; gap:8px; width:100%; min-height:42px; padding:0 10px; border:0; background:none; color:var(--dsw-alias-label-primary); font:inherit; cursor:pointer; text-align:left; }
.dsv-groupBlockHead:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsv-groupBlockName { flex:1; min-width:0; font-size:14px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsv-groupBlockCount { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dsv-groupEmpty { margin:0; padding:8px 14px 12px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dsv-groupRootRows { display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l3); border-radius:12px; overflow:hidden; }
.dsv-groupRootRows .dsv-groupSession:first-child { border-top:0; }
.dsv-groupRootEmpty { min-height:30px; border-style:dashed; }
.dsv-groupBlock.dsv-dropTarget, .dsv-groupRootRows.dsv-dropTarget { border-color: var(--dsw-alias-state-business-primary); }
.dsv-groupSession { display:flex; align-items:center; gap:10px; min-height:32px; padding:0 12px; border-top:1px solid var(--dsw-alias-border-l4); }
.dsv-groupSession:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsv-groupSessionOpen { display:flex; align-items:baseline; gap:8px; flex:1; min-width:0; padding:2px 0; border:0; background:none; color:var(--dsw-alias-label-primary); font:inherit; text-align:left; cursor:pointer; }
.dsv-groupSessionTitle { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
.dsv-groupSessionMeta { color:var(--dsw-alias-label-tertiary); font-size:11px; white-space:nowrap; }
.dsv-groupSessionSelect { width:170px; height:28px; font-size:11px; }
.dsv-groupSearch { margin:0 0 4px; }
.dsv-dialogWide .dsv-groupList { max-height:52vh; overflow:auto; padding-right:2px; }

/* Live workspace-group tree (management page). */
.dsv-tree { display:flex; flex-direction:column; gap:2px; }
.dsv-treeRow { display:flex; align-items:center; gap:6px; min-height:32px; padding-right:8px; border:1px solid transparent; border-radius:8px; }
.dsv-treeRow:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsv-treeGroup { font-size:14px; font-weight:600; color:var(--dsw-alias-label-primary); cursor:pointer; }
.dsv-treeGroup button, .dsv-treeGroup input { cursor:auto; }
.dsv-treeWorkspace { font-size:13px; color:var(--dsw-alias-label-secondary); }
.dsv-treeChevron { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-tertiary); font-size:11px; cursor:pointer; }
.dsv-treeChevron:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsv-treeChevron span[data-collapsed="true"] { display:inline-block; transform:rotate(-90deg); }
.dsv-treeName { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsv-treeMeta { flex:none; font-size:11px; color:var(--dsw-alias-label-tertiary); }
.dsv-treePath { flex:none; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; color:var(--dsw-alias-label-tertiary); }
.dsv-treeActions { display:none; gap:4px; flex:none; }
.dsv-treeRow:hover .dsv-treeActions, .dsv-treeRow:focus-within .dsv-treeActions { display:flex; }
.dsv-treeRename { height:26px; max-width:240px; font-size:13px; }
.dsv-treeChildren { display:flex; flex-direction:column; gap:2px; }
.dsv-treeDot { flex:none; width:6px; height:6px; border-radius:50%; background:var(--dsw-alias-border-l4); }
.dsv-treeRoot { min-height:36px; padding:2px 0; border:1px dashed transparent; border-radius:10px; }
.dsv-treeDrop-before { box-shadow:inset 0 2px 0 var(--dsw-alias-state-business-primary); }
.dsv-treeDrop-after { box-shadow:inset 0 -2px 0 var(--dsw-alias-state-business-primary); }
.dsv-treeDrop-inside { border-color:var(--dsw-alias-state-business-primary); background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent); }
.dsv-sideGroupHead.dsv-dropBefore { box-shadow:inset 0 2px 0 var(--dsw-alias-state-business-primary); }
.dsv-sideGroupHead.dsv-dropAfter { box-shadow:inset 0 -2px 0 var(--dsw-alias-state-business-primary); }

`;

// src/client/icons.jsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function SessionViewIcon({ size = 16 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "3.5", cy: "4", r: "1.5", fill: "currentColor" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M7 4h6", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "3.5", cy: "8", r: "1.5", fill: "currentColor", opacity: "0.72" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M7 8h6", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", opacity: "0.72" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "3.5", cy: "12", r: "1.5", fill: "currentColor", opacity: "0.45" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M7 12h6", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", opacity: "0.45" })
  ] });
}
function SearchIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "7", cy: "7", r: "4.25", stroke: "currentColor", strokeWidth: "1.4" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "m10.2 10.2 3.1 3.1", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" })
  ] });
}
function ChevronDownIcon({ size = 12 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "m4 6 4 4 4-4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function ChevronRightIcon({ size = 12 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "m6 4 4 4-4 4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function PinIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("rect", { x: "2.5", y: "3", width: "11", height: "3", rx: "0.8", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M4 6v6.2c0 .5.4.8.8.8h6.4c.4 0 .8-.3.8-.8V6", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M6.5 8.6h3", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" })
  ] });
}
function TrashIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.5 8.2c0 .4.4.8.8.8h3.4c.4 0 .8-.4.8-.8l.5-8.2", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M6.8 6.8v4M9.2 6.8v4", stroke: "currentColor", strokeWidth: "1.1", strokeLinecap: "round" })
  ] });
}
function RestoreIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M3.2 6.2A5 5 0 1 1 3 9", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M3 3v3.4h3.4", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" })
  ] });
}
function PlusIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M8 3v10M3 8h10", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }) });
}
function LayoutIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("rect", { x: "2.5", y: "3", width: "11", height: "10", rx: "1.2", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M6 3v10", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M8.5 6h3M8.5 8.5h2", stroke: "currentColor", strokeWidth: "1.1", strokeLinecap: "round" })
  ] });
}
function ActivityIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    "path",
    {
      d: "M1.8 8.2h2.4l1.5-3.4 2.1 6.4 1.6-4.2 1.2 1.2h3.6",
      stroke: "currentColor",
      strokeWidth: "1.35",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }
  ) });
}
function ClockIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "8", cy: "8", r: "5.5", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M8 4.8V8l2.2 1.3", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" })
  ] });
}
function FolderIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    "path",
    {
      d: "M2.5 4.8c0-.6.4-1 1-1h2.6l1.2 1.4h4.7c.6 0 1 .4 1 1v6c0 .6-.4 1-1 1h-8.5c-.6 0-1-.4-1-1V4.8Z",
      stroke: "currentColor",
      strokeWidth: "1.2",
      strokeLinejoin: "round"
    }
  ) });
}
function TargetIcon({ size = 14 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "8", cy: "8", r: "5.4", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "8", cy: "8", r: "2.2", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "8", cy: "8", r: "0.7", fill: "currentColor" })
  ] });
}
function ChevronsUpIcon({ size = 12 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "m4 9 4-4 4 4M4 13l4-4 4 4", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function ChevronsDownIcon({ size = 12 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "m4 3 4 4 4-4M4 7l4 4 4-4", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" }) });
}

// src/client/session-view.jsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var ALL2 = "all";
var TABS = ["active", "archived", "trash", "sessionGroups", "workspaceGroups", "workspaces"];
var CONFIRM_COPY = {
  archive: { title: "confirm.archive.title", body: "confirm.archive.body", tone: "normal" },
  trash: { title: "confirm.trash.title", body: "confirm.trash.body", tone: "normal" },
  purge: {
    title: "confirm.purge.title",
    body: "confirm.purge.body",
    warning: "confirm.purge.warning",
    tone: "danger"
  },
  forcePurge: {
    title: "confirm.forcePurge.title",
    body: "confirm.forcePurge.body",
    warning: "confirm.forcePurge.warning",
    tone: "danger"
  }
};
function errorText(error) {
  return errorMessage(error);
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
  const prefs = (0, import_react5.useSyncExternalStore)(subscribePrefs, getPrefs, getPrefs);
  const sessions = useSessions((state2) => state2);
  const statuses = useSessionStatus((state2) => state2);
  const workspaces = useWorkspaces((state2) => state2);
  const [tab, setTab] = (0, import_react5.useState)("active");
  const [query, setQuery] = (0, import_react5.useState)("");
  const [workspaceId, setWorkspaceId] = (0, import_react5.useState)(ALL2);
  const [status, setStatus] = (0, import_react5.useState)(ALL2);
  const [now, setNow] = (0, import_react5.useState)(() => Date.now());
  const [groupWorkspaces, setGroupWorkspaces] = (0, import_react5.useState)(true);
  const [collapsedSections, setCollapsedSections] = (0, import_react5.useState)(() => /* @__PURE__ */ new Set());
  const [manage, setManage] = (0, import_react5.useState)(false);
  const [selected, setSelected] = (0, import_react5.useState)([]);
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const [confirm, setConfirm] = (0, import_react5.useState)(null);
  const [toast, setToast] = (0, import_react5.useState)(null);
  const [trash, setTrash] = (0, import_react5.useState)({ state: "idle", items: [], error: null });
  const [staleIds, setStaleIds] = (0, import_react5.useState)(() => /* @__PURE__ */ new Set());
  const [groupsQuery, setGroupsQuery] = (0, import_react5.useState)("");
  const [groupDialog, setGroupDialog] = (0, import_react5.useState)(false);
  const [expandedSessionGroups, setExpandedSessionGroups] = (0, import_react5.useState)(() => /* @__PURE__ */ new Set());
  const panelIntent = (0, import_react5.useSyncExternalStore)(subscribePanelIntent, getPanelIntent, () => null);
  (0, import_react5.useEffect)(() => {
    if (!panelIntent) return;
    if (panelIntent.kind === "workspaceFilter") {
      setTab("workspaces");
      if (panelIntent.workspaceId) setWorkspaceId(panelIntent.workspaceId);
    } else if (panelIntent.kind === "workspaceGroups") {
      setTab("workspaceGroups");
    } else {
      return;
    }
    consumePanelIntent();
  }, [panelIntent]);
  const sessionGroupTree = (0, import_react5.useMemo)(
    () => flattenWorkspaceGroups(prefs.sessionGroups ?? []),
    [prefs.sessionGroups]
  );
  const hiddenWorkspaceIds = prefs.hiddenWorkspaceIds ?? [];
  const hiddenWorkspaceSet = (0, import_react5.useMemo)(() => new Set(hiddenWorkspaceIds), [hiddenWorkspaceIds]);
  const filterWorkspaceItems = (0, import_react5.useMemo)(
    () => [...workspaces?.items ?? []].sort(
      (a, b) => String(a?.path ?? a?.title ?? "").localeCompare(String(b?.path ?? b?.title ?? ""), "zh")
    ),
    [workspaces?.items]
  );
  const toggleWorkspaceVisibility = (id) => {
    if (!id) return;
    setPrefs({
      hiddenWorkspaceIds: hiddenWorkspaceSet.has(id) ? hiddenWorkspaceIds.filter((item) => item !== id) : [...hiddenWorkspaceIds, id]
    });
  };
  (0, import_react5.useEffect)(() => {
    const timer = setInterval(() => setNow(Date.now()), 6e4);
    return () => clearInterval(timer);
  }, []);
  (0, import_react5.useEffect)(() => {
    if (!toast) return void 0;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  const loadTrash = (0, import_react5.useCallback)(async () => {
    setTrash((prev) => ({ ...prev, state: "loading", error: null }));
    try {
      const data = await fetchTrash();
      const items2 = Array.isArray(data.items) ? data.items : [];
      setTrash({ state: "ready", items: items2, error: null });
      setTrashItems(items2);
    } catch (error) {
      setTrash({ state: "error", items: [], error: errorText(error) });
    }
  }, []);
  (0, import_react5.useEffect)(() => {
    loadTrash();
  }, [loadTrash]);
  (0, import_react5.useEffect)(() => {
    setSelected([]);
    setManage(false);
  }, [tab]);
  const trashedIds = (0, import_react5.useMemo)(
    () => new Set((trash.items ?? []).map((item) => item.sessionId)),
    [trash.items]
  );
  const annotated = (0, import_react5.useMemo)(() => {
    if (!sessions || !workspaces) return [];
    const candidates = buildCandidates(sessions, workspaces.archivedSessionIds);
    const rows = buildRows(candidates, sessions.byId ?? {}, workspaces);
    const annotatedRows = annotateRows(rows, statuses);
    const visible = prefs.showSubagents ? annotatedRows : annotatedRows.filter((row) => row.session.origin !== "subagent");
    return visible.filter((row) => !trashedIds.has(row.session.id) && !staleIds.has(row.session.id));
  }, [sessions, statuses, workspaces, prefs.showSubagents, trashedIds, staleIds]);
  const sessionGroupItems = (0, import_react5.useMemo)(
    () => annotated.map((row) => ({
      id: row.session.id,
      title: row.session.blank ? t("row.newSession") : row.title || row.session.id,
      workspace: row.workspace ? workspaceLabel(row.workspace) : t("workspace.unknown"),
      status: row.status
    })),
    [annotated, t]
  );
  const sessionAssignments = prefs.sessionAssignments ?? {};
  const groupsFilter = groupsQuery.trim().toLowerCase();
  const assignSession = (sessionId, groupId) => {
    const next = { ...sessionAssignments };
    if (groupId) next[sessionId] = groupId;
    else delete next[sessionId];
    setPrefs({ sessionAssignments: next });
  };
  const filteredGroupItems = sessionGroupItems.filter((item) => {
    if (!groupsFilter) return true;
    return item.title.toLowerCase().includes(groupsFilter) || item.workspace.toLowerCase().includes(groupsFilter) || sessionGroupTree.some((group) => group.id === sessionAssignments[item.id] && String(group.name ?? "").toLowerCase().includes(groupsFilter));
  });
  const scopeRows = (0, import_react5.useMemo)(
    () => filterRows(annotated, { query, workspaceId, status: ALL2 }),
    [annotated, query, workspaceId]
  );
  const activeRows2 = (0, import_react5.useMemo)(
    () => status === ALL2 ? scopeRows : filterRows(scopeRows, { status }),
    [scopeRows, status]
  );
  const counts = (0, import_react5.useMemo)(() => countByStatus(scopeRows), [scopeRows]);
  const sections = (0, import_react5.useMemo)(
    () => splitSections(activeRows2, workspaces?.pinnedSessionIds),
    [activeRows2, workspaces?.pinnedSessionIds]
  );
  const archivedAll = (0, import_react5.useMemo)(() => {
    const all = archivedRows(sessions, workspaces?.archivedSessionIds, workspaces).filter((row) => !trashedIds.has(row.session.id) && !staleIds.has(row.session.id));
    return prefs.showSubagents ? all : all.filter((row) => row.session.origin !== "subagent");
  }, [sessions, workspaces, prefs.showSubagents, trashedIds, staleIds]);
  const archived = (0, import_react5.useMemo)(
    () => filterRows(archivedAll, { query, workspaceId, status: ALL2 }),
    [archivedAll, query, workspaceId]
  );
  const trashedAll = (0, import_react5.useMemo)(() => {
    const all = trashRows(trash.items, sessions?.byId, workspaces);
    return prefs.showSubagents ? all : all.filter((row) => row.session.origin !== "subagent");
  }, [trash.items, sessions?.byId, workspaces, prefs.showSubagents]);
  const trashed = (0, import_react5.useMemo)(
    () => filterRows(trashedAll.filter((row) => !staleIds.has(row.session.id)), { query, workspaceId, status: ALL2 }),
    [trashedAll, query, workspaceId, staleIds]
  );
  const workspaceOptions = (0, import_react5.useMemo)(() => {
    const byWorkspace = /* @__PURE__ */ new Map();
    const source = tab === "archived" ? archivedAll : tab === "trash" ? trashedAll : annotated;
    for (const row of source) {
      const workspace = row.workspace;
      if (!workspace?.workspaceId) continue;
      if (!byWorkspace.has(workspace.workspaceId)) {
        byWorkspace.set(workspace.workspaceId, workspaceLabel(workspace) || workspace.workspaceId);
      }
    }
    return Array.from(byWorkspace, ([id, label]) => ({ id, label })).sort(
      (a, b) => a.label.localeCompare(b.label)
    );
  }, [annotated, archivedAll, trashedAll, tab]);
  const pinnedSet = (0, import_react5.useMemo)(
    () => new Set(workspaces?.pinnedSessionIds ?? []),
    [workspaces?.pinnedSessionIds]
  );
  const selectedSet = (0, import_react5.useMemo)(() => new Set(selected), [selected]);
  const tabRows = tab === "active" ? activeRows2 : tab === "archived" ? archived : tab === "trash" ? trashed : [];
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
  const runCheck = async () => {
    setBusy(true);
    try {
      await loadTrash();
      setStaleIds(/* @__PURE__ */ new Set());
      setSelected([]);
      notify(t("toast.checked"));
    } catch (error) {
      notify("", [error]);
    } finally {
      setBusy(false);
    }
  };
  const markStale = (ids2) => {
    const unique = [...new Set(ids2.filter(Boolean))];
    if (unique.length === 0) return 0;
    setStaleIds((prev) => {
      const next = new Set(prev);
      unique.forEach((id) => next.add(id));
      return next;
    });
    return unique.length;
  };
  const reportStale = (count) => {
    if (!count) return;
    setToast((prev) => ({
      text: prev?.text ? `${prev.text} \xB7 ${t("toast.stale", { n: count })}` : t("toast.stale", { n: count }),
      tone: "error"
    }));
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
    } catch (error) {
      if (isStaleSessionError(error)) {
        markStale([id]);
        setToast({ text: t("toast.stale", { n: 1 }), tone: "error" });
      } else {
        setToast({ text: t("toast.failed", { message: errorText(error) }), tone: "error" });
      }
    } finally {
      setBusy(false);
    }
  };
  const archiveMany = async (ids2) => {
    const failures = [];
    let ok = 0;
    for (const id of ids2) {
      try {
        await archiveSession(id);
        ok += 1;
      } catch (error) {
        failures.push({ id, error });
      }
    }
    const stale = markStale(failures.filter((item) => isStaleSessionError(item.error)).map((item) => item.id));
    notify(ok === 0 ? "" : t("toast.archived", { n: ok }), failures, ok);
    reportStale(stale);
    setSelected([]);
  };
  const trashMany = async (rows) => {
    const ids2 = rows.map((row) => row.session.id);
    const archived2 = await Promise.allSettled(
      rows.map((row) => row.archived ? Promise.resolve() : archiveSession(row.session.id))
    );
    const failures = archived2.map((result, index) => result.status === "rejected" ? { sessionId: ids2[index], error: result.reason } : null).filter(Boolean);
    const ready = rows.filter((_, index) => archived2[index].status === "fulfilled");
    let stale = markStale(failures.filter((item) => isStaleSessionError(item.error)).map((item) => item.sessionId));
    if (ready.length > 0) {
      try {
        const result = await addToTrash(
          ready.map((row) => ({
            sessionId: row.session.id,
            title: row.session.displayTitle || row.session.title || "",
            cwd: row.session.cwd || ""
          }))
        );
        if (Array.isArray(result.failed)) {
          failures.push(...result.failed);
          stale += markStale(result.failed.filter((item) => isStaleSessionError(item.error)).map((item) => item.sessionId));
        }
        const added = new Set(ready.map((row) => row.session.id));
        for (const failed of result.failed ?? []) added.delete(failed.sessionId);
        await Promise.allSettled([...added].map((id) => unarchiveSession(id)));
        const ok = result.added ?? added.size;
        addTrashIds([...added]);
        notify(ok === 0 ? "" : t("toast.trashed", { n: ok }), failures, ok);
        reportStale(stale);
        await loadTrash();
      } catch (error) {
        failures.push({ error });
        notify("", failures);
      }
    } else {
      notify("", failures);
      reportStale(stale);
    }
    setSelected([]);
  };
  const restoreMany = async (ids2) => {
    const failures = [];
    let ok = 0;
    for (const id of ids2) {
      try {
        await unarchiveSession(id);
        ok += 1;
      } catch (error) {
        failures.push({ id, error });
      }
    }
    const stale = markStale(failures.filter((item) => isStaleSessionError(item.error)).map((item) => item.id));
    notify(ok === 0 ? "" : t("toast.restored", { n: ok }), failures, ok);
    reportStale(stale);
    if (tab === "trash") await loadTrash();
    setSelected([]);
  };
  const restoreFromTrash = async (ids2) => {
    try {
      const result = await restoreTrash(ids2);
      const failures = Array.isArray(result.failed) ? result.failed : [];
      const ok = result.restored ?? ids2.length - failures.length;
      const stale = markStale(failures.filter((item) => isStaleSessionError(item.error)).map((item) => item.sessionId));
      const failedIds = new Set(failures.map((item) => item.sessionId));
      removeTrashIds(ids2.filter((id) => !failedIds.has(id)));
      notify(ok === 0 ? "" : t("toast.restored", { n: ok }), failures, ok);
      reportStale(stale);
      await Promise.allSettled(ids2.map((id) => unarchiveSession(id)));
      await loadTrash();
    } catch (error) {
      notify("", [{ error }]);
    }
    setSelected([]);
  };
  const purgeMany = async (ids2, force = false) => {
    try {
      const result = await purgeTrash(ids2, force);
      const failures = Array.isArray(result.failed) ? result.failed : [];
      const ok = result.purged?.length ?? 0;
      removeTrashIds(Array.isArray(result.purged) ? result.purged : ids2);
      notify(ok === 0 ? "" : t("toast.purged", { n: ok }), failures, ok);
      if (failures.length > 0) {
        setTab("trash");
        setQuery("");
        setWorkspaceId(ALL2);
        setStatus(ALL2);
        setCollapsedSections(/* @__PURE__ */ new Set());
      }
      await loadTrash();
    } catch (error) {
      notify("", [{ error }]);
    }
    setSelected([]);
  };
  const runConfirmed = async () => {
    if (!confirm) return;
    const { kind, ids: ids2, rows } = confirm;
    setConfirm(null);
    setBusy(true);
    try {
      if (kind === "archive") await archiveMany(ids2);
      if (kind === "trash") await trashMany(rows);
      if (kind === "purge") await purgeMany(ids2);
      if (kind === "forcePurge") await purgeMany(ids2, true);
    } finally {
      setBusy(false);
    }
  };
  const requestConfirm = (kind, rows) => {
    const ids2 = rows.map((row) => row.session.id);
    if (ids2.length === 0) return;
    setConfirm({ kind, ids: ids2, rows });
  };
  const togglePinFromRow = (row) => {
    togglePin(row);
  };
  const renderActions = (row) => {
    const id = row.session.id;
    if (tab === "active") {
      const pinned = pinnedSet.has(id);
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "aria-pressed": pinned,
            "aria-label": t(pinned ? "action.unpin" : "action.pin"),
            title: t(pinned ? "action.unpin" : "action.pin"),
            onClick: () => togglePinFromRow(row),
            children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PinIcon, { size: 13 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "aria-label": t("action.archive"),
            title: t("action.archive"),
            onClick: () => requestConfirm("archive", [row]),
            children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ArchiveIcon, { size: 13 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "data-tone": "danger",
            "aria-label": t("action.trash"),
            title: t("action.trash"),
            onClick: () => requestConfirm("trash", [row]),
            children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TrashIcon, { size: 13 })
          }
        )
      ] });
    }
    if (tab === "archived") {
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "aria-label": t("action.restore"),
            title: t("action.restore"),
            onClick: () => restoreMany([id]),
            children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(RestoreIcon, { size: 13 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-iconBtn",
            "data-tone": "danger",
            "aria-label": t("action.trash"),
            title: t("action.trash"),
            onClick: () => requestConfirm("trash", [row]),
            children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TrashIcon, { size: 13 })
          }
        )
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "button",
        {
          type: "button",
          className: "dsv-iconBtn",
          "aria-label": t("action.restore"),
          title: t("action.restore"),
          onClick: () => restoreFromTrash([id]),
          children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(RestoreIcon, { size: 13 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "button",
        {
          type: "button",
          className: "dsv-iconBtn",
          "data-tone": "danger",
          "aria-label": t("action.purge"),
          title: t("action.purge"),
          onClick: () => requestConfirm("purge", [row]),
          children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TrashIcon, { size: 13 })
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
    const meta = tab === "trash" ? `${workspaceName} \xB7 ${t("trash.deletedAt", { time: timeLabel })}` : `${workspaceName} \xB7 ${timeLabel}`;
    const title = row.session.blank ? t("row.newSession") : row.title;
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "div",
      {
        className: "dsv-row",
        "data-depth": row.depth,
        style: { "--dsv-depth": row.depth },
        role: "listitem",
        "data-manage": manage,
        children: [
          manage && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "input",
            {
              type: "checkbox",
              className: "dsv-check",
              checked: selectedSet.has(id),
              onChange: () => toggleSelect(id),
              "aria-label": t("select.count", { n: 1 })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              className: "dsv-rowButton",
              onClick: () => manage ? toggleSelect(id) : tab === "active" && openSession(id),
              title: tab === "active" ? t("row.open", { title }) : title,
              children: [
                tab !== "trash" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-status", "data-status": row.status, "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dsv-main", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dsv-rowTitle", children: [
                    pinned && tab === "active" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-boardPin", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PinIcon, { size: 10 }) }),
                    title
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dsv-rowMeta", children: [
                    row.session.origin === "subagent" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-tag", children: t("row.child") }),
                    row.orphan && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-tag", "data-kind": "orphan", children: t("row.orphan") }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-metaText dsv-workspace", children: meta }),
                    row.runningChildren > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-sep", "aria-hidden": "true", children: "\xB7" }),
                      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-metaText", children: t("row.runningChildren", { n: row.runningChildren }) })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-srOnly", children: t(statusLabelKey(row.status)) }),
                tab === "active" && row.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-pill", "data-status": "pending", children: t(pendingLabelKey(row.pendingKind)) }),
                tab === "active" && row.status === "done" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-pill", "data-status": "done", children: t("status.done") })
              ]
            }
          ),
          !manage && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsv-rowActions", children: renderActions(row) })
        ]
      },
      id
    );
  };
  const toggleSection = (key) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const renderSection = (key, title, rows, selectable = false, path = "") => {
    if (rows.length === 0) return null;
    const ids2 = rows.map((row) => row.session.id);
    const allSelected2 = ids2.length > 0 && ids2.every((id) => selectedSet.has(id));
    const collapsed = collapsedSections.has(key);
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "dsv-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-sectionHead", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "button",
          {
            type: "button",
            className: "dsv-sectionToggle",
            "aria-expanded": !collapsed,
            onClick: () => toggleSection(key),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-sectionChevron", "data-collapsed": collapsed, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ChevronDownIcon, { size: 12 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dsv-sectionTitleWrap", children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-sectionTitle", children: title }),
                path ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("code", { className: "dsv-sectionPath", title: path, children: path }) : null
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-sectionCount", children: rows.length })
            ]
          }
        ),
        selectable && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-sectionSelect",
            onClick: () => setSelected((prev) => {
              const next = new Set(prev);
              if (allSelected2) ids2.forEach((id) => next.delete(id));
              else ids2.forEach((id) => next.add(id));
              return [...next];
            }),
            children: allSelected2 ? t("select.clear") : t("select.group")
          }
        )
      ] }),
      !collapsed && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsv-list", role: "list", "aria-label": title, children: rows.map(renderRow) })
    ] }, key);
  };
  const buildWorkspaceSections = (rows) => {
    const buckets = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const workspace = row.workspace;
      const key = workspace?.workspaceId ?? "__none";
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          title: workspace ? workspaceLabel(workspace) : t("workspace.unknown"),
          path: String(workspace?.path ?? ""),
          rows: []
        });
      }
      buckets.get(key).rows.push(row);
    }
    for (const bucket of buckets.values()) {
      bucket.rows.sort((a, b) => Number(pinnedSet.has(b.session.id)) - Number(pinnedSet.has(a.session.id)));
    }
    return [...buckets.values()].sort((a, b) => a.title.localeCompare(b.title, "zh"));
  };
  const activeWorkspaceSections = buildWorkspaceSections(activeRows2);
  const archivedWorkspaceSections = buildWorkspaceSections(archived);
  const trashWorkspaceSections = buildWorkspaceSections(trashed);
  const sectionList = tab === "workspaces" || tab === "sessionGroups" ? [] : tab === "archived" ? groupWorkspaces ? archivedWorkspaceSections.map((group) => [group.key, group.title, group.rows, group.path]) : [["archived", t("tab.archived"), archived]] : tab === "trash" ? groupWorkspaces ? trashWorkspaceSections.map((group) => [group.key, group.title, group.rows, group.path]) : [["trash", t("tab.trash"), trashed]] : groupWorkspaces ? activeWorkspaceSections.map((group) => [group.key, group.title, group.rows, group.path]) : status === ALL2 ? [
    ["pinned", t("section.pinned"), sections.pinned],
    ["running", t("section.running"), sections.running],
    ["pending", t("section.pending"), sections.pending],
    ["done", t("section.done"), sections.done],
    ["idle", t("section.idle"), sections.idle]
  ] : [["all", t("section.all"), activeRows2]];
  const tabCounts = {
    active: annotated.length,
    archived: archived.length,
    trash: trashed.length,
    sessionGroups: sessionGroupTree.length,
    workspaceGroups: prefs.workspaceGroups?.length ?? 0,
    workspaces: workspaces?.items?.length ?? 0
  };
  const sectionKeys = sectionList.map(([key]) => key);
  const allCollapsed = sectionKeys.length > 0 && sectionKeys.every((key) => collapsedSections.has(key));
  const emptyNode = (() => {
    if (tab === "trash") {
      if (trash.state === "loading") return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-emptyHint", children: t("loading") });
      if (trash.state === "error") {
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-emptyTitle", children: t("error.trash") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-emptyHint", children: trash.error }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "dsv-clear", onClick: loadTrash, children: t("loading") })
        ] });
      }
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-emptyTitle", children: t("trash.empty") });
    }
    if (tab === "archived") return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-emptyTitle", children: t("archived.empty") });
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-emptyTitle", children: annotated.length === 0 ? t("empty.title") : t("empty.filtered") }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-emptyHint", children: t("empty.hint") }),
      filtersActive && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "dsv-clear", onClick: clearFilters, children: t("empty.clear") })
    ] });
  })();
  const empty = tab === "workspaces" ? false : tab === "active" ? activeRows2.length === 0 : tab === "archived" ? archived.length === 0 : trashed.length === 0;
  const sessionDragRef = (0, import_react5.useRef)(null);
  const orderSessionItems = (items2, orderKey) => {
    const order = prefs.sessionGroupOrders?.[orderKey];
    if (!order?.length) return items2;
    const rank = new Map(order.map((id, index) => [id, index]));
    return [...items2].sort((a, b) => {
      const ai = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bi = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  };
  const assignSessionTo = (sessionId, groupId, beforeId, after = false) => {
    if (!sessionId) return;
    const assignments = { ...prefs.sessionAssignments ?? {} };
    if (groupId) assignments[sessionId] = groupId;
    else delete assignments[sessionId];
    const orderKey = groupId ?? "__root";
    const orders = { ...prefs.sessionGroupOrders ?? {} };
    for (const key of Object.keys(orders)) {
      if (key !== orderKey && orders[key]?.includes(sessionId)) {
        orders[key] = orders[key].filter((id) => id !== sessionId);
      }
    }
    const base = (orders[orderKey] ?? []).filter((id) => id !== sessionId);
    if (beforeId && beforeId !== sessionId) {
      const at = base.indexOf(beforeId);
      if (at >= 0) base.splice(after ? at + 1 : at, 0, sessionId);
      else base.push(sessionId);
    } else {
      base.push(sessionId);
    }
    orders[orderKey] = base;
    setPrefs({ sessionAssignments: assignments, sessionGroupOrders: orders });
  };
  const collapsedSessionGroups = collapsedSections;
  const sessionGroupSections = sessionGroupTree.map((group) => ({
    ...group,
    items: orderSessionItems(filteredGroupItems.filter((item) => sessionAssignments[item.id] === group.id), group.id)
  }));
  const ungroupedSessionItems = orderSessionItems(filteredGroupItems.filter(
    (item) => !item.id || !sessionGroupTree.some((group) => group.id === sessionAssignments[item.id])
  ), "__root");
  const renderGroupSessionRow = (item) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    "div",
    {
      className: "dsv-groupSession",
      draggable: true,
      onDragStart: (event) => {
        sessionDragRef.current = item.id;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        event.currentTarget.classList.add("dsv-dragSource");
      },
      onDragOver: (event) => {
        if (!sessionDragRef.current || sessionDragRef.current === item.id) return;
        event.preventDefault();
      },
      onDrop: (event) => {
        const from = sessionDragRef.current;
        if (!from || from === item.id) return;
        event.preventDefault();
        event.stopPropagation();
        sessionDragRef.current = null;
        const groupId = sessionGroupTree.some((group) => group.id === sessionAssignments[item.id]) ? sessionAssignments[item.id] : null;
        const rect = event.currentTarget.getBoundingClientRect();
        assignSessionTo(from, groupId, item.id, event.clientY > rect.top + rect.height / 2);
        event.currentTarget.classList.remove("dsv-dragSource");
      },
      onDragEnd: (event) => {
        sessionDragRef.current = null;
        event.currentTarget.classList.remove("dsv-dragSource");
      },
      onContextMenu: (event) => {
        event.preventDefault();
        setSessionMenu({ itemId: item.id, x: event.clientX, y: event.clientY });
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("button", { type: "button", className: "dsv-groupSessionOpen", onClick: () => openSession(item.id), title: item.title, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-groupSessionTitle", children: item.title }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-groupSessionMeta", children: item.workspace })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "select",
          {
            className: "dsv-select dsv-groupSessionSelect",
            value: sessionAssignments[item.id] ?? "",
            "aria-label": t("groups.assign"),
            onChange: (event) => assignSession(item.id, event.target.value),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "", children: t("group.ungrouped") }),
              sessionGroupTree.map((group) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("option", { value: group.id, children: [
                group.depth > 0 ? `${"\u2014".repeat(group.depth)} ` : "",
                group.name
              ] }, group.id))
            ]
          }
        )
      ]
    },
    item.id
  );
  const renderSessionGroupBlock = (key, label, depth, items2, groupId = null) => {
    const collapsed = collapsedSessionGroups.has(key);
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "div",
      {
        className: "dsv-groupBlock",
        onDragOver: (event) => {
          if (!sessionDragRef.current) return;
          event.preventDefault();
          event.currentTarget.classList.add("dsv-dropTarget");
        },
        onDragLeave: (event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          event.currentTarget.classList.remove("dsv-dropTarget");
        },
        onDrop: (event) => {
          const from = sessionDragRef.current;
          if (!from) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.classList.remove("dsv-dropTarget");
          sessionDragRef.current = null;
          assignSessionTo(from, groupId, null);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              className: "dsv-groupBlockHead",
              "aria-expanded": !collapsed,
              style: { paddingLeft: 8 + depth * 16 },
              onClick: () => toggleSection(key),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-sectionChevron", "data-collapsed": collapsed || void 0, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ChevronRightIcon, { size: 12 }) }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-groupBlockName", children: label }),
                (() => {
                  const status2 = groupStatus(items2);
                  return status2 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: `dsv-groupStatusMark dsv-groupStatusMark--${status2}`, title: t(statusLabelKey(status2)), children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-dot", "data-status": status2 }) }) : null;
                })(),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-groupBlockCount", children: items2.length })
              ]
            }
          ),
          !collapsed && (items2.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-groupEmpty", children: t("groups.empty") }) : items2.map(renderGroupSessionRow))
        ]
      },
      key
    );
  };
  const sessionGroupsPage = /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "dsv-groupsPage", "aria-label": t("tab.sessionGroups"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-groupsHead", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "dsv-groupsTitle", children: t("groups.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-groupsHint", children: t("groups.hint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "dsv-btn", onClick: () => setGroupDialog(true), children: t("groups.manage") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "input",
      {
        className: "dsv-input dsv-groupsSearch",
        value: groupsQuery,
        placeholder: t("groups.search"),
        "aria-label": t("groups.search"),
        onChange: (event) => setGroupsQuery(event.target.value)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-groupsList", children: [
      sessionGroupSections.map((group) => renderSessionGroupBlock(`g:${group.id}`, group.name, group.depth, group.items, group.id)),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "div",
        {
          className: `dsv-groupRootRows${ungroupedSessionItems.length === 0 ? " dsv-groupRootEmpty" : ""}`,
          "aria-label": t("group.ungrouped"),
          onDragOver: (event) => {
            if (!sessionDragRef.current) return;
            event.preventDefault();
            event.currentTarget.classList.add("dsv-dropTarget");
          },
          onDragLeave: (event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            event.currentTarget.classList.remove("dsv-dropTarget");
          },
          onDrop: (event) => {
            const from = sessionDragRef.current;
            if (!from) return;
            event.preventDefault();
            event.currentTarget.classList.remove("dsv-dropTarget");
            sessionDragRef.current = null;
            assignSessionTo(from, null, null);
          },
          children: ungroupedSessionItems.map(renderGroupSessionRow)
        }
      ),
      sessionGroupTree.length === 0 && ungroupedSessionItems.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-groupEmpty", children: t("groups.empty") })
    ] })
  ] });
  const workspaceGroupsPage = /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "dsv-groupsPage dsv-groupsEmbedded", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-groupsHead", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "dsv-groupsTitle", children: t("groups.workspaceTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-groupsHint", children: t("groups.workspaceHint") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      WorkspaceGroupsDialog,
      {
        t,
        prefs,
        workspaces,
        onChange: setPrefs,
        onClose: () => {
        },
        embedded: true
      }
    )
  ] });
  const workspaceFilterPage = /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "dsv-wsPage", "aria-label": t("tab.workspaces"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-wsIntro", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "dsv-wsTitle", children: t("workspaceFilter.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-wsHint", children: t("workspaceFilter.hint") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-wsTools", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { className: "dsv-wsShowToggle", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t("settings.showWorkspaces") }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "input",
          {
            className: "dsv-switch",
            type: "checkbox",
            role: "switch",
            checked: prefs.showWorkspaces,
            "aria-label": t("settings.showWorkspaces"),
            onChange: (event) => setPrefs({ showWorkspaces: event.target.checked })
          }
        )
      ] }),
      hiddenWorkspaceIds.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "button",
        {
          type: "button",
          className: "dsv-btn",
          onClick: () => setPrefs({ hiddenWorkspaceIds: [] }),
          children: t("settings.workspaceFilterReset")
        }
      ) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-wsList", role: "list", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        "button",
        {
          type: "button",
          className: "dsv-wsRow dsv-wsRowAll",
          role: "listitem",
          "data-active": workspaceId === ALL2 ? "true" : "false",
          "aria-pressed": workspaceId === ALL2,
          onClick: () => {
            setWorkspaceId(ALL2);
            setTab("active");
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dsv-wsMain", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-wsName", children: t("filter.allWorkspaces") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-wsPath", children: t("workspaceFilter.allHint") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-wsCount", children: t("counts.summary", { n: annotated.length }) })
          ]
        }
      ),
      filterWorkspaceItems.map((workspace) => {
        const id = workspace?.workspaceId;
        const path = String(workspace?.path ?? "");
        const title = String(workspace?.title || path || id || "");
        const hidden = hiddenWorkspaceSet.has(id);
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          "div",
          {
            className: "dsv-wsRow",
            role: "listitem",
            "data-active": workspaceId === id ? "true" : "false",
            "data-hidden": hidden ? "true" : "false",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                "button",
                {
                  type: "button",
                  className: "dsv-wsMain dsv-wsApply",
                  "aria-pressed": workspaceId === id,
                  title: t("filter.applyWorkspace"),
                  onClick: () => {
                    setWorkspaceId(id);
                    setQuery("");
                    setStatus(ALL2);
                    setTab("active");
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-wsName", title, children: title }),
                    path ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("code", { className: "dsv-wsPath", title: path, children: path }) : null
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-wsCount", children: t("counts.summary", { n: workspace?.sessionIds?.length ?? 0 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "input",
                {
                  className: "dsv-switch",
                  type: "checkbox",
                  role: "switch",
                  checked: !hidden,
                  "aria-label": t("settings.workspaceShow", { name: title }),
                  onChange: () => toggleWorkspaceVisibility(id)
                }
              )
            ]
          },
          id ?? path
        );
      }),
      filterWorkspaceItems.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-wsEmpty", children: t("settings.workspaceFilterEmpty") }) : null
    ] })
  ] });
  const confirmCopy = confirm ? CONFIRM_COPY[confirm.kind] : null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    "div",
    {
      className: "dsv-page",
      "aria-busy": busy || void 0,
      onWheel: (event) => {
        if (event.target.closest(".dsv-scroll, .dsv-dialog, .dsv-toast")) return;
        const scroller = event.currentTarget.querySelector(".dsv-scroll");
        if (scroller) scroller.scrollTop += event.deltaY;
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("style", { children: STYLES }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsv-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-content", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("header", { className: "dsv-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-heading", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h1", { className: "dsv-title", children: t("title") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-subtitle", children: t("subtitle") })
            ] }),
            tab !== "settings" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-total", "aria-live": "polite", children: tab === "workspaces" ? t("counts.workspaces", { n: tabCounts.workspaces }) : tab === "sessionGroups" ? t("counts.groups", { n: tabCounts.sessionGroups }) : tab === "workspaceGroups" ? t("counts.groups", { n: tabCounts.workspaceGroups }) : t("counts.summary", { n: tabCounts[tab] }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("nav", { className: "dsv-tabs", role: "tablist", "aria-label": t("title"), children: TABS.map((value) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              role: "tab",
              className: "dsv-tab",
              "aria-selected": tab === value,
              onClick: () => setTab(value),
              children: [
                t(`tab.${value}`),
                value !== "workspaces" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-tabCount", children: tabCounts[value] })
              ]
            },
            value
          )) }),
          tab !== "workspaces" && tab !== "sessionGroups" && tab !== "workspaceGroups" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-toolbar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-search", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-searchIcon", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(SearchIcon, {}) }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-selectWrap", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                "select",
                {
                  className: "dsv-select",
                  value: workspaceId,
                  onChange: (event) => setWorkspaceId(event.target.value),
                  "aria-label": t("filter.workspace"),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: ALL2, children: t("filter.allWorkspaces") }),
                    workspaceOptions.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: workspace.id, children: workspace.label }, workspace.id))
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-chevron", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ChevronDownIcon, {}) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-selectWrap", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                "select",
                {
                  className: "dsv-select",
                  value: groupWorkspaces ? "workspace" : "status",
                  onChange: (event) => setGroupWorkspaces(event.target.value === "workspace"),
                  "aria-label": t("filter.group"),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "workspace", children: t("manage.byWorkspace") }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "status", children: t("manage.byStatus") })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-chevron", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ChevronDownIcon, {}) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-toolbarActions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "dsv-btn", disabled: busy, onClick: runCheck, children: t("action.check") }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsv-btn",
                  disabled: sectionKeys.length === 0,
                  onClick: () => setCollapsedSections(allCollapsed ? /* @__PURE__ */ new Set() : new Set(sectionKeys)),
                  children: t(allCollapsed ? "action.expandAll" : "action.collapseAll")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
              )
            ] })
          ] }),
          tab === "active" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsv-chips", role: "group", "aria-label": t("filter.status"), children: [ALL2, ...STATUS_LIST].map((value) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              className: "dsv-chip",
              "aria-pressed": status === value,
              onClick: () => setStatus(value),
              children: [
                value !== ALL2 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-dot", "data-status": value, "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: value === ALL2 ? t("counts.all") : t(statusLabelKey(value)) }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-chipCount", children: counts[value] ?? 0 })
              ]
            },
            value
          )) }),
          manage && tab !== "workspaces" && tab !== "sessionGroups" && tab !== "workspaceGroups" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-batch", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dsv-batchText", children: t("select.count", { n: selected.length }) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "button",
              {
                type: "button",
                className: "dsv-btn",
                onClick: () => setSelected(allSelected ? [] : tabIds.filter((id) => !selectedSet.has(id)).concat(selected)),
                children: allSelected ? t("select.clear") : t("select.all")
              }
            ),
            tab === "active" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsv-btn",
                  disabled: selected.length === 0,
                  onClick: () => requestConfirm(
                    "archive",
                    activeRows2.filter((row) => selectedSet.has(row.session.id))
                  ),
                  children: t("batch.archive")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsv-btn",
                  "data-tone": "danger",
                  disabled: selected.length === 0,
                  onClick: () => requestConfirm(
                    "trash",
                    activeRows2.filter((row) => selectedSet.has(row.session.id))
                  ),
                  children: t("batch.trash")
                }
              )
            ] }),
            tab === "archived" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsv-btn",
                  disabled: selected.length === 0,
                  onClick: () => restoreMany(selected),
                  children: t("batch.restore")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsv-btn",
                  "data-tone": "danger",
                  disabled: selected.length === 0,
                  onClick: () => requestConfirm("trash", archived.filter((row) => selectedSet.has(row.session.id))),
                  children: t("batch.trash")
                }
              )
            ] }),
            tab === "trash" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsv-btn",
                  disabled: selected.length === 0,
                  onClick: () => restoreFromTrash(selected),
                  children: t("batch.restore")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
              ),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsv-btn",
                  "data-tone": "danger",
                  disabled: selected.length === 0,
                  onClick: () => {
                    const rows = trashed.filter((row) => selectedSet.has(row.session.id));
                    requestConfirm("forcePurge", rows);
                  },
                  children: t("batch.forcePurge")
                }
              )
            ] })
          ] }),
          workspaces?.state === "error" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsv-banner", children: t("error.workspaces") }),
          tab === "workspaces" ? workspaceFilterPage : tab === "sessionGroups" ? sessionGroupsPage : tab === "workspaceGroups" ? workspaceGroupsPage : empty ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsv-empty", children: emptyNode }) : sectionList.map(([key, title, rows, path]) => renderSection(key, title, rows, manage && groupWorkspaces && tab === "active", path))
        ] }) }),
        confirm && confirmCopy && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsv-dialogOverlay", role: "presentation", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "dsv-dialog-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { className: "dsv-dialogTitle", id: "dsv-dialog-title", children: t(confirmCopy.title) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-dialogBody", children: t(confirmCopy.body, { n: confirm.ids.length }) }),
          confirmCopy.warning && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dsv-dialogWarning", children: t(confirmCopy.warning) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dsv-dialogActions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "dsv-btn", onClick: () => setConfirm(null), children: t("confirm.cancel") }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
        groupDialog && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          SessionGroupsDialog,
          {
            t,
            prefs,
            sessions: sessionGroupItems,
            onChange: (patch) => setPrefs(patch),
            onClose: () => setGroupDialog(false)
          }
        ),
        toast && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dsv-toast", role: "status", "data-tone": toast.tone, children: toast.text })
      ]
    }
  );
}

// src/client/settings-section.jsx
var import_react6 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
var GLOW_EFFECTS = ["marquee", "aurora", "pulse", "rainbow", "comet", "scan", "dash"];
function Row({ label, description, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: `dsv-settingRow${description ? "" : " dsv-settingRow--plain"}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dsv-settingText", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-settingLabel", children: label }),
      description ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-settingDesc", children: description }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dsv-settingControl", children })
  ] });
}
function Toggle({ label, description, value, onChange }) {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { className: `dsv-settingRow dsv-settingRow--toggle${description ? "" : " dsv-settingRow--plain"}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dsv-settingText", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-settingLabel", children: label }),
      description ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-settingDesc", children: description }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-settingControl", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      "input",
      {
        className: "dsv-switch",
        type: "checkbox",
        role: "switch",
        checked: value,
        "aria-label": label,
        onChange: (event) => onChange(event.target.checked)
      }
    ) })
  ] });
}
function Group({ title, description, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: "dsv-settingsGroup", "aria-label": title, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dsv-settingsGroupHead", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "dsv-settingsGroupTitle", children: title }),
      description ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "dsv-settingsGroupHint", children: description }) : null
    ] }),
    children
  ] });
}
function SessionViewSettings({ t }) {
  const prefs = (0, import_react6.useSyncExternalStore)(subscribePrefs, getPrefs, getPrefs);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: "dsv-settings dsv-settingsPage", "aria-label": t("settings.nav"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("style", { children: STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("header", { className: "dsv-settingsHeader", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h2", { className: "dsv-settingsTitle", children: t("settings.nav") }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "dsv-settingsIntro", children: t("settings.hint") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(Group, { title: t("settings.group.display"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Row, { label: t("settings.mode"), description: t("settings.desc.mode"), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "select",
        {
          className: "dsv-select",
          value: prefs.mode,
          onChange: (event) => setPrefs({ mode: event.target.value }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "session", children: t("settings.mode.session") }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "native", children: t("settings.mode.native") })
          ]
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.showSubagents"),
          description: t("settings.desc.subagents"),
          value: prefs.showSubagents,
          onChange: (value) => setPrefs({ showSubagents: value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.showIdle"),
          description: t("settings.desc.idle"),
          value: prefs.showIdle,
          onChange: (value) => setPrefs({ showIdle: value })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(Group, { title: t("settings.group.sections"), description: t("settings.desc.sections"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.showRecent"),
          value: prefs.showRecent,
          onChange: (value) => setPrefs({ showRecent: value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.showPinned"),
          value: prefs.showPinned,
          onChange: (value) => setPrefs({ showPinned: value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.showActive"),
          value: prefs.showActive,
          onChange: (value) => setPrefs({ showActive: value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.showWorkspaces"),
          description: t("settings.desc.workspaces"),
          value: prefs.showWorkspaces,
          onChange: (value) => setPrefs({ showWorkspaces: value })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(Group, { title: t("settings.group.limits"), description: t("settings.desc.limits"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Row, { label: t("settings.activeLimit"), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "input",
        {
          className: "dsv-input dsv-number",
          type: "number",
          min: "0",
          max: "50",
          value: prefs.activeLimit,
          onChange: (event) => setPrefs({ activeLimit: event.target.value })
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Row, { label: t("settings.recentLimit"), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "input",
        {
          className: "dsv-input dsv-number",
          type: "number",
          min: "0",
          max: "50",
          value: prefs.recentLimit,
          onChange: (event) => setPrefs({ recentLimit: event.target.value })
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Row, { label: t("settings.workspaceLimit"), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "input",
        {
          className: "dsv-input dsv-number",
          type: "number",
          min: "0",
          max: "50",
          value: prefs.workspaceLimit,
          onChange: (event) => setPrefs({ workspaceLimit: event.target.value })
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Row, { label: t("settings.sort"), description: t("settings.desc.sort"), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "select",
        {
          className: "dsv-select",
          value: prefs.sort,
          onChange: (event) => setPrefs({ sort: event.target.value }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "updated", children: t("settings.sort.updated") }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "manual", children: t("settings.sort.manual") })
          ]
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Row, { label: t("settings.workspaceGroupMode"), description: t("settings.desc.workspaceGroupMode"), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "select",
        {
          className: "dsv-select",
          value: prefs.workspaceGroupMode ?? "nested",
          onChange: (event) => setPrefs({ workspaceGroupMode: event.target.value }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "default", children: t("group.mode.default") }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "nested", children: t("group.mode.nested") }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "workspace", children: t("group.mode.workspace") })
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(Group, { title: t("settings.group.behavior"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Row, { label: t("settings.archived"), description: t("settings.desc.archived"), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "select",
        {
          className: "dsv-select",
          value: prefs.archivedFilter,
          onChange: (event) => setPrefs({ archivedFilter: event.target.value }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "hide", children: t("settings.archived.hide") }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "show", children: t("settings.archived.show") }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: "only", children: t("settings.archived.only") })
          ]
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.focusEnabled"),
          description: t("settings.desc.focusEnabled"),
          value: prefs.focusEnabled !== false,
          onChange: (value) => setPrefs({ focusEnabled: value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.showTimes"),
          description: t("settings.desc.times"),
          value: prefs.showTimes,
          onChange: (value) => setPrefs({ showTimes: value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        Toggle,
        {
          label: t("settings.compact"),
          description: t("settings.desc.compact"),
          value: prefs.compact,
          onChange: (value) => setPrefs({ compact: value })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Group, { title: t("settings.group.glow"), description: t("settings.glow.hint"), children: ["running", "pending", "done"].map((status) => {
      const key = status === "running" ? "glowRunning" : status === "pending" ? "glowPending" : "glowDone";
      const effect = prefs[key] || "off";
      const enabled = effect !== "off";
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dsv-glowCard", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dsv-glowCardHead", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-glowCardTitle", children: t(`settings.glow.${status}`) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            "input",
            {
              className: "dsv-switch",
              type: "checkbox",
              role: "switch",
              checked: enabled,
              "aria-label": t(`settings.glow.${status}`),
              onChange: (event) => setPrefs({ [key]: event.target.checked ? "marquee" : "off" })
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dsv-glowPreview", "data-status": status, children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-dot", "data-status": status }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-glowPreviewTitle", children: t("settings.glow.sample") }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-glowPreviewTime", children: t("settings.glow.now") }),
          enabled ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            "span",
            {
              className: `dsv-sideGlow dsv-sideGlow--${effect}`,
              "data-status": status,
              "aria-hidden": "true"
            }
          ) : null
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dsv-glowChoices", role: "group", "aria-label": t("settings.glow.style"), children: GLOW_EFFECTS.map((option) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-glowChoice",
            "aria-pressed": effect === option,
            onClick: () => setPrefs({ [key]: option }),
            children: t(`settings.glow.${option}`)
          },
          option
        )) })
      ] }, status);
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("footer", { className: "dsv-settingsFooter", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", className: "dsv-btn", onClick: () => resetPrefs(), children: t("settings.reset") }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-settingsFooterHint", children: t("settings.resetHint") }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dsv-settingsShortcuts", children: t("settings.shortcuts") })
    ] })
  ] });
}

// src/client/sidebar-board.jsx
var import_react_dom3 = require("react-dom");
var import_react9 = require("react");

// src/client/sidebar-workspace.jsx
var import_react8 = require("react");
var import_react_dom2 = require("react-dom");

// src/client/focus-mode.jsx
var import_react7 = require("react");
var import_jsx_runtime8 = require("react/jsx-runtime");
var CHIP_LIMIT = 4;
function createGroupId() {
  return `focus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function updateGroup(groups, id, patch) {
  return groups.map((group) => group.id === id ? { ...group, ...patch } : group);
}
function groupName(t, group, index) {
  return group.name || t("focus.defaultName", { n: index + 1 });
}
function groupLabel(t, prefs, group) {
  const groups = prefs?.focusGroups ?? [];
  const index = groups.findIndex((entry) => entry.id === group?.id);
  return groupName(t, group ?? {}, Math.max(index, 0));
}
function memberSummary(group, workspaces, max = CHIP_LIMIT) {
  const byId = new Map((workspaces?.items ?? []).map((workspace) => [workspace.workspaceId, workspace]));
  const labels = [];
  let stale = 0;
  for (const id of group?.workspaceIds ?? []) {
    const workspace = byId.get(id);
    if (!workspace) {
      stale += 1;
      continue;
    }
    labels.push(workspaceLabel(workspace));
  }
  const shown = labels.slice(0, max);
  return { shown, extra: Math.max(0, labels.length - shown.length), stale, known: labels.length };
}
function FocusBar({ t, prefs, onManage, onExit }) {
  const group = focusGroupById(prefs);
  if (!group) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusBar", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusBarIcon", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(TargetIcon, { size: 12 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "button",
      {
        type: "button",
        className: "dsv-focusBarName",
        title: t("focus.manage"),
        onClick: onManage,
        children: groupLabel(t, prefs, group)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusBarCount", children: t("focus.memberCount", { n: group.workspaceIds.length }) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-focusBarBtn", onClick: onManage, children: t("focus.switch") }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-focusBarBtn", onClick: onExit, children: t("focus.exit") })
  ] });
}
function FocusMemberEditor({ t, group, workspaces, onToggle, onSelectAll, onClearAll }) {
  const items2 = workspaces?.items ?? [];
  const selected = group?.workspaceIds ?? [];
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusMembers", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusMembersHead", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: t("focus.selectedCount", { n: selected.length }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "dsv-focusMembersTools", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-sideTextBtn", onClick: onSelectAll, children: t("focus.selectAll") }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-sideTextBtn", onClick: onClearAll, children: t("focus.clearAll") })
      ] })
    ] }),
    items2.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "dsv-sideHint", children: t("focus.noWorkspaces") }) : items2.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { className: "dsv-sideCheck", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "input",
        {
          type: "checkbox",
          checked: selected.includes(workspace.workspaceId),
          onChange: () => onToggle(workspace.workspaceId)
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: workspaceLabel(workspace) })
    ] }, workspace.workspaceId))
  ] });
}
function FocusMembersDialog({ t, prefs, workspaces, groupId, onChange, onClose }) {
  const groups = prefs?.focusGroups ?? [];
  const group = groups.find((entry) => entry.id === groupId);
  if (!group) return null;
  const items2 = workspaces?.items ?? [];
  const setIds = (workspaceIds) => {
    onChange({ focusGroups: updateGroup(groups, group.id, { workspaceIds }) });
  };
  const toggle = (workspaceId) => {
    onChange(toggleFocusGroupMember(prefs, group.id, workspaceId));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    Dialog,
    {
      title: t("focus.members.title"),
      onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-btn", "data-tone": "primary", onClick: onClose, children: t("focus.done") }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "dsv-focusDialogName", children: groupLabel(t, prefs, group) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          FocusMemberEditor,
          {
            t,
            group,
            workspaces,
            onToggle: toggle,
            onSelectAll: () => setIds(items2.map((workspace) => workspace.workspaceId)),
            onClearAll: () => setIds([])
          }
        )
      ]
    }
  );
}
function FocusDialog({ t, prefs, workspaces, onChange, onClose, initialCreating = false }) {
  const [creating, setCreating] = (0, import_react7.useState)(initialCreating);
  const [newName, setNewName] = (0, import_react7.useState)("");
  const [newIds, setNewIds] = (0, import_react7.useState)([]);
  const [renamingId, setRenamingId] = (0, import_react7.useState)("");
  const [renameValue, setRenameValue] = (0, import_react7.useState)("");
  const [editingId, setEditingId] = (0, import_react7.useState)("");
  const [deleteId, setDeleteId] = (0, import_react7.useState)("");
  const groups = prefs.focusGroups ?? [];
  const activeId = prefs.focusGroupId ?? "";
  const active = focusGroupById(prefs);
  const items2 = workspaces?.items ?? [];
  const enter = (group) => {
    onChange({ focusGroupId: activeId === group.id ? "" : group.id });
  };
  const toggleNew = (workspaceId) => {
    setNewIds((current) => current.includes(workspaceId) ? current.filter((id) => id !== workspaceId) : [...current, workspaceId]);
  };
  const setMembers = (group, workspaceIds) => {
    onChange({ focusGroups: updateGroup(groups, group.id, { workspaceIds }) });
  };
  const toggleMember = (group, workspaceId) => {
    onChange(toggleFocusGroupMember(prefs, group.id, workspaceId));
  };
  const create = () => {
    if (newIds.length === 0) return;
    const id = createGroupId();
    const name = newName.trim() || t("focus.defaultName", { n: groups.length + 1 });
    onChange({ focusGroups: [...groups, { id, name, workspaceIds: [...newIds] }] });
    setNewName("");
    setNewIds([]);
    setCreating(false);
  };
  const startRename = (group) => {
    setRenamingId(group.id);
    setRenameValue(group.name || groupName(t, group, groups.indexOf(group)));
  };
  const commitRename = () => {
    if (!renamingId) return;
    const name = renameValue.trim().slice(0, 60);
    onChange({ focusGroups: updateGroup(groups, renamingId, { name }) });
    setRenamingId("");
    setRenameValue("");
  };
  const remove = () => {
    const index = groups.findIndex((group) => group.id === deleteId);
    if (index < 0) return;
    const rest = groups.filter((group) => group.id !== deleteId);
    onChange({
      focusGroups: rest,
      ...activeId === deleteId ? { focusGroupId: "" } : {}
    });
    if (editingId === deleteId) setEditingId("");
    setDeleteId("");
  };
  const deleting = groups.find((group) => group.id === deleteId);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    Dialog,
    {
      wide: true,
      title: t("focus.title"),
      onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-btn", "data-tone": "primary", onClick: onClose, children: t("focus.done") }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusStatus", "data-active": Boolean(active), children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusStatusIcon", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(TargetIcon, { size: 12 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusStatusText", children: active ? t("focus.current", { name: groupLabel(t, prefs, active) }) : t("focus.allSessions") }),
          active && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", onClick: () => onChange({ focusGroupId: "" }), children: t("focus.exit") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusListHead", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusListTitle", children: t("focus.listTitle", { n: groups.length }) }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-btn dsv-btnSm",
              "data-tone": creating ? void 0 : "primary",
              onClick: () => setCreating((value) => !value),
              children: creating ? t("dialog.cancel") : t("focus.new")
            }
          )
        ] }),
        creating && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusCreate", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "input",
            {
              autoFocus: true,
              className: "dsv-input",
              placeholder: t("focus.namePlaceholder"),
              value: newName,
              maxLength: 60,
              onChange: (event) => setNewName(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter") create();
                if (event.key === "Escape") setCreating(false);
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "dsv-focusMembers", children: items2.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "dsv-sideHint", children: t("focus.noWorkspaces") }) : items2.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { className: "dsv-sideCheck", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
              "input",
              {
                type: "checkbox",
                checked: newIds.includes(workspace.workspaceId),
                onChange: () => toggleNew(workspace.workspaceId)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: workspaceLabel(workspace) })
          ] }, workspace.workspaceId)) }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusCreateFoot", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-sideHint", children: t("focus.selectedCount", { n: newIds.length }) }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
              "button",
              {
                type: "button",
                className: "dsv-btn dsv-btnSm",
                "data-tone": "primary",
                disabled: newIds.length === 0,
                onClick: create,
                children: t("focus.createAction")
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusList", children: [
          groups.map((group, index) => {
            const summary = memberSummary(group, workspaces);
            const isActive = group.id === activeId;
            return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("article", { className: "dsv-focusCard", "data-active": isActive, children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusCardHead", children: [
                renamingId === group.id ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "dsv-focusRename", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                    "input",
                    {
                      autoFocus: true,
                      className: "dsv-input",
                      value: renameValue,
                      maxLength: 60,
                      onChange: (event) => setRenameValue(event.target.value),
                      onKeyDown: (event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") setRenamingId("");
                      }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-btn dsv-btnSm", "data-tone": "primary", onClick: commitRename, children: t("dialog.save") })
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "dsv-focusCardName",
                    "aria-pressed": isActive,
                    onClick: () => enter(group),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(TargetIcon, { size: 12 }),
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: groupName(t, group, index) })
                    ]
                  }
                ),
                isActive && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusBadge", children: t("focus.activeBadge") }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusMeta", children: t("focus.memberCount", { n: summary.known + summary.stale }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusChips", children: [
                summary.shown.map((label, chipIndex) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusChip", children: label }, `${group.id}-${chipIndex}`)),
                summary.extra > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusChip", "data-more": "true", children: t("focus.moreMembers", { n: summary.extra }) }),
                summary.stale > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusChip", "data-stale": "true", children: t("focus.staleCount", { n: summary.stale }) }),
                summary.known === 0 && summary.stale === 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dsv-focusChipEmpty", children: t("focus.membersEmpty") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dsv-focusCardFoot", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "dsv-btn dsv-btnSm",
                    "data-tone": isActive ? void 0 : "primary",
                    onClick: () => enter(group),
                    children: isActive ? t("focus.exit") : t("focus.enter")
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "dsv-focusCardActions", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "dsv-sideTextBtn", onClick: () => startRename(group), children: t("action.rename") }),
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "dsv-sideTextBtn",
                      onClick: () => setEditingId(editingId === group.id ? "" : group.id),
                      children: t("focus.editMembers")
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "dsv-sideTextBtn dsv-focusDanger",
                      onClick: () => setDeleteId(group.id),
                      children: t("dialog.delete")
                    }
                  )
                ] })
              ] }),
              editingId === group.id && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                FocusMemberEditor,
                {
                  t,
                  group,
                  workspaces,
                  onToggle: (workspaceId) => toggleMember(group, workspaceId),
                  onSelectAll: () => setMembers(group, items2.map((workspace) => workspace.workspaceId)),
                  onClearAll: () => setMembers(group, [])
                }
              )
            ] }, group.id);
          }),
          groups.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "dsv-sideEmpty", children: t("focus.empty") })
        ] }),
        deleting && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          ConfirmDialog,
          {
            t,
            title: t("focus.delete.title"),
            body: t("focus.delete.body", { name: groupName(t, deleting, groups.indexOf(deleting)) }),
            confirmKey: "dialog.delete",
            onConfirm: remove,
            onClose: () => setDeleteId("")
          }
        )
      ]
    }
  );
}

// src/client/sidebar-workspace.jsx
var import_jsx_runtime9 = require("react/jsx-runtime");
function errorText2(error) {
  return errorMessage(error);
}
function looksRunning(error) {
  return /running|active|stop|运行|停止/i.test(errorText2(error));
}
function familyIds(rows, topIds) {
  const wanted = new Set(topIds);
  const ids2 = /* @__PURE__ */ new Set();
  let inFamily = false;
  for (const row of rows) {
    if ((row.depth ?? 0) === 0) inFamily = wanted.has(row.session.id);
    if (inFamily) ids2.add(row.session.id);
  }
  return ids2;
}
function familyFor(rows, topId) {
  const out = [];
  let inFamily = false;
  for (const row of rows) {
    if ((row.depth ?? 0) === 0) inFamily = row.session.id === topId;
    if (inFamily) out.push(row);
  }
  return out;
}
function takeTopFamilies(rows, tops, limit) {
  const picked = limit > 0 ? tops.slice(0, limit) : tops;
  const ids2 = familyIds(rows, picked.map((row) => row.session.id));
  return rows.filter((row) => ids2.has(row.session.id));
}
function sortFamilies(rows, compare) {
  const families = [];
  for (const row of rows) {
    if ((row.depth ?? 0) === 0) families.push({ top: row, rows: [row] });
    else if (families.length > 0) families[families.length - 1].rows.push(row);
    else families.push({ top: row, rows: [row] });
  }
  families.sort((a, b) => compare(a.top, b.top));
  return families.flatMap((family) => family.rows);
}
function byUpdated(a, b) {
  return (b.session.updatedAt ?? 0) - (a.session.updatedAt ?? 0);
}
function applyFamilyOrder(rows, order) {
  if (!Array.isArray(order) || order.length === 0) return rows;
  const index = new Map(order.map((id, position) => [id, position]));
  return sortFamilies(rows, (a, b) => {
    const ai = index.get(a.session.id);
    const bi = index.get(b.session.id);
    if (ai === void 0 && bi === void 0) return 0;
    if (ai === void 0) return 1;
    if (bi === void 0) return -1;
    return ai - bi;
  });
}
function usePrefs() {
  return (0, import_react8.useSyncExternalStore)(subscribePrefs, getPrefs, getPrefs);
}
function formatTime(t, updatedAt, now) {
  const value = formatRelativeTime(updatedAt, now);
  if (value.key === "time.justNow") return t("time.justNow");
  return t(value.key, value.n === void 0 ? void 0 : { n: value.n });
}
function Dot({ status }) {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-dot", "data-status": status ?? "idle", "aria-hidden": "true" });
}
function SidebarWorkspacePane({
  t,
  useSessions,
  useSessionStatus,
  useWorkspaces,
  openSession,
  pinSession,
  unpinSession,
  archiveSession,
  unarchiveSession,
  startSession,
  forkSession,
  renameSession,
  renameWorkspace,
  deleteWorkspace,
  createWorkspace,
  insertWorkspaceBefore,
  pickDirectory,
  searchSessions,
  openPanel
}) {
  const prefs = usePrefs();
  const glowFor = (row) => row.status === "running" ? prefs.glowRunning : row.status === "pending" ? prefs.glowPending : row.status === "done" ? prefs.glowDone : "off";
  const focusGroup = focusGroupById(prefs);
  const sessions = useSessions((state2) => state2);
  const statuses = useSessionStatus((state2) => state2);
  const workspaces = useWorkspaces((state2) => state2);
  const paneRef = (0, import_react8.useRef)(null);
  const [query, setQuery] = (0, import_react8.useState)("");
  const [now, setNow] = (0, import_react8.useState)(() => Date.now());
  const [flash, setFlash] = (0, import_react8.useState)("");
  const [busy, setBusy] = (0, import_react8.useState)(false);
  const [menu, setMenu] = (0, import_react8.useState)(null);
  const [dialog, setDialog] = (0, import_react8.useState)(null);
  const [searchOpen, setSearchOpen] = (0, import_react8.useState)(false);
  const [expandedActive, setExpandedActive] = (0, import_react8.useState)(false);
  const [expandedRecent, setExpandedRecent] = (0, import_react8.useState)(false);
  const [expandedGroups, setExpandedGroups] = (0, import_react8.useState)({});
  const [contextMenu, setContextMenu] = (0, import_react8.useState)(null);
  const [search, setSearch] = (0, import_react8.useState)({ state: "idle", items: [], error: "" });
  const trashIds = (0, import_react8.useSyncExternalStore)(subscribeTrash, getTrashIds, getTrashIds);
  const dragRef = (0, import_react8.useRef)(null);
  const workspaceDragRef = (0, import_react8.useRef)(null);
  const groupDragRef = (0, import_react8.useRef)(null);
  const orderWorkspaceGroups = (list, groupId) => {
    const order = prefs.workspaceGroupOrders?.[groupId];
    if (!order?.length) return list;
    const rank = new Map(order.map((id, index) => [id, index]));
    return [...list].sort((a, b) => {
      const ai = rank.has(a.workspace?.workspaceId) ? rank.get(a.workspace.workspaceId) : Number.MAX_SAFE_INTEGER;
      const bi = rank.has(b.workspace?.workspaceId) ? rank.get(b.workspace.workspaceId) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  };
  const assignWorkspaceTo = (workspaceId, groupId, beforeId, after = false) => {
    if (!workspaceId) return;
    const assignments = { ...prefs.workspaceAssignments ?? {} };
    if (groupId) assignments[workspaceId] = groupId;
    else delete assignments[workspaceId];
    const orderKey = groupId ?? "__root";
    const orders = { ...prefs.workspaceGroupOrders ?? {} };
    for (const key of Object.keys(orders)) {
      if (key !== orderKey && orders[key]?.includes(workspaceId)) {
        orders[key] = orders[key].filter((id) => id !== workspaceId);
      }
    }
    const base = (orders[orderKey] ?? []).filter((id) => id !== workspaceId);
    if (beforeId && beforeId !== workspaceId) {
      const at = base.indexOf(beforeId);
      if (at >= 0) base.splice(after ? at + 1 : at, 0, workspaceId);
      else base.push(workspaceId);
    } else {
      base.push(workspaceId);
    }
    orders[orderKey] = base;
    setPrefs({ workspaceAssignments: assignments, workspaceGroupOrders: orders });
  };
  const moveWorkspaceGroupTo = (groupId, parentId) => {
    if (!groupId || groupId === parentId) return;
    const all = prefs.workspaceGroups ?? [];
    const blocked = /* @__PURE__ */ new Set([groupId, ...descendantIds(all, groupId)]);
    if (parentId && blocked.has(parentId)) return;
    const next = all.map((group) => group.id === groupId ? { ...group, parentId: parentId ?? null } : group);
    setPrefs({ workspaceGroups: next });
  };
  const createWorkspaceGroup = (name, parentId) => {
    const id = createWorkspaceGroupId();
    const key = groupOrderKey(parentId);
    setPrefs({
      workspaceGroups: [...prefs.workspaceGroups ?? [], { id, name, parentId: parentId || null }],
      workspaceGroupOrders: { ...prefs.workspaceGroupOrders ?? {}, [key]: [...(prefs.workspaceGroupOrders ?? {})[key] ?? [], id] }
    });
  };
  const renameWorkspaceGroup = (id, name) => {
    setPrefs({ workspaceGroups: (prefs.workspaceGroups ?? []).map((group) => group.id === id ? { ...group, name } : group) });
  };
  const deleteWorkspaceGroup = (id) => {
    const groups2 = prefs.workspaceGroups ?? [];
    const target = groups2.find((group) => group.id === id);
    if (!target) return;
    const removed = /* @__PURE__ */ new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const group of groups2) {
        if (group.parentId && removed.has(group.parentId) && !removed.has(group.id)) {
          removed.add(group.id);
          changed = true;
        }
      }
    }
    const nextGroups = groups2.filter((group) => !removed.has(group.id)).map((group) => removed.has(group.parentId) ? { ...group, parentId: target.parentId || null } : group);
    const assignments = Object.fromEntries(Object.entries(prefs.workspaceAssignments ?? {}).filter(([, groupId]) => !removed.has(groupId)));
    const orders = Object.fromEntries(Object.entries(prefs.workspaceGroupOrders ?? {}).map(([key, list]) => [key, Array.isArray(list) ? list.filter((entry) => !removed.has(entry)) : list]));
    setPrefs({ workspaceGroups: nextGroups, workspaceAssignments: assignments, workspaceGroupOrders: orders });
  };
  const searchRef = (0, import_react8.useRef)(null);
  const focusedRef = (0, import_react8.useRef)(null);
  const collapsedGroups = (0, import_react8.useMemo)(() => new Set(prefs.collapsedGroups ?? []), [prefs.collapsedGroups]);
  const focusExpandedSet = (0, import_react8.useMemo)(() => new Set(prefs.focusExpanded ?? []), [prefs.focusExpanded]);
  (0, import_react8.useEffect)(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  (0, import_react8.useEffect)(() => {
    const timer = setInterval(() => setNow(Date.now()), 6e4);
    return () => clearInterval(timer);
  }, []);
  (0, import_react8.useEffect)(() => {
    const load2 = () => refreshTrash().catch(() => {
    });
    load2();
    window.addEventListener("focus", load2);
    return () => window.removeEventListener("focus", load2);
  }, []);
  (0, import_react8.useEffect)(() => {
    if (!flash) return void 0;
    const timer = setTimeout(() => setFlash(""), 3200);
    return () => clearTimeout(timer);
  }, [flash]);
  (0, import_react8.useEffect)(() => {
    if (!menu && !contextMenu) return void 0;
    const close = () => {
      setMenu(null);
      setContextMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
    };
  }, [menu, contextMenu]);
  (0, import_react8.useEffect)(() => {
    const text = query.trim();
    if (text.length < 2 || typeof searchSessions !== "function") {
      setSearch({ state: "idle", items: [], error: "" });
      return void 0;
    }
    const controller = new AbortController();
    setSearch((prev) => ({ ...prev, state: "loading", error: "" }));
    const timer = setTimeout(() => {
      searchSessions(text, controller.signal).then((value) => {
        if (controller.signal.aborted) return;
        setSearch({ state: "ready", items: value?.items ?? [], error: "" });
      }).catch((error) => {
        if (controller.signal.aborted) return;
        setSearch({ state: "error", items: [], error: errorText2(error) });
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchSessions]);
  const pinnedSet = (0, import_react8.useMemo)(() => new Set(workspaces?.pinnedSessionIds ?? []), [workspaces?.pinnedSessionIds]);
  const archivedSet = (0, import_react8.useMemo)(
    () => new Set(workspaces?.archivedSessionIds ?? []),
    [workspaces?.archivedSessionIds]
  );
  const annotated = (0, import_react8.useMemo)(() => {
    if (!sessions || !workspaces) return [];
    const candidates = buildCandidates(sessions, workspaces.archivedSessionIds);
    const built = buildRows(candidates, sessions.byId ?? {}, workspaces);
    const rows = annotateRows(built, statuses);
    const visible = prefs.showSubagents ? rows : rows.filter((row) => row.session.origin !== "subagent");
    return filterHiddenRows(filterRowsByFocus(visible, prefs), prefs.hiddenWorkspaceIds).filter(
      (row) => !trashIds.has(row.session.id) && !archivedSet.has(row.session.id)
    );
  }, [
    sessions,
    statuses,
    workspaces,
    prefs.showSubagents,
    prefs.focusGroups,
    prefs.focusGroupId,
    prefs.hiddenWorkspaceIds,
    trashIds,
    archivedSet
  ]);
  const focusWorkspaces = (0, import_react8.useMemo)(
    () => filterHiddenWorkspaces(
      restrictWorkspaces(workspaces, prefs),
      prefs.hiddenWorkspaceIds
    ),
    [workspaces, prefs.focusGroups, prefs.focusGroupId, prefs.hiddenWorkspaceIds]
  );
  const sections = (0, import_react8.useMemo)(() => splitSections(annotated, workspaces?.pinnedSessionIds), [annotated, workspaces?.pinnedSessionIds]);
  const pinnedRows = (0, import_react8.useMemo)(() => {
    const order = workspaces?.pinnedSessionIds ?? [];
    const byId = new Map(sections.pinned.map((row) => [row.session.id, row]));
    return order.map((id) => byId.get(id)).filter(Boolean);
  }, [sections.pinned, workspaces?.pinnedSessionIds]);
  const activeTop = (0, import_react8.useMemo)(() => {
    const list = sortFamilies(
      activeRows(annotated).filter((row) => !pinnedSet.has(row.session.id)),
      byUpdated
    );
    return topLevelRows(list);
  }, [annotated, pinnedSet]);
  const activeRowsView = (0, import_react8.useMemo)(() => {
    const limit = expandedActive ? 0 : prefs.activeLimit;
    const picked = limit > 0 ? activeTop.slice(0, limit) : activeTop;
    return picked.flatMap((row) => familyFor(annotated, row.session.id));
  }, [annotated, activeTop, expandedActive, prefs.activeLimit]);
  const pinnedView = (0, import_react8.useMemo)(
    () => pinnedRows.flatMap((row) => familyFor(annotated, row.session.id)),
    [annotated, pinnedRows]
  );
  const recentTop = (0, import_react8.useMemo)(
    () => topLevelRows(
      sortFamilies(
        annotated.filter((row) => prefs.showIdle || row.status !== "idle"),
        byUpdated
      )
    ),
    [annotated, prefs.showIdle]
  );
  const recentRowsView = (0, import_react8.useMemo)(() => {
    const limit = expandedRecent ? 0 : prefs.recentLimit;
    const picked = limit > 0 ? recentTop.slice(0, limit) : recentTop;
    return picked.flatMap((row) => familyFor(annotated, row.session.id));
  }, [annotated, recentTop, expandedRecent, prefs.recentLimit]);
  const restRows = (0, import_react8.useMemo)(
    () => annotated.filter((row) => prefs.showIdle || row.status !== "idle"),
    [annotated, prefs.showIdle]
  );
  const buildGroups = (rows, workspaceView) => {
    if (!workspaceView) return [];
    const sortGroup = (list, key) => prefs.sort === "manual" ? applyFamilyOrder(list, prefs.manualOrder[key]) : sortFamilies(list, byUpdated);
    const mode = prefs.workspaceGroupMode ?? (prefs.nestWorkspaces ? "nested" : "default");
    return groupByWorkspace(rows, workspaceView, mode === "nested").map((group) => {
      const key = group.workspace?.workspaceId ?? "__none";
      return { ...group, rows: sortGroup(group.rows, key), key };
    });
  };
  const groupMode = prefs.workspaceGroupMode ?? (prefs.nestWorkspaces ? "nested" : "default");
  const customWorkspaceTree = (0, import_react8.useMemo)(() => {
    if (!focusWorkspaces || groupMode !== "workspace") return null;
    const sortRows = (list, key) => prefs.sort === "manual" ? applyFamilyOrder(list, prefs.manualOrder[key]) : sortFamilies(list, byUpdated);
    const flat = flattenWorkspaceGroups(prefs.workspaceGroups);
    const nodes = new Map(flat.map((group, index) => [group.id, {
      ...group,
      label: groupDisplayName(t, group, index),
      key: `wg:${group.id}`,
      children: [],
      workspaces: [],
      rows: []
    }]));
    const roots = [];
    for (const group of flat) {
      const node = nodes.get(group.id);
      const parent = group.parentId ? nodes.get(group.parentId) : null;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    const ungrouped = {
      id: "__none",
      key: "wg:__none",
      label: t("group.ungrouped"),
      depth: 0,
      ungrouped: true,
      children: [],
      workspaces: [],
      rows: []
    };
    const workspaceGroups = groupByWorkspace(restRows, focusWorkspaces, false);
    for (const item of workspaceGroups) {
      const workspaceId = item.workspace?.workspaceId;
      const groupId = workspaceId ? prefs.workspaceAssignments?.[workspaceId] : null;
      const target = groupId && nodes.has(groupId) ? nodes.get(groupId) : ungrouped;
      target.workspaces.push({
        ...item,
        key: workspaceId ?? "__none",
        containerId: target.id,
        depth: target.ungrouped ? 0 : target.depth + 1,
        rows: sortRows(item.rows, workspaceId ?? "__none")
      });
    }
    const finalize = (node) => {
      node.children = node.children.map(finalize);
      node.rows = [
        ...node.workspaces.flatMap((workspace) => workspace.rows),
        ...node.children.flatMap((child) => child.rows)
      ];
      return node;
    };
    const applyGroupOrder = (list, parentId) => {
      const ids2 = prefs.workspaceGroupOrders?.[groupOrderKey(parentId)];
      if (!Array.isArray(ids2) || ids2.length === 0) return list;
      const byId = new Map(list.map((entry) => [entry.id, entry]));
      const out = [];
      for (const id of ids2) {
        const entry = byId.get(id);
        if (entry) {
          out.push(entry);
          byId.delete(id);
        }
      }
      for (const entry of list) if (byId.has(entry.id)) out.push(entry);
      return out;
    };
    const applyOrder = (node) => {
      node.workspaces = orderWorkspaceGroups(node.workspaces, node.id);
      node.children = applyGroupOrder(node.children, node.id);
      for (const child of node.children) applyOrder(child);
    };
    for (const node of roots) applyOrder(node);
    const tree = applyGroupOrder(roots, null).map(finalize);
    if (ungrouped.workspaces.length > 0) {
      ungrouped.workspaces = orderWorkspaceGroups(ungrouped.workspaces, "__root");
      tree.push(finalize(ungrouped));
    }
    return tree;
  }, [
    restRows,
    focusWorkspaces,
    groupMode,
    prefs.workspaceGroups,
    prefs.workspaceAssignments,
    prefs.workspaceGroupOrders,
    prefs.sort,
    prefs.manualOrder,
    t
  ]);
  const groups = (0, import_react8.useMemo)(
    () => groupMode === "workspace" ? [] : buildGroups(restRows, focusWorkspaces),
    [
      restRows,
      focusWorkspaces,
      groupMode,
      prefs.nestWorkspaces,
      prefs.sort,
      prefs.manualOrder
    ]
  );
  const countTreeWorkspaces = (nodes) => (nodes ?? []).reduce(
    (count, node) => count + node.workspaces.length + countTreeWorkspaces(node.children),
    0
  );
  const workspaceSectionCount = customWorkspaceTree ? countTreeWorkspaces(customWorkspaceTree) : groups.length;
  const workspaceRowCount = customWorkspaceTree ? customWorkspaceTree.reduce((count, node) => count + node.rows.length, 0) : groups.reduce((count, group) => count + group.rows.length, 0);
  const archived = (0, import_react8.useMemo)(() => {
    if (prefs.archivedFilter === "hide") return [];
    const rows = archivedRows(sessions, workspaces?.archivedSessionIds, workspaces);
    const visible = prefs.showSubagents ? rows : rows.filter((row) => row.session.origin !== "subagent");
    const kept = filterRowsByFocus(visible.filter((row) => !trashIds.has(row.session.id)), prefs);
    return query.trim() ? filterRows(kept, { query: query.trim() }) : kept;
  }, [sessions, workspaces?.archivedSessionIds, prefs.archivedFilter, prefs.showSubagents, prefs.focusGroups, prefs.focusGroupId, query, trashIds]);
  const localMatches = (0, import_react8.useMemo)(() => query.trim() ? filterRows(annotated, { query: query.trim() }) : [], [annotated, query]);
  const localIds = (0, import_react8.useMemo)(() => new Set(localMatches.map((row) => row.session.id)), [localMatches]);
  const contentHits = (0, import_react8.useMemo)(
    () => search.state === "ready" ? search.items.filter((item) => !localIds.has(item.sessionId) && !archivedSet.has(item.sessionId) && !trashIds.has(item.sessionId) && (prefs.showSubagents || sessions?.byId?.[item.sessionId]?.origin !== "subagent") && focusIncludesPath(prefs, workspaces, sessions?.byId?.[item.sessionId]?.cwd)) : [],
    [search.state, search.items, localIds, archivedSet, trashIds, prefs.showSubagents, prefs.focusGroups, prefs.focusGroupId, sessions?.byId, workspaces]
  );
  const localDisplay = localMatches.slice(0, 20);
  const contentDisplay = contentHits.slice(0, Math.max(0, 20 - localDisplay.length));
  const run = (0, import_react8.useCallback)(
    async (action, successKey, params) => {
      setBusy(true);
      try {
        await action();
        if (successKey) setFlash(t(successKey, params));
        return true;
      } catch (error) {
        setFlash(errorText2(error));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [t]
  );
  const togglePin = async (row) => {
    const id = row.session.id;
    setMenu(null);
    await run(() => pinnedSet.has(id) ? unpinSession(id) : pinSession(id));
  };
  const archive = async (row) => {
    setMenu(null);
    setBusy(true);
    try {
      await archiveSession(row.session.id);
      setFlash(t("toast.archived", { n: 1 }));
    } catch (error) {
      if (looksRunning(error)) setDialog({ kind: "archiveRunning", row });
      else setFlash(errorText2(error));
    } finally {
      setBusy(false);
    }
  };
  const moveToTrash = async (row) => {
    setMenu(null);
    setBusy(true);
    try {
      if (!row.archived) await archiveSession(row.session.id);
      const result = await addToTrash([
        {
          sessionId: row.session.id,
          title: row.title,
          cwd: row.session.cwd ?? "",
          deletedAt: Date.now()
        }
      ]);
      const failure = (result?.failed ?? []).find((item) => item.sessionId === row.session.id);
      if (!failure) {
        addTrashIds([row.session.id]);
        await unarchiveSession(row.session.id).catch(() => {
        });
      }
      setFlash(failure ? errorText2(failure.error ?? failure) : t("toast.trashed", { n: 1 }));
    } catch (error) {
      if (looksRunning(error)) setDialog({ kind: "archiveRunning", row, trash: true });
      else setFlash(errorText2(error));
    } finally {
      setBusy(false);
    }
  };
  const copyId = async (row) => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(row.session.id);
      setFlash(t("toast.copied"));
    } catch (error) {
      setFlash(errorText2(error));
    }
  };
  const toggleGroup = (key) => {
    const next = new Set(prefs.collapsedGroups ?? []);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      setExpandedGroups((prev) => {
        if (prev[key] === void 0) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
    setPrefs({ collapsedGroups: [...next] });
  };
  const showMore = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 5 }));
  };
  const toggleFocusExpanded = (id) => {
    const next = new Set(prefs.focusExpanded ?? []);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setPrefs({ focusExpanded: [...next] });
  };
  const showLess = (key) => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const clearDragMarks = () => {
    document.body.classList.remove("dsv-dragging");
    document.querySelectorAll(".dsv-dragSource, .dsv-dropBefore, .dsv-dropAfter, .dsv-dropTarget").forEach((node) => node.classList.remove("dsv-dragSource", "dsv-dropBefore", "dsv-dropAfter", "dsv-dropTarget"));
    window.getSelection()?.removeAllRanges();
  };
  const markRowDrop = (event) => {
    if (prefs.sort !== "manual" || query.trim() || busy) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    event.currentTarget.classList.toggle("dsv-dropAfter", after);
    event.currentTarget.classList.toggle("dsv-dropBefore", !after);
  };
  const onDropRow = (event, target) => {
    event.preventDefault();
    event.stopPropagation();
    clearDragMarks();
    const dragId = dragRef.current;
    dragRef.current = null;
    if (!dragId || dragId === target.session.id) return;
    const group = groups.find((item) => item.rows.some((row) => row.session.id === target.session.id));
    const key = group?.key ?? "__none";
    const current = prefs.manualOrder[key] ?? (group?.rows ?? []).map((row) => row.session.id);
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    const next = moveId(current, dragId, target.session.id, after);
    setPrefs({ manualOrder: { ...prefs.manualOrder, [key]: next } });
  };
  const startDrag = (event, row) => {
    if (prefs.sort !== "manual" || query.trim() || busy) return;
    dragRef.current = row.session.id;
    window.getSelection()?.removeAllRanges();
    document.body.classList.add("dsv-dragging");
    event.currentTarget.classList.add("dsv-dragSource");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", row.session.id);
    event.dataTransfer.setDragImage(event.currentTarget, 14, 18);
  };
  const closeMenus = () => {
    setMenu(null);
    setContextMenu(null);
  };
  const contextSessionItems = (row, archivedRow = false) => {
    const isPinned = pinnedSet.has(row.session.id);
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
        closeMenus();
        openSession(row.session.id);
      }, children: t("action.open") }),
      !archivedRow && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
        closeMenus();
        togglePin(row);
      }, children: t(isPinned ? "action.unpin" : "action.pin") }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
        closeMenus();
        setDialog({ kind: "renameSession", row });
      }, children: t("action.rename") }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
        closeMenus();
        run(() => forkSession(row.session.id), "toast.forked");
      }, children: t("action.fork") }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
        closeMenus();
        copyId(row);
      }, children: t("action.copyId") }),
      archivedRow ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
          closeMenus();
          run(() => unarchiveSession(row.session.id), "toast.restored", { n: 1 });
        }, children: t("action.restore") }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", className: "dsv-danger", onClick: () => {
          closeMenus();
          moveToTrash(row);
        }, children: t("action.trash") })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
          closeMenus();
          archive(row);
        }, children: t("action.archive") }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", className: "dsv-danger", onClick: () => {
          closeMenus();
          moveToTrash(row);
        }, children: t("action.trash") })
      ] })
    ] });
  };
  const contextWorkspaceItems = (workspace) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
      closeMenus();
      startSession(workspace.workspaceId);
    }, children: t("action.newSession") }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => {
      closeMenus();
      setDialog({ kind: "renameWorkspace", workspace });
    }, children: t("action.renameWorkspace") }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", className: "dsv-danger", onClick: () => {
      closeMenus();
      setDialog({ kind: "deleteWorkspace", workspace });
    }, children: t("action.deleteWorkspace") }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-menuDivider", role: "separator" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      GroupCascade,
      {
        t,
        groups: flattenWorkspaceGroups(prefs.workspaceGroups ?? []),
        onPick: (groupId) => {
          closeMenus();
          assignWorkspaceTo(workspace.workspaceId, groupId);
        },
        rootLabel: prefs.workspaceAssignments?.[workspace.workspaceId] ? t("action.removeFromGroup") : void 0,
        onRoot: () => {
          closeMenus();
          assignWorkspaceTo(workspace.workspaceId, null);
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-menuDivider", role: "separator" }),
    contextWorkspaceFilterEntry(workspace.workspaceId)
  ] });
  const openWorkspaceGroups = () => {
    closeMenus();
    requestPanelIntent({ kind: "workspaceGroups" });
    openPanel?.();
  };
  const openWorkspaceFilter = (workspaceId = null) => {
    closeMenus();
    requestPanelIntent({ kind: "workspaceFilter", workspaceId });
    openPanel?.();
  };
  const contextWorkspaceFilterEntry = (workspaceId = null) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", role: "menuitem", onClick: () => openWorkspaceFilter(workspaceId), children: t("side.workspaceFilter") });
  const currentGroupMode = prefs.workspaceGroupMode ?? (prefs.nestWorkspaces === false ? "default" : "nested");
  const contextWorkspaceSectionItems = () => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
    contextWorkspaceFilterEntry(),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-menuDivider", role: "separator" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-menuLabel", role: "presentation", children: t("group.mode.title") }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-menuSub", role: "group", "aria-label": t("group.mode.title"), children: ["default", "nested", "workspace"].map((mode) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "button",
      {
        type: "button",
        role: "menuitemradio",
        "aria-checked": currentGroupMode === mode,
        className: "dsv-menuChoice dsv-menuChoiceSub",
        onClick: () => {
          closeMenus();
          setPrefs({ workspaceGroupMode: mode });
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-menuCheck", "aria-hidden": "true", children: currentGroupMode === mode ? "\u2713" : "" }),
          t(`group.mode.${mode}`)
        ]
      },
      mode
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-menuDivider", role: "separator" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMenus();
          setDialog({ kind: "workspaceGroupCreate", parentId: null });
        },
        children: t("group.new")
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => openWorkspaceGroups(),
        children: t("group.manage.workspace")
      }
    )
  ] });
  const contextWorkspaceGroupItems = () => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMenus();
          setDialog({ kind: "workspaceGroupCreate", parentId: contextMenu?.id ?? null });
        },
        children: t("group.addChild")
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMenus();
          const group = (prefs.workspaceGroups ?? []).find((entry) => entry.id === contextMenu?.id);
          setDialog({ kind: "workspaceGroupRename", id: group?.id, name: group?.name || "" });
        },
        children: t("action.rename")
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "button",
      {
        type: "button",
        role: "menuitem",
        className: "dsv-danger",
        onClick: () => {
          closeMenus();
          setDialog({ kind: "workspaceGroupDelete", id: contextMenu?.id });
        },
        children: t("dialog.delete")
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-menuDivider", role: "separator" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      GroupCascade,
      {
        t,
        groups: flattenWorkspaceGroups(prefs.workspaceGroups ?? []),
        excludeIds: [contextMenu?.id, ...descendantIds(prefs.workspaceGroups ?? [], contextMenu?.id)],
        onPick: (groupId) => {
          closeMenus();
          moveWorkspaceGroupTo(contextMenu?.id, groupId);
        },
        rootLabel: (prefs.workspaceGroups ?? []).find((group) => group.id === contextMenu?.id)?.parentId ? t("action.moveToRoot") : void 0,
        onRoot: () => {
          closeMenus();
          moveWorkspaceGroupTo(contextMenu?.id, null);
        }
      }
    )
  ] });
  const contextFocusItems = (focus) => {
    const active = focus.id === prefs.focusGroupId;
    const label = active ? t("focus.exit") : prefs.focusGroupId ? t("focus.switch") : t("focus.enter");
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          type: "button",
          role: "menuitem",
          onClick: () => {
            closeMenus();
            setPrefs({ focusGroupId: active ? "" : focus.id });
          },
          children: label
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          type: "button",
          role: "menuitem",
          onClick: () => {
            closeMenus();
            setDialog({ kind: "focusRename", id: focus.id });
          },
          children: t("action.rename")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          type: "button",
          role: "menuitem",
          onClick: () => {
            closeMenus();
            setDialog({ kind: "focusMembers", id: focus.id });
          },
          children: t("focus.editMembers")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          type: "button",
          role: "menuitem",
          className: "dsv-danger",
          onClick: () => {
            closeMenus();
            setDialog({ kind: "focusDelete", id: focus.id });
          },
          children: t("dialog.delete")
        }
      )
    ] });
  };
  const contextRow = contextMenu?.kind === "session" ? (contextMenu.archived ? archived : annotated).find((row) => row.session.id === contextMenu.id) : null;
  const customWorkspaces = [];
  const collectWorkspaces = (nodes) => {
    for (const node of nodes ?? []) {
      customWorkspaces.push(...node.workspaces.map((group) => group.workspace));
      collectWorkspaces(node.children);
    }
  };
  collectWorkspaces(customWorkspaceTree);
  const contextWorkspace = contextMenu?.kind === "workspace" ? [...groups.map((group) => group.workspace), ...customWorkspaces].find((workspace) => workspace?.workspaceId === contextMenu.id) : null;
  const contextFocus = contextMenu?.kind === "focus" ? prefs.focusGroups.find((group) => group.id === contextMenu.id) ?? null : null;
  const contextWorkspaceGroup = contextMenu?.kind === "workspaceGroup" ? prefs.workspaceGroups.find((group) => group.id === contextMenu.id) ?? null : null;
  const contextItems = contextRow ? contextSessionItems(contextRow, contextMenu.archived) : contextMenu?.kind === "workspaceFilter" ? contextWorkspaceFilterEntry() : contextMenu?.kind === "workspaceSection" ? contextWorkspaceSectionItems() : contextWorkspaceGroup ? contextWorkspaceGroupItems(contextWorkspaceGroup) : contextWorkspace ? contextWorkspaceItems(contextWorkspace) : contextFocus ? contextFocusItems(contextFocus) : null;
  const sectionHead = ({ key, label, count, icon = null, collapsed, extra = null, onContextMenu = void 0, onDragOver = void 0, onDragLeave = void 0, onDrop = void 0 }) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideGroupHead dsv-sideSectionHead", onContextMenu, onDragOver, onDragLeave, onDrop, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "button",
      {
        type: "button",
        className: "dsv-sideGroupToggle",
        "aria-expanded": !collapsed,
        onClick: () => toggleGroup(key),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideChevron", "data-collapsed": collapsed, children: collapsed ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronRightIcon, { size: 10 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronDownIcon, { size: 10 }) }),
          icon,
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideGroupTitle", children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideCount", children: count })
        ]
      }
    ),
    extra
  ] });
  const renderRow = (row, options = {}) => {
    const { archivedRow = false, indent = 0 } = options;
    const rowIndent = indent + (row.depth ?? 0) * 12;
    const open = () => openSession(row.session.id);
    const isPinned = pinnedSet.has(row.session.id);
    const time = formatTime(t, row.session.updatedAt, now);
    const waiting = row.status === "pending";
    const title = row.session.blank ? t("row.newSession") : row.title;
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "div",
      {
        className: "dsv-sideRow",
        "data-depth": row.depth ?? 0,
        "data-status": row.status,
        "data-archived": archivedRow || void 0,
        "data-pinned": isPinned || void 0,
        style: { "--dsv-indent": `${rowIndent}px` },
        draggable: prefs.sort === "manual" && !query.trim() && !archivedRow,
        onDragStart: (event) => startDrag(event, row),
        onDragOver: markRowDrop,
        onDragLeave: (event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          event.currentTarget.classList.remove("dsv-dropBefore", "dsv-dropAfter");
        },
        onDragEnd: clearDragMarks,
        onDrop: (event) => onDropRow(event, row),
        onContextMenu: (event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenu(null);
          focusedRef.current = row.session.id;
          setContextMenu({ kind: "session", id: row.session.id, archived: archivedRow, x: event.clientX, y: event.clientY });
        },
        children: [
          !archivedRow && glowFor(row) !== "off" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
            "span",
            {
              className: `dsv-sideGlow dsv-sideGlow--${glowFor(row)}`,
              "data-status": row.status,
              "aria-hidden": "true"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
            "button",
            {
              type: "button",
              className: "dsv-sideOpen",
              onClick: open,
              onFocus: () => {
                focusedRef.current = row.session.id;
              },
              title,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideSlot", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Dot, { status: archivedRow ? "idle" : row.status }) }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideRowTitle", children: title }),
                row.depth > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideTag", children: t("row.child") }),
                row.runningChildren > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "dsv-sideRunning", title: t("row.runningChildren", { n: row.runningChildren }), children: [
                  "+",
                  row.runningChildren
                ] }),
                (prefs.showTimes || waiting) && (waiting ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideWaiting", children: t(pendingLabelKey(row.pendingKind)) }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideTime", children: time }))
              ]
            }
          )
        ]
      },
      row.session.id
    );
  };
  const renderWorkspaceHead = (group, index) => {
    const workspace = group.workspace;
    const key = group.key;
    const custom = group.custom === true;
    const label = group.label ?? (workspace ? workspaceLabel(workspace) : t("section.all"));
    const collapsable = !!workspace || custom;
    const collapsed = collapsedGroups.has(key);
    const activeCount = activeRows(group.rows).length;
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "div",
      {
        className: "dsv-sideGroupHead",
        style: { paddingLeft: 4 + group.depth * 12 },
        draggable: !!workspace && !query.trim() && (prefs.sort === "manual" || groupMode === "workspace"),
        onDragStart: (event) => {
          if (!workspace || query.trim()) return;
          if (prefs.sort !== "manual" && groupMode !== "workspace") return;
          workspaceDragRef.current = workspace.workspaceId;
          window.getSelection()?.removeAllRanges();
          document.body.classList.add("dsv-dragging");
          event.currentTarget.classList.add("dsv-dragSource");
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("application/x-dsv-workspace", workspace.workspaceId);
          event.dataTransfer.setDragImage(event.currentTarget, 14, 18);
        },
        onDragOver: (event) => {
          const from = workspaceDragRef.current;
          if (!from || !workspace || from === workspace.workspaceId) return;
          event.preventDefault();
          event.currentTarget.classList.add("dsv-dropTarget");
        },
        onDragLeave: (event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          event.currentTarget.classList.remove("dsv-dropTarget");
        },
        onDrop: (event) => {
          const from = workspaceDragRef.current;
          workspaceDragRef.current = null;
          clearDragMarks();
          if (!from || !workspace || from === workspace.workspaceId) return;
          event.preventDefault();
          if (groupMode === "workspace" && group.containerId) {
            const rect = event.currentTarget.getBoundingClientRect();
            assignWorkspaceTo(from, group.containerId, workspace.workspaceId, event.clientY > rect.top + rect.height / 2);
            return;
          }
          insertWorkspaceBefore?.(from, workspace.workspaceId);
        },
        onDragEnd: () => {
          workspaceDragRef.current = null;
          clearDragMarks();
        },
        onContextMenu: (event) => {
          if (!workspace && !custom) return;
          event.preventDefault();
          event.stopPropagation();
          setMenu(null);
          setContextMenu({
            kind: custom ? "workspaceGroup" : "workspace",
            id: custom ? group.groupId : key,
            x: event.clientX,
            y: event.clientY
          });
        },
        children: [
          collapsable ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
            "button",
            {
              type: "button",
              className: "dsv-sideGroupToggle",
              "aria-expanded": !collapsed,
              "aria-label": label,
              onClick: () => toggleGroup(key),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideChevron", "data-collapsed": collapsed, children: collapsed ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronRightIcon, { size: 10 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronDownIcon, { size: 10 }) }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideGroupTitle", children: label }),
                activeCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                  "span",
                  {
                    className: "dsv-sideActiveMark",
                    role: "img",
                    title: t("side.workspaceActive"),
                    "aria-label": t("side.workspaceActive"),
                    children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-dot", "data-status": "running", "aria-hidden": "true" })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideCount", children: group.rows.length })
              ]
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideGroupToggle", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideGroupTitle", children: label }),
            activeCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              "span",
              {
                className: "dsv-sideActiveMark",
                role: "img",
                title: t("side.workspaceActive"),
                "aria-label": t("side.workspaceActive"),
                children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-dot", "data-status": "running", "aria-hidden": "true" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideCount", children: group.rows.length })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideGroupActions", children: workspace && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-sideIconBtn",
              "aria-label": t("action.newSession"),
              title: t("action.newSession"),
              onClick: () => startSession(workspace.workspaceId),
              children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PlusIcon, { size: 12 })
            }
          ) })
        ]
      }
    );
  };
  const renderGroup = (group, index, options = {}) => {
    const { indent = 0 } = options;
    const collapsed = collapsedGroups.has(group.key);
    const tops = topLevelRows(group.rows);
    const floor = watermarkLimit(tops, prefs.workspaceLimit);
    const extra = expandedGroups[group.key] ?? 0;
    const shown = floor === 0 ? tops.length : Math.min(tops.length, floor + extra);
    const visible = takeTopFamilies(group.rows, tops.slice(0, shown), 0);
    const hidden = shown < tops.length;
    const canLess = extra > 0;
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "section",
      {
        className: "dsv-sideGroup",
        "aria-label": group.label ?? (group.workspace ? workspaceLabel(group.workspace) : t("section.all")),
        children: [
          renderWorkspaceHead(group, index),
          !collapsed && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
            visible.map((row) => renderRow(row, { indent })),
            (hidden || canLess) && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "button",
              {
                type: "button",
                className: "dsv-sideMore",
                style: { paddingLeft: 28 + group.depth * 12 + indent },
                onClick: () => hidden ? showMore(group.key) : showLess(group.key),
                children: [
                  t(hidden ? "side.more" : "side.less"),
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronDownIcon, { size: 11 })
                ]
              }
            )
          ] })
        ]
      },
      group.key
    );
  };
  const renderCustomGroup = (node) => {
    if (node.ungrouped) {
      return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_jsx_runtime9.Fragment, { children: node.workspaces.map((workspaceGroup, index) => renderGroup(workspaceGroup, index, { indent: 0 })) });
    }
    const collapsed = collapsedGroups.has(node.key);
    const count = node.rows.length;
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "dsv-sideGroup dsv-customWorkspaceGroup", "aria-label": node.label, children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "div",
        {
          className: "dsv-sideGroupHead",
          style: { paddingLeft: 4 + node.depth * 12 },
          draggable: true,
          onDragStart: (event) => {
            if (node.ungrouped) return;
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", node.id);
            groupDragRef.current = node.id;
            event.currentTarget.classList.add("dsv-dragSource");
          },
          onDragEnd: (event) => {
            groupDragRef.current = null;
            event.currentTarget.classList.remove("dsv-dragSource");
            clearDragMarks();
          },
          onDragOver: (event) => {
            if (groupDragRef.current) {
              event.preventDefault();
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientY - rect.top) / rect.height;
              const edge = ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
              event.currentTarget.dataset.dropEdge = edge;
              event.currentTarget.classList.toggle("dsv-dropBefore", edge === "before");
              event.currentTarget.classList.toggle("dsv-dropAfter", edge === "after");
              event.currentTarget.classList.toggle("dsv-dropTarget", edge === "inside");
              return;
            }
            const from = workspaceDragRef.current;
            if (!from || groupMode !== "workspace") return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.classList.add("dsv-dropTarget");
          },
          onDragLeave: (event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            event.currentTarget.classList.remove("dsv-dropTarget", "dsv-dropBefore", "dsv-dropAfter");
          },
          onDrop: (event) => {
            event.preventDefault();
            event.stopPropagation();
            const edge = event.currentTarget.dataset.dropEdge || "inside";
            delete event.currentTarget.dataset.dropEdge;
            if (groupDragRef.current) {
              const fromGroup = groupDragRef.current;
              groupDragRef.current = null;
              const result = moveGroupInTree(prefs.workspaceGroups ?? [], prefs.workspaceGroupOrders ?? {}, fromGroup, node.id, edge);
              clearDragMarks();
              if (result) setPrefs({ workspaceGroups: result.groups, workspaceGroupOrders: result.orders });
              return;
            }
            const from = workspaceDragRef.current;
            if (!from) return;
            workspaceDragRef.current = null;
            clearDragMarks();
            assignWorkspaceTo(from, node.id, null);
          },
          onContextMenu: node.ungrouped ? void 0 : (event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenu(null);
            setContextMenu({ kind: "workspaceGroup", id: node.id, x: event.clientX, y: event.clientY });
          },
          children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
            "button",
            {
              type: "button",
              className: "dsv-sideGroupToggle",
              "aria-expanded": !collapsed,
              "aria-label": node.label,
              onClick: () => toggleGroup(node.key),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideChevron", "data-collapsed": collapsed, children: collapsed ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronRightIcon, { size: 10 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronDownIcon, { size: 10 }) }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LayoutIcon, { size: 12 }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideGroupTitle", children: node.label }),
                (() => {
                  const status = groupStatus(node.rows);
                  return status ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideStatusMark", title: t(statusLabelKey(status)), children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-dot", "data-status": status }) }) : null;
                })(),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideCount", children: count })
              ]
            }
          )
        }
      ),
      !collapsed && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        node.children.map((child) => renderCustomGroup(child)),
        node.workspaces.map((workspaceGroup, index) => renderGroup(workspaceGroup, index, { indent: (workspaceGroup.depth + 1) * 12 })),
        node.workspaces.length === 0 && node.children.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideHint", style: { paddingLeft: 28 + node.depth * 12 }, children: t("group.empty") })
      ] })
    ] }, node.key);
  };
  const searchActive = query.trim().length > 0;
  const activeCollapsed = collapsedGroups.has("__active");
  const recentCollapsed = collapsedGroups.has("__recent");
  const pinnedCollapsed = collapsedGroups.has("__pinned");
  const workspacesCollapsed = collapsedGroups.has("__workspaces");
  const workspaceGroupKeys = (0, import_react8.useMemo)(() => {
    if (!customWorkspaceTree) return groups.map((group) => group.key);
    const keys = [];
    const walk = (node) => {
      if (!node.ungrouped) keys.push(node.key);
      for (const workspaceGroup of node.workspaces) keys.push(workspaceGroup.key);
      for (const child of node.children) walk(child);
    };
    for (const node of customWorkspaceTree) walk(node);
    return keys;
  }, [customWorkspaceTree, groups]);
  const allWorkspacesCollapsed = workspaceGroupKeys.length > 0 && workspaceGroupKeys.every((key) => collapsedGroups.has(key));
  const toggleAllWorkspaces = () => {
    const next = new Set(collapsedGroups);
    if (allWorkspacesCollapsed) {
      for (const key of workspaceGroupKeys) next.delete(key);
    } else {
      for (const key of workspaceGroupKeys) next.add(key);
    }
    setPrefs({ collapsedGroups: [...next] });
  };
  const focusCollapsed = collapsedGroups.has("__focus");
  (0, import_react8.useEffect)(() => {
    if (typeof document === "undefined") return void 0;
    const handler = (event) => {
      const target = event.target;
      const pane = paneRef.current;
      const withinPane = Boolean(pane && (pane.contains(target) || pane.contains(document.activeElement)));
      if (!withinPane && !searchOpen) return;
      if (dialog) return;
      const typing = target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (dialog) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMenu(null);
        setContextMenu(null);
        setSearchOpen(true);
        return;
      }
      if (typing && !(mod && event.altKey)) return;
      if (mod && event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        startSession();
        return;
      }
      const focused = annotated.find((row) => row.session.id === focusedRef.current) ?? archived.find((row) => row.session.id === focusedRef.current);
      if (!focused) return;
      if (event.key === "F2" || mod && event.altKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        setMenu(null);
        setContextMenu(null);
        setDialog({ kind: "renameSession", row: focused });
      } else if (mod && event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        closeMenus();
        run(() => forkSession(focused.session.id), "toast.forked");
      } else if (mod && event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        closeMenus();
        archive(focused);
      } else if (event.key === "Escape" && (menu || contextMenu)) {
        closeMenus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [annotated, archived, dialog, menu, contextMenu, startSession, forkSession, run, archive]);
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { ref: paneRef, className: "dsv-side", "data-compact": prefs.compact || void 0, onClick: (event) => event.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("style", { children: STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("header", { className: "dsv-sideHead", children: searchOpen ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideSearch", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          type: "button",
          className: "dsv-sideSearchIcon",
          "aria-label": t("side.search"),
          onClick: () => searchRef.current?.focus(),
          children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(SearchIcon, { size: 14 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "input",
        {
          ref: searchRef,
          type: "search",
          value: query,
          placeholder: t("side.search"),
          "aria-label": t("side.search"),
          onChange: (event) => setQuery(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Escape") {
              if (query) setQuery("");
              else setSearchOpen(false);
            }
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          type: "button",
          className: "dsv-sideClear",
          "aria-label": query ? t("side.clear") : t("side.closeSearch"),
          onClick: () => {
            if (query) setQuery("");
            else setSearchOpen(false);
          },
          children: "\xD7"
        }
      )
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideTitleRow", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideTitle", children: t("side.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideHeadActions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-sideIconBtn",
            "aria-label": t("side.search"),
            title: t("side.search"),
            onClick: () => {
              setMenu(null);
              setSearchOpen(true);
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(SearchIcon, { size: 14 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", className: "dsv-sideIconBtn", "aria-label": t("side.new"), title: t("side.new"), onClick: () => startSession(), children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PlusIcon, { size: 14 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-sideIconBtn",
            "aria-label": t("side.addWorkspace"),
            title: t("side.addWorkspace"),
            onClick: () => setDialog({ kind: "addWorkspace" }),
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(FolderIcon, { size: 14 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-sideIconBtn",
            "aria-label": t("side.manage"),
            title: t("side.manage"),
            onClick: () => openPanel?.(),
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(SessionViewIcon, { size: 14 })
          }
        )
      ] })
    ] }) }),
    focusGroup && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      FocusBar,
      {
        t,
        prefs,
        onManage: () => setDialog({ kind: "focus" }),
        onExit: () => setPrefs({ focusGroupId: "" })
      }
    ),
    flash && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideFlash", role: "status", children: flash }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideScroll", children: searchActive ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "dsv-sideGroup", "aria-label": t("side.searchResults"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideGroupHead dsv-sideSectionHead", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideGroupToggle", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideGroupTitle", children: t("side.searchResults") }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideCount", children: localDisplay.length + contentDisplay.length })
        ] }),
        search.state === "loading" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideHint", children: t("side.searching") })
      ] }),
      localDisplay.map((row) => renderRow(row)),
      contentDisplay.map((hit) => {
        const summary = sessions?.byId?.[hit.sessionId];
        if (!summary) return null;
        return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
          "button",
          {
            type: "button",
            className: "dsv-sideHit",
            onClick: () => openSession(hit.sessionId),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Dot, { status: statuses?.get(hit.sessionId)?.running ? "running" : "idle" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "dsv-sideRowMain", children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideRowTitle", children: sessionTitle(summary) }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideHitSnippet", children: hit.snippet })
              ] })
            ]
          },
          `hit-${hit.sessionId}`
        );
      }),
      search.state === "error" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideHint", children: search.error }),
      localDisplay.length === 0 && contentDisplay.length === 0 && search.state !== "loading" && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideEmpty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: t("empty.filtered") }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", className: "dsv-sideTextBtn", onClick: () => setQuery(""), children: t("side.clear") })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
      prefs.archivedFilter !== "only" && prefs.showActive && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "dsv-sideGroup", "aria-label": t("side.active"), children: [
        sectionHead({
          key: "__active",
          label: t("side.active"),
          count: activeTop.length,
          icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ActivityIcon, { size: 12 }),
          collapsed: activeCollapsed,
          extra: !activeCollapsed && activeTop.length > prefs.activeLimit && prefs.activeLimit > 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", className: "dsv-sideTextBtn", onClick: () => setExpandedActive((prev) => !prev), children: t(expandedActive ? "side.less" : "side.more") }) : null
        }),
        !activeCollapsed && activeRowsView.map((row) => renderRow(row))
      ] }),
      prefs.archivedFilter !== "only" && prefs.showPinned && pinnedRows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "dsv-sideGroup", "aria-label": t("section.pinned"), children: [
        sectionHead({
          key: "__pinned",
          label: t("section.pinned"),
          count: pinnedRows.length,
          icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PinIcon, { size: 12 }),
          collapsed: pinnedCollapsed
        }),
        !pinnedCollapsed && pinnedView.map((row) => renderRow(row))
      ] }),
      prefs.archivedFilter !== "only" && prefs.showRecent && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "dsv-sideGroup", "aria-label": t("side.recent"), children: [
        sectionHead({
          key: "__recent",
          label: t("side.recent"),
          count: recentTop.length,
          icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ClockIcon, { size: 12 }),
          collapsed: recentCollapsed,
          extra: !recentCollapsed && recentTop.length > prefs.recentLimit && prefs.recentLimit > 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", className: "dsv-sideTextBtn", onClick: () => setExpandedRecent((prev) => !prev), children: t(expandedRecent ? "side.less" : "side.more") }) : null
        }),
        !recentCollapsed && recentRowsView.map((row) => renderRow(row))
      ] }),
      prefs.archivedFilter !== "only" && prefs.focusEnabled !== false && !query.trim() && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "dsv-sideGroup dsv-sideFocus", "aria-label": t("focus.groups"), children: [
        sectionHead({
          key: "__focus",
          label: t("focus.groups"),
          count: prefs.focusGroups.length,
          icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(TargetIcon, { size: 12 }),
          collapsed: focusCollapsed,
          extra: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "dsv-sideHeadActions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              "button",
              {
                type: "button",
                className: "dsv-sideIconBtn",
                "aria-label": t("focus.new"),
                title: t("focus.new"),
                onClick: () => setDialog({ kind: "focus", creating: true }),
                children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PlusIcon, { size: 12 })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              "button",
              {
                type: "button",
                className: "dsv-sideIconBtn",
                "aria-label": t("focus.manage"),
                title: t("focus.manage"),
                onClick: () => setDialog({ kind: "focus" }),
                children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(SessionViewIcon, { size: 12 })
              }
            )
          ] })
        }),
        !focusCollapsed && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_jsx_runtime9.Fragment, { children: prefs.focusGroups.map((entry) => {
          const active = entry.id === prefs.focusGroupId;
          const summary = memberSummary(entry, workspaces);
          const expanded = focusExpandedSet.has(entry.id);
          const memberIds = new Set(entry.workspaceIds);
          const memberGroups = expanded ? buildGroups(
            filterRowsByWorkspaceIds(restRows, memberIds),
            restrictWorkspacesToIds(workspaces, memberIds)
          ) : [];
          return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              "div",
              {
                className: "dsv-focusRow",
                "data-active": active,
                "data-open": expanded || void 0,
                onContextMenu: (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeMenus();
                  setContextMenu({ kind: "focus", id: entry.id, x: event.clientX, y: event.clientY });
                },
                children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "dsv-focusRowMain",
                    "aria-expanded": expanded,
                    title: t(expanded ? "focus.collapse" : "focus.expand"),
                    onClick: () => toggleFocusExpanded(entry.id),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-focusChevron", "data-collapsed": !expanded, children: expanded ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronDownIcon, { size: 10 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronRightIcon, { size: 10 }) }),
                      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-focusDot", "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-focusRowName", children: groupLabel(t, prefs, entry) }),
                      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-focusRowMeta", children: summary.stale > 0 ? t("focus.staleCount", { n: summary.stale }) : t("focus.memberCount", { n: entry.workspaceIds.length }) })
                    ]
                  }
                )
              }
            ),
            expanded && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-focusBody", children: memberGroups.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideHint dsv-focusEmptyBody", children: t("focus.membersEmpty") }) : memberGroups.map((group, index) => renderGroup(group, index)) })
          ] }, entry.id);
        }) })
      ] }),
      prefs.archivedFilter !== "only" && prefs.showWorkspaces && (customWorkspaceTree ? customWorkspaceTree.length > 0 : groups.length > 0) && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "dsv-sideGroup dsv-sideWorkspaces", "aria-label": t("side.workspaces"), children: [
        sectionHead({
          key: "__workspaces",
          label: t("side.workspaces"),
          count: workspaceSectionCount,
          icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LayoutIcon, { size: 12 }),
          collapsed: workspacesCollapsed,
          onContextMenu: (event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenu(null);
            setContextMenu({ kind: "workspaceSection", x: event.clientX, y: event.clientY });
          },
          onDragOver: (event) => {
            if (groupMode !== "workspace" || !workspaceDragRef.current) return;
            event.preventDefault();
            event.currentTarget.classList.add("dsv-dropTarget");
          },
          onDragLeave: (event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            event.currentTarget.classList.remove("dsv-dropTarget");
          },
          onDrop: (event) => {
            const from = workspaceDragRef.current;
            if (groupMode !== "workspace" || !from) return;
            event.preventDefault();
            event.currentTarget.classList.remove("dsv-dropTarget");
            workspaceDragRef.current = null;
            clearDragMarks();
            assignWorkspaceTo(from, null, null);
          },
          extra: workspaceGroupKeys.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
            "button",
            {
              type: "button",
              className: "dsv-sideGroupIcon",
              "aria-expanded": !allWorkspacesCollapsed,
              "aria-label": allWorkspacesCollapsed ? t("action.expandAll") : t("action.collapseAll"),
              title: allWorkspacesCollapsed ? t("action.expandAll") : t("action.collapseAll"),
              "data-collapsed": allWorkspacesCollapsed || void 0,
              onClick: toggleAllWorkspaces,
              children: allWorkspacesCollapsed ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronsDownIcon, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ChevronsUpIcon, { size: 14 })
            }
          ) : null
        }),
        !workspacesCollapsed && (customWorkspaceTree ? customWorkspaceTree.map((node) => renderCustomGroup(node)) : groups.map((group, index) => renderGroup(group, index)))
      ] }),
      (prefs.archivedFilter === "show" || prefs.archivedFilter === "only") && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "dsv-sideGroup", "aria-label": t("side.archived"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideGroupHead dsv-sideSectionHead", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dsv-sideGroupToggle", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideChevron", "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ArchiveIcon, { size: 12 }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideGroupTitle", children: t("side.archived") }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideCount", children: archived.length })
        ] }) }),
        archived.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideHint", children: t("archived.empty") }) : archived.map((row) => renderRow(row, { archivedRow: true }))
      ] }),
      activeRowsView.length === 0 && pinnedRows.length === 0 && archived.length === 0 && prefs.showWorkspaces && workspaceRowCount === 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dsv-sideEmpty", children: focusGroup ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: t("focus.emptySide") }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideHint", children: t("focus.emptySideHint") }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: "dsv-sideTextBtn",
            onClick: () => setDialog({ kind: "focus" }),
            children: t("focus.manage")
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: t("empty.none") }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dsv-sideHint", children: t("empty.noneHint") })
      ] }) })
    ] }) }),
    dialog?.kind === "renameSession" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      PromptDialog,
      {
        t,
        title: t("dialog.renameSession.title"),
        label: t("dialog.renameSession.label"),
        initial: dialog.row.title,
        busy,
        onClose: () => setDialog(null),
        onSubmit: (value) => {
          const row = dialog.row;
          setDialog(null);
          run(() => renameSession(row.session.id, value), "toast.renamed");
        }
      }
    ),
    dialog?.kind === "addWorkspace" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      PromptDialog,
      {
        t,
        title: t("dialog.addWorkspace.title"),
        label: t("dialog.addWorkspace.path"),
        browse: async () => {
          try {
            return await pickDirectory();
          } catch (error) {
            setFlash(t("dialog.browseFailed", { message: errorText2(error) }));
            return "";
          }
        },
        busy,
        onClose: () => setDialog(null),
        onSubmit: (value) => {
          setDialog(null);
          run(() => createWorkspace({ path: value }), "toast.workspaceAdded");
        }
      }
    ),
    dialog?.kind === "renameWorkspace" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      PromptDialog,
      {
        t,
        title: t("dialog.renameWorkspace.title"),
        label: t("dialog.renameWorkspace.title"),
        initial: workspaceLabel(dialog.workspace),
        busy,
        onClose: () => setDialog(null),
        onSubmit: (value) => {
          const workspace = dialog.workspace;
          setDialog(null);
          run(() => renameWorkspace(workspace.workspaceId, value), "toast.workspaceRenamed");
        }
      }
    ),
    dialog?.kind === "deleteWorkspace" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      ConfirmDialog,
      {
        t,
        title: t("dialog.deleteWorkspace.title"),
        body: t("dialog.deleteWorkspace.body", { name: workspaceLabel(dialog.workspace) }),
        confirmKey: "dialog.delete",
        busy,
        onClose: () => setDialog(null),
        onConfirm: () => {
          const workspace = dialog.workspace;
          setDialog(null);
          run(() => deleteWorkspace(workspace.workspaceId), "toast.workspaceDeleted");
        }
      }
    ),
    dialog?.kind === "workspaceGroupCreate" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      PromptDialog,
      {
        t,
        title: t("group.new"),
        label: t("group.namePlaceholder"),
        initial: "",
        busy,
        onClose: () => setDialog(null),
        onSubmit: (value) => {
          const parentId = dialog.parentId || null;
          setDialog(null);
          createWorkspaceGroup(value, parentId);
        }
      }
    ),
    dialog?.kind === "workspaceGroupRename" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      PromptDialog,
      {
        t,
        title: t("action.rename"),
        label: t("group.namePlaceholder"),
        initial: dialog.name || "",
        busy,
        onClose: () => setDialog(null),
        onSubmit: (value) => {
          const id = dialog.id;
          setDialog(null);
          renameWorkspaceGroup(id, value);
        }
      }
    ),
    dialog?.kind === "workspaceGroupDelete" && (() => {
      const group = (prefs.workspaceGroups ?? []).find((entry) => entry.id === dialog.id);
      if (!group) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        ConfirmDialog,
        {
          t,
          title: t("group.delete.title"),
          body: t("group.delete.body", { name: groupDisplayName(t, group, 0) }),
          confirmKey: "dialog.delete",
          busy,
          onClose: () => setDialog(null),
          onConfirm: () => {
            const id = dialog.id;
            setDialog(null);
            deleteWorkspaceGroup(id);
          }
        }
      );
    })(),
    dialog?.kind === "focus" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      FocusDialog,
      {
        t,
        prefs,
        workspaces,
        initialCreating: dialog.creating === true,
        onChange: (patch) => setPrefs(patch),
        onClose: () => setDialog(null)
      }
    ),
    dialog?.kind === "focusRename" && (() => {
      const group = prefs.focusGroups.find((entry) => entry.id === dialog.id);
      if (!group) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        PromptDialog,
        {
          t,
          title: t("focus.rename.title"),
          label: t("focus.rename.title"),
          initial: groupLabel(t, prefs, group),
          onClose: () => setDialog(null),
          onSubmit: (value) => {
            setDialog(null);
            setPrefs(renameFocusGroup(prefs, group.id, value));
          }
        }
      );
    })(),
    dialog?.kind === "focusMembers" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      FocusMembersDialog,
      {
        t,
        prefs,
        workspaces,
        groupId: dialog.id,
        onChange: (patch) => setPrefs(patch),
        onClose: () => setDialog(null)
      }
    ),
    dialog?.kind === "focusDelete" && (() => {
      const group = prefs.focusGroups.find((entry) => entry.id === dialog.id);
      if (!group) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        ConfirmDialog,
        {
          t,
          title: t("focus.delete.title"),
          body: t("focus.delete.body", { name: groupLabel(t, prefs, group) }),
          confirmKey: "dialog.delete",
          onClose: () => setDialog(null),
          onConfirm: () => {
            setDialog(null);
            setPrefs(removeFocusGroup(prefs, group.id));
          }
        }
      );
    })(),
    contextMenu && contextItems && (0, import_react_dom2.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "div",
        {
          className: "dsv-menu dsv-contextMenu",
          role: "menu",
          style: {
            left: Math.min(contextMenu.x, (globalThis.innerWidth ?? 1200) - 220),
            top: Math.min(contextMenu.y, (globalThis.innerHeight ?? 800) - 280)
          },
          onPointerDown: (event) => event.stopPropagation(),
          children: contextItems
        }
      ),
      globalThis.document.body
    ),
    dialog?.kind === "archiveRunning" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      ConfirmDialog,
      {
        t,
        title: t("dialog.archiveRunning.title"),
        body: t("dialog.archiveRunning.body", { title: dialog.row.title }),
        confirmKey: "dialog.confirm",
        busy,
        onClose: () => setDialog(null),
        onConfirm: () => {
          const row = dialog.row;
          const trash = dialog.trash;
          setDialog(null);
          run(async () => {
            await archiveSession(row.session.id, { stopActivity: true });
            if (trash) {
              await addToTrash([
                { sessionId: row.session.id, title: row.title, cwd: row.session.cwd ?? "", deletedAt: Date.now() }
              ]);
              addTrashIds([row.session.id]);
              await unarchiveSession(row.session.id).catch(() => {
              });
            }
          }, trash ? "toast.trashed" : "toast.stoppedArchived", trash ? { n: 1 } : void 0);
        }
      }
    )
  ] });
}

// src/client/sidebar-board.jsx
var import_jsx_runtime10 = require("react/jsx-runtime");
var NARROW_WIDTH = 150;
function usePrefs2() {
  return (0, import_react9.useSyncExternalStore)(subscribePrefs, getPrefs, getPrefs);
}
function SidebarHost({
  t,
  useSessions,
  useSessionStatus,
  useWorkspaces,
  ...paneProps
}) {
  const prefs = usePrefs2();
  const anchorRef = (0, import_react9.useRef)(null);
  const regionRef = (0, import_react9.useRef)(null);
  const [host, setHost] = (0, import_react9.useState)(null);
  const [narrow, setNarrow] = (0, import_react9.useState)(false);
  (0, import_react9.useLayoutEffect)(() => {
    const anchor = anchorRef.current;
    if (!anchor) return void 0;
    let root = anchor;
    let nav = null;
    while (root && !(nav = root.querySelector?.("nav"))) root = root.parentElement;
    if (!nav || !nav.parentElement) return void 0;
    const region = nav.nextElementSibling;
    regionRef.current = region;
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
      if (region) region.style.display = "";
      node.remove();
      regionRef.current = null;
      setHost(null);
    };
  }, []);
  const active = prefs.mode === "session" && !narrow && host !== null;
  (0, import_react9.useLayoutEffect)(() => {
    const region = regionRef.current;
    if (!host) return void 0;
    host.hidden = false;
    if (!region) return void 0;
    const HIDDEN = "data-dsv-native-hidden";
    const restoreRegion = () => {
      for (const node of region.querySelectorAll(`[${HIDDEN}]`)) {
        node.style.display = node.getAttribute(HIDDEN) ?? "";
        node.removeAttribute(HIDDEN);
      }
      region.style.display = "";
      region.style.flex = "";
      region.style.overflow = "";
      region.style.minHeight = "";
      region.style.height = "";
    };
    const apply2 = () => {
      const nav = region.parentElement?.querySelector("nav") ?? region.previousElementSibling;
      if (!active) {
        restoreRegion();
        host.classList.remove("dsv-boardHost--inline");
        if (nav) nav.insertAdjacentElement("afterend", host);
        host.style.flex = "0 0 auto";
        host.style.height = "auto";
        return;
      }
      const ssh = region.querySelector(":scope > .dsh-ssh-sidebar");
      if (ssh) {
        if (host.parentElement !== region || host.previousElementSibling !== ssh) {
          region.insertBefore(host, ssh.nextSibling);
        }
        host.classList.add("dsv-boardHost--inline");
        for (const node of region.children) {
          if (node === ssh || node === host || node.hasAttribute(HIDDEN)) continue;
          node.setAttribute(HIDDEN, node.style.display);
          node.style.display = "none";
        }
        region.style.display = "";
        region.style.flex = "1 1 auto";
        region.style.overflow = "visible";
        region.style.minHeight = "0";
        region.style.height = "auto";
        host.style.flex = "1 1 auto";
        host.style.height = "auto";
        return;
      }
      restoreRegion();
      host.classList.remove("dsv-boardHost--inline");
      if (nav) nav.insertAdjacentElement("afterend", host);
      region.style.display = "none";
      host.style.flex = "1 1 auto";
      host.style.height = "auto";
    };
    apply2();
    let observer;
    if (typeof MutationObserver === "function") {
      observer = new MutationObserver(apply2);
      observer.observe(region, { childList: true });
    }
    return () => {
      observer?.disconnect();
      restoreRegion();
    };
  }, [active, host]);
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { ref: anchorRef, className: "dsv-footAnchor", "aria-hidden": "true" }),
    active && (0, import_react_dom3.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
        "div",
        {
          className: "dsv-workarea",
          onClick: (event) => {
            event.stopPropagation();
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("style", { children: STYLES }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              SidebarWorkspacePane,
              {
                t,
                useSessions,
                useSessionStatus,
                useWorkspaces,
                ...paneProps
              }
            )
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
  "filter.group": "\u5206\u7EC4\u65B9\u5F0F",
  "filter.filterSessions": "\u70B9\u51FB\u5DE5\u4F5C\u533A\u540D\u79F0\u7B5B\u9009\u4F1A\u8BDD",
  "filter.applyWorkspace": "\u5728\u4F1A\u8BDD\u89C6\u56FE\u4E2D\u7B5B\u9009\u6B64\u5DE5\u4F5C\u533A",
  "counts.all": "\u5168\u90E8",
  "counts.summary": "{n} \u4E2A\u4F1A\u8BDD",
  "counts.workspaces": "{n} \u4E2A\u5DE5\u4F5C\u533A",
  "counts.groups": "{n} \u4E2A\u5206\u7EC4",
  "status.running": "\u8FD0\u884C\u4E2D",
  "status.pending": "\u5F85\u5904\u7406",
  "status.done": "\u5DF2\u5B8C\u6210",
  "status.idle": "\u7A7A\u95F2",
  "pending.approval": "\u7B49\u5F85\u6279\u51C6",
  "pending.planReview": "\u7B49\u5F85\u65B9\u6848\u5BA1\u6838",
  "pending.question": "\u7B49\u5F85\u56DE\u7B54",
  "pending.generic": "\u7B49\u5F85\u5904\u7406",
  "row.child": "\u5B50\u4F1A\u8BDD",
  "row.newSession": "\u65B0\u4F1A\u8BDD",
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
  "tab.workspaces": "\u5DE5\u4F5C\u533A\u7B5B\u9009",
  "tab.sessionGroups": "\u4F1A\u8BDD\u5206\u7EC4",
  "tab.workspaceGroups": "\u5DE5\u4F5C\u533A\u5206\u7EC4",
  "groups.title": "\u4F1A\u8BDD\u5206\u7EC4",
  "groups.workspaceTitle": "\u5DE5\u4F5C\u533A\u5206\u7EC4\u7BA1\u7406",
  "groups.workspaceHint": "\u6309\u201C\u5206\u7EC4 \u2192 \u5B50\u5206\u7EC4\u201D\u6574\u7406\u5DE5\u4F5C\u533A\uFF1B\u5DE6\u4FA7\u5DE5\u4F5C\u533A\u5206\u7EC4\u89C6\u56FE\u6309\u8FD9\u91CC\u7684\u5C42\u7EA7\u5C55\u793A\u3002",
  "groups.hint": "\u628A\u4F1A\u8BDD\u5F52\u5165\u591A\u7EA7\u5206\u7EC4\uFF1B\u4E0B\u65B9\u7684\u4E0B\u62C9\u6846\u53EF\u76F4\u63A5\u8C03\u6574\u6240\u5C5E\u5206\u7EC4\u3002",
  "groups.manage": "\u7BA1\u7406\u5206\u7EC4",
  "groups.search": "\u7B5B\u9009\u4F1A\u8BDD\u6216\u5206\u7EC4",
  "groups.assign": "\u6240\u5C5E\u5206\u7EC4",
  "groups.empty": "\u6682\u65E0\u4F1A\u8BDD",
  "workspaceFilter.title": "\u6309\u5DE5\u4F5C\u533A\u7B5B\u9009",
  "workspaceFilter.hint": "\u70B9\u51FB\u5DE5\u4F5C\u533A\u540D\u79F0\uFF0C\u4F1A\u8BDD\u89C6\u56FE\u53EA\u5C55\u793A\u8BE5\u5DE5\u4F5C\u533A\u7684\u4F1A\u8BDD\uFF1B\u53F3\u4FA7\u5F00\u5173\u63A7\u5236\u5DE6\u4FA7\u662F\u5426\u663E\u793A\u8BE5\u5DE5\u4F5C\u533A\u3002",
  "workspaceFilter.allHint": "\u6E05\u9664\u5DE5\u4F5C\u533A\u7B5B\u9009\uFF0C\u5C55\u793A\u5168\u90E8\u4F1A\u8BDD",
  "tab.settings": "\u8BBE\u7F6E",
  "section.pinned": "\u7F6E\u9876",
  "section.running": "\u8FD0\u884C\u4E2D",
  "section.pending": "\u5F85\u5904\u7406",
  "section.done": "\u5B8C\u6210\u672A\u8BFB",
  "section.idle": "\u5176\u4ED6\u4F1A\u8BDD",
  "section.all": "\u5168\u90E8\u4F1A\u8BDD",
  "section.empty": "\u6682\u65E0\u4F1A\u8BDD",
  "manage.start": "\u6279\u91CF\u7BA1\u7406",
  "manage.done": "\u5B8C\u6210",
  "manage.byWorkspace": "\u6309\u5DE5\u4F5C\u533A",
  "manage.byStatus": "\u6309\u72B6\u6001",
  "select.all": "\u5168\u9009",
  "select.clear": "\u53D6\u6D88\u9009\u62E9",
  "select.group": "\u9009\u62E9\u672C\u7EC4",
  "select.count": "\u5DF2\u9009 {n} \u9879",
  "action.pin": "\u7F6E\u9876",
  "action.unpin": "\u53D6\u6D88\u7F6E\u9876",
  "action.archive": "\u5F52\u6863",
  "action.trash": "\u79FB\u5230\u56DE\u6536\u7AD9",
  "action.restore": "\u6062\u590D",
  "action.expandAll": "\u5C55\u5F00\u5168\u90E8",
  "action.check": "\u68C0\u67E5\u4F18\u5316",
  "action.collapseAll": "\u6536\u8D77\u5168\u90E8",
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
  "toast.archived": "\u5DF2\u5F52\u6863 {n} \u4E2A\u4F1A\u8BDD",
  "toast.trashed": "\u5DF2\u79FB\u5165\u56DE\u6536\u7AD9 {n} \u4E2A\u4F1A\u8BDD",
  "toast.restored": "\u5DF2\u6062\u590D {n} \u4E2A\u4F1A\u8BDD",
  "toast.purged": "\u5DF2\u5F7B\u5E95\u5220\u9664 {n} \u4E2A\u4F1A\u8BDD",
  "toast.failed": "\u64CD\u4F5C\u5931\u8D25\uFF1A{message}",
  "toast.stale": "\u5DF2\u6E05\u7406 {n} \u4E2A\u72B6\u6001\u5931\u6548\u7684\u4F1A\u8BDD",
  "toast.checked": "\u5DF2\u91CD\u65B0\u68C0\u67E5\u4F1A\u8BDD\u5217\u8868",
  "batch.forcePurge": "\u5F3A\u5236\u5220\u9664",
  "confirm.forcePurge.title": "\u5F3A\u5236\u5F7B\u5E95\u5220\u9664\u4F1A\u8BDD",
  "confirm.forcePurge.body": "\u5C06\u8DF3\u8FC7\u5360\u7528\u68C0\u67E5\uFF0C\u76F4\u63A5\u5220\u9664 {n} \u4E2A\u4F1A\u8BDD\u7684\u65E5\u5FD7\u4E0E\u672C\u5730\u6587\u4EF6\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002",
  "confirm.forcePurge.warning": "\u8FD0\u884C\u4E2D\u7684\u4F1A\u8BDD\u4ECD\u4F1A\u88AB\u62D2\u7EDD\uFF1B\u82E5\u6587\u4EF6\u6B63\u88AB\u5360\u7528\uFF0C\u8BF7\u91CD\u542F DSH \u540E\u91CD\u8BD5\u3002",
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
  "loading": "\u52A0\u8F7D\u4E2D\u2026",
  "side.title": "\u4F1A\u8BDD",
  "side.manage": "\u4F1A\u8BDD\u7BA1\u7406",
  "settings.nav": "\u4F1A\u8BDD\u89C6\u56FE",
  "side.new": "\u65B0\u4F1A\u8BDD",
  "side.addWorkspace": "\u6DFB\u52A0\u5DE5\u4F5C\u533A",
  "side.search": "\u641C\u7D22\u4F1A\u8BDD",
  "side.native": "\u539F\u7248\u5DE5\u4F5C\u533A",
  "side.sessionView": "\u4F1A\u8BDD\u89C6\u56FE",
  "side.switch.native": "\u5207\u56DE\u539F\u7248\u5DE5\u4F5C\u533A",
  "side.switch.session": "\u5207\u6362\u5230\u4F1A\u8BDD\u89C6\u56FE",
  "side.settings": "\u8BBE\u7F6E",
  "side.active": "\u6D3B\u8DC3\u4F1A\u8BDD",
  "side.recent": "\u6700\u8FD1\u4F1A\u8BDD",
  "side.workspaces": "\u5DE5\u4F5C\u533A\u4F1A\u8BDD",
  "side.workspaceFilter": "\u5DE5\u4F5C\u533A\u7B5B\u9009",
  "side.workspaceActive": "\u6709\u6D3B\u8DC3\u4F1A\u8BDD",
  "side.archived": "\u5DF2\u5F52\u6863",
  "side.ungrouped": "\u672A\u5206\u7EC4",
  "side.more": "\u5C55\u5F00\u66F4\u591A",
  "side.less": "\u6536\u8D77",
  "side.menu": "\u66F4\u591A\u64CD\u4F5C",
  "side.searchResults": "\u641C\u7D22\u7ED3\u679C",
  "side.searching": "\u641C\u7D22\u4E2D\u2026",
  "side.noContent": "\u6CA1\u6709\u5185\u5BB9\u5339\u914D",
  "side.clear": "\u6E05\u9664",
  "side.closeSearch": "\u5173\u95ED\u641C\u7D22",
  "side.dropHere": "\u62D6\u5230\u8FD9\u91CC",
  "side.pinHint": "\u7F6E\u9876\u4F1A\u8BDD\u4F1A\u56FA\u5B9A\u5728\u6700\u4E0A\u65B9",
  "settings.title": "\u8BBE\u7F6E",
  "settings.mode": "\u5DE6\u4FA7\u5DE5\u4F5C\u533A",
  "settings.mode.session": "\u4F1A\u8BDD\u89C6\u56FE",
  "settings.mode.native": "\u539F\u7248\u5DE5\u4F5C\u533A",
  "settings.activeLimit": "\u6D3B\u8DC3\u4F1A\u8BDD\u663E\u793A\u4E2A\u6570",
  "settings.recentLimit": "\u6700\u8FD1\u4F1A\u8BDD\u663E\u793A\u4E2A\u6570",
  "settings.workspaceLimit": "\u6BCF\u4E2A\u5DE5\u4F5C\u533A\u663E\u793A\u4E2A\u6570",
  "settings.showIdle": "\u663E\u793A\u7A7A\u95F2\u4F1A\u8BDD",
  "settings.showSubagents": "\u663E\u793A\u5B50\u4F1A\u8BDD",
  "settings.showRecent": "\u663E\u793A\u6700\u8FD1\u4F1A\u8BDD\u5206\u7EC4",
  "settings.showPinned": "\u663E\u793A\u7F6E\u9876\u4F1A\u8BDD\u5206\u7EC4",
  "settings.showActive": "\u663E\u793A\u6D3B\u8DC3\u4F1A\u8BDD\u5206\u7EC4",
  "settings.showWorkspaces": "\u663E\u793A\u5DE5\u4F5C\u533A\u4F1A\u8BDD\u5206\u7EC4",
  "settings.showTimes": "\u663E\u793A\u66F4\u65B0\u65F6\u95F4",
  "settings.compact": "\u7D27\u51D1\u884C\u9AD8",
  "settings.group.glow": "\u52A8\u6001\u8FB9\u6846",
  "settings.glow.hint": "\u4E3A\u8FD0\u884C\u4E2D\u3001\u5F85\u5904\u7406\u3001\u5DF2\u5B8C\u6210\u672A\u8BFB\u7684\u4F1A\u8BDD\u884C\u5206\u522B\u914D\u7F6E\uFF0C\u9884\u89C8\u5373\u5B9E\u9645\u6548\u679C\uFF1B\u4E0D\u6539\u53D8\u884C\u9AD8\u3002",
  "settings.glow.running": "\u8FD0\u884C\u4E2D\u4F1A\u8BDD",
  "settings.glow.pending": "\u5F85\u5904\u7406\u4F1A\u8BDD",
  "settings.glow.done": "\u5DF2\u5B8C\u6210\u672A\u8BFB",
  "settings.glow.sample": "\u793A\u4F8B\u4F1A\u8BDD",
  "settings.glow.now": "\u521A\u521A",
  "settings.glow.style": "\u8FB9\u6846\u6548\u679C",
  "settings.glow": "\u6D3B\u8DC3/\u5F85\u5904\u7406\u8FB9\u6846",
  "settings.desc.glow": "\u4E3A\u8FD0\u884C\u4E2D\u548C\u5F85\u5904\u7406\u7684\u4F1A\u8BDD\u884C\u52A0\u52A8\u6001\u8FB9\u6846\uFF0C\u4E0D\u6539\u53D8\u884C\u9AD8\u3002",
  "settings.glow.off": "\u5173\u95ED",
  "settings.glow.marquee": "\u8DD1\u9A6C\u706F",
  "settings.glow.aurora": "\u6781\u5149\u6D41\u5149",
  "settings.glow.pulse": "\u547C\u5438\u8109\u51B2",
  "settings.glow.rainbow": "\u5F69\u8679\u6D41\u8F6C",
  "settings.glow.comet": "\u5F57\u661F\u62D6\u5C3E",
  "settings.glow.scan": "\u626B\u63CF\u7EBF",
  "settings.glow.dash": "\u6D41\u5149\u865A\u7EBF",
  "settings.shortcuts": "\u5FEB\u6377\u952E\uFF1ACtrl+K \u641C\u7D22\u3001Ctrl+Alt+N \u65B0\u5EFA\u3001F2 \u91CD\u547D\u540D\u3001Ctrl+Alt+F \u6D3E\u751F\u3001Ctrl+Alt+A \u5F52\u6863",
  "settings.sort": "\u4F1A\u8BDD\u6392\u5E8F",
  "settings.sort.updated": "\u6700\u8FD1\u66F4\u65B0",
  "settings.sort.manual": "\u624B\u52A8\u6392\u5E8F",
  "settings.archived": "\u5DF2\u5F52\u6863\u4F1A\u8BDD",
  "settings.archived.hide": "\u9690\u85CF",
  "settings.archived.show": "\u663E\u793A\u5728\u5217\u8868\u4E0B\u65B9",
  "settings.archived.only": "\u4EC5\u663E\u793A\u5DF2\u5F52\u6863",
  "settings.nest": "\u5DE5\u4F5C\u533A\u6811\u5F62\u5D4C\u5957",
  "settings.workspaceGroupMode": "\u5DE5\u4F5C\u533A\u5206\u7EC4\u65B9\u5F0F",
  "settings.desc.workspaceGroupMode": "\u9ED8\u8BA4\u5C55\u793A\u6309\u6CE8\u518C\u987A\u5E8F\u5E73\u94FA\uFF1B\u5DE5\u4F5C\u533A\u5D4C\u5957\u6309\u8DEF\u5F84\u5F62\u6210\u6811\uFF1B\u5DE5\u4F5C\u533A\u5206\u7EC4\u6309\u201C\u5206\u7EC4 \u2192 \u5B50\u5206\u7EC4 \u2192 \u5DE5\u4F5C\u533A \u2192 \u4F1A\u8BDD\u201D\u5C55\u793A\uFF0C\u672A\u5F52\u7EC4\u5DE5\u4F5C\u533A\u8FDB\u5165\u201C\u672A\u5206\u7EC4\u201D\u3002\u4F1A\u8BDD\u5206\u7EC4\u8BF7\u5728\u201C\u4F1A\u8BDD\u5206\u7EC4\u201D\u6807\u7B7E\u9875\u7EF4\u62A4\u3002",
  "group.mode.default": "\u9ED8\u8BA4\u5C55\u793A",
  "group.mode.nested": "\u5DE5\u4F5C\u533A\u5D4C\u5957",
  "group.mode.session": "\u4F1A\u8BDD\u5206\u7EC4",
  "group.mode.workspace": "\u5DE5\u4F5C\u533A\u5206\u7EC4",
  "group.mode.title": "\u5DE5\u4F5C\u533A\u5C55\u793A\u6A21\u5F0F",
  "group.ungrouped": "\u672A\u5206\u7EC4",
  "group.manage": "\u5206\u7EC4\u7BA1\u7406",
  "group.searchAll": "\u7B5B\u9009\u5206\u7EC4\u6216\u6210\u5458",
  "group.manage.session": "\u4F1A\u8BDD\u5206\u7EC4\u7BA1\u7406",
  "group.manage.workspace": "\u5DE5\u4F5C\u533A\u5206\u7EC4\u7BA1\u7406",
  "group.manage.session.title": "\u4F1A\u8BDD\u5206\u7EC4\u7BA1\u7406",
  "group.manage.session.hint": "\u5728\u201C\u4F1A\u8BDD\u5206\u7EC4\u201D\u6807\u7B7E\u9875\u4E2D\u628A\u4F1A\u8BDD\u5F52\u5165\u591A\u7EA7\u5206\u7EC4\uFF1B\u6BCF\u4E2A\u4F1A\u8BDD\u6700\u591A\u5C5E\u4E8E\u4E00\u4E2A\u5206\u7EC4\uFF0C\u672A\u5206\u7EC4\u7684\u4F1A\u8BDD\u8FDB\u5165\u201C\u672A\u5206\u7EC4\u201D\u3002",
  "group.manage.title": "\u5DE5\u4F5C\u533A\u5206\u7EC4\u7BA1\u7406",
  "group.manage.hint": "\u81EA\u5B9A\u4E49\u5206\u7EC4\u53EA\u5F71\u54CD\u5DE6\u4FA7\u201C\u5DE5\u4F5C\u533A\u4F1A\u8BDD\u201D\u7684\u5C55\u793A\u987A\u5E8F\uFF1B\u5DE5\u4F5C\u533A\u672C\u8EAB\u548C\u4F1A\u8BDD\u4E0D\u53D7\u5F71\u54CD\u3002\u652F\u6301\u591A\u7EA7\u5206\u7EC4\uFF0C\u4E00\u4E2A\u5DE5\u4F5C\u533A\u53EA\u80FD\u5C5E\u4E8E\u4E00\u4E2A\u5206\u7EC4\u3002",
  "group.count": "\u5171 {n} \u4E2A\u5206\u7EC4",
  "group.new": "\u65B0\u5EFA\u5206\u7EC4",
  "group.create": "\u521B\u5EFA",
  "group.namePlaceholder": "\u5206\u7EC4\u540D\u79F0",
  "group.parent": "\u4E0A\u7EA7\u5206\u7EC4",
  "group.parentNone": "\u65E0\uFF08\u9876\u7EA7\u5206\u7EC4\uFF09",
  "group.defaultName": "\u5206\u7EC4 {n}",
  "group.memberCount": "{n} \u4E2A\u5DE5\u4F5C\u533A",
  "group.empty": "\u6682\u65E0\u5DE5\u4F5C\u533A",
  "group.members": "\u6210\u5458\u5DE5\u4F5C\u533A",
  "group.members.sessions": "\u6210\u5458\u4F1A\u8BDD",
  "group.sessionFilter": "\u7B5B\u9009\u4F1A\u8BDD\u2026",
  "group.noSessions": "\u6CA1\u6709\u53EF\u9009\u7684\u4F1A\u8BDD\u3002",
  "group.addChild": "\u6DFB\u52A0\u5B50\u5206\u7EC4",
  "group.emptyList": "\u8FD8\u6CA1\u6709\u5206\u7EC4\uFF0C\u70B9\u51FB\u201C\u65B0\u5EFA\u5206\u7EC4\u201D\u521B\u5EFA\u7B2C\u4E00\u4E2A\u3002",
  "group.delete.title": "\u5220\u9664\u5206\u7EC4",
  "group.delete.body": "\u786E\u5B9A\u5220\u9664\u201C{name}\u201D\u5417\uFF1F\u5B50\u5206\u7EC4\u4F1A\u79FB\u5230\u4E0A\u4E00\u7EA7\uFF0C\u6210\u5458\u5DE5\u4F5C\u533A\u4F1A\u56DE\u5230\u201C\u672A\u5206\u7EC4\u201D\u3002",
  "settings.reset": "\u6062\u590D\u9ED8\u8BA4",
  "settings.limitAll": "\u5168\u90E8",
  "settings.hint": "\u8BBE\u7F6E\u4FDD\u5B58\u5728\u672C\u673A\u6D4F\u89C8\u5668\uFF0C\u4E0D\u4F1A\u4FEE\u6539 DSH \u914D\u7F6E\u3002",
  "settings.group.display": "\u663E\u793A",
  "settings.group.sections": "\u5206\u7EC4",
  "settings.group.workspaceFilter": "\u5DE5\u4F5C\u533A\u7B5B\u9009",
  "settings.workspaceFilterHint": "\u53D6\u6D88\u52FE\u9009\u540E\u53EA\u5728\u5DE6\u4FA7\u4F1A\u8BDD\u89C6\u56FE\u9690\u85CF\uFF0C\u4E0D\u5F71\u54CD\u4F1A\u8BDD\u7BA1\u7406\uFF1B\u65B0\u6DFB\u52A0\u7684\u5DE5\u4F5C\u533A\u9ED8\u8BA4\u663E\u793A\u3002",
  "settings.workspaceShow": "\u5728\u5DE6\u4FA7\u663E\u793A",
  "settings.workspaceFilterEmpty": "\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\u3002",
  "settings.workspaceFilterReset": "\u5168\u90E8\u663E\u793A",
  "settings.group.limits": "\u6570\u91CF\u4E0E\u6392\u5E8F",
  "settings.group.behavior": "\u5217\u8868\u884C\u4E3A",
  "settings.desc.mode": "\u9009\u62E9\u5DE6\u4FA7\u5DE5\u4F5C\u533A\u4F7F\u7528\u4F1A\u8BDD\u89C6\u56FE\uFF0C\u6216\u6062\u590D DSH \u539F\u7248\u5DE5\u4F5C\u533A\u3002",
  "settings.desc.subagents": "\u663E\u793A\u7236\u4F1A\u8BDD\u4E0B\u7684\u5B50\u4F1A\u8BDD\u884C\u3002",
  "settings.desc.idle": "\u5173\u95ED\u540E\u53EA\u663E\u793A\u8FD0\u884C\u4E2D\u3001\u5F85\u5904\u7406\u3001\u5B8C\u6210\u672A\u8BFB\u7684\u4F1A\u8BDD\u3002",
  "settings.desc.sections": "\u63A7\u5236\u5728\u4FA7\u680F\u4E2D\u663E\u793A\u54EA\u4E9B\u5FEB\u6377\u5206\u7EC4\uFF1B\u7F6E\u9876\u548C\u6D3B\u8DC3\u4E0D\u4F1A\u4ECE\u5DE5\u4F5C\u533A\u4F1A\u8BDD\u4E2D\u79FB\u9664\u3002",
  "settings.desc.workspaces": "\u663E\u793A\u6240\u6709\u5DE5\u4F5C\u533A\u6807\u9898\uFF1B\u6CA1\u6709\u4F1A\u8BDD\u7684\u5DE5\u4F5C\u533A\u4E5F\u4F1A\u4FDD\u7559\u3002",
  "settings.desc.limits": "0 \u8868\u793A\u4E0D\u9650\u5236\uFF1B\u6BCF\u4E2A\u5DE5\u4F5C\u533A\u4F1A\u6839\u636E\u6D3B\u8DC3\u4F1A\u8BDD\u81EA\u52A8\u6269\u5C55\u3002",
  "settings.desc.sort": "\u624B\u52A8\u6392\u5E8F\u4EC5\u5F71\u54CD\u4F1A\u8BDD\u548C\u5DE5\u4F5C\u533A\u7684\u5C55\u793A\u987A\u5E8F\u3002",
  "settings.desc.nest": "\u6309\u5DE5\u4F5C\u533A\u8DEF\u5F84\u5D4C\u5957\u663E\u793A\u5B50\u5DE5\u4F5C\u533A\u3002",
  "settings.focusEnabled": "\u4E13\u6CE8\u6A21\u5F0F",
  "settings.desc.focusEnabled": "\u5173\u95ED\u540E\u9690\u85CF\u5DE6\u4FA7\u4E13\u6CE8\u7EC4\u5206\u533A\u3001\u4E13\u6CE8\u6761\u4E0E\u5168\u90E8\u4E13\u6CE8\u5165\u53E3\uFF1B\u5DF2\u521B\u5EFA\u7684\u4E13\u6CE8\u7EC4\u4F1A\u4FDD\u7559\u3002",
  "settings.desc.archived": "\u63A7\u5236\u5DF2\u5F52\u6863\u4F1A\u8BDD\u662F\u5426\u51FA\u73B0\u5728\u5217\u8868\u548C\u9762\u677F\u4E2D\u3002",
  "settings.desc.times": "\u5728\u4F1A\u8BDD\u884C\u53F3\u4FA7\u663E\u793A\u76F8\u5BF9\u66F4\u65B0\u65F6\u95F4\u3002",
  "settings.desc.compact": "\u964D\u4F4E\u884C\u9AD8\uFF0C\u9002\u5408\u5C0F\u5C4F\u5E55\u6216\u4F1A\u8BDD\u8F83\u591A\u65F6\u4F7F\u7528\u3002",
  "settings.resetHint": "\u53EA\u6062\u590D\u663E\u793A\u8BBE\u7F6E\uFF0C\u4E0D\u4F1A\u5F71\u54CD\u4F1A\u8BDD\u6570\u636E\u3002",
  "dialog.renameSession.title": "\u91CD\u547D\u540D\u4F1A\u8BDD",
  "dialog.renameSession.label": "\u4F1A\u8BDD\u6807\u9898",
  "dialog.renameWorkspace.title": "\u91CD\u547D\u540D\u5DE5\u4F5C\u533A",
  "dialog.addWorkspace.title": "\u6DFB\u52A0\u5DE5\u4F5C\u533A",
  "dialog.addWorkspace.path": "\u76EE\u5F55\u8DEF\u5F84",
  "dialog.addWorkspace.browse": "\u6D4F\u89C8\u2026",
  "dialog.addWorkspace.hint": "\u8F93\u5165\u672C\u673A\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u6216\u4F7F\u7528\u6D4F\u89C8\u9009\u62E9\u76EE\u5F55\u3002",
  "dialog.deleteWorkspace.title": "\u5220\u9664\u5DE5\u4F5C\u533A",
  "dialog.deleteWorkspace.body": "\u4ECE\u5217\u8868\u5220\u9664\u201C{name}\u201D\uFF1F\u4F1A\u8BDD\u4E0D\u4F1A\u88AB\u5220\u9664\u3002",
  "dialog.archiveRunning.title": "\u5F52\u6863\u8FD0\u884C\u4E2D\u7684\u4F1A\u8BDD",
  "dialog.archiveRunning.body": "\u201C{title}\u201D\u6B63\u5728\u8FD0\u884C\u3002\u505C\u6B62\u8FD0\u884C\u5E76\u5F52\u6863\uFF1F",
  "dialog.save": "\u4FDD\u5B58",
  "dialog.delete": "\u5220\u9664",
  "dialog.confirm": "\u786E\u8BA4",
  "dialog.cancel": "\u53D6\u6D88",
  "dialog.browseFailed": "\u65E0\u6CD5\u6253\u5F00\u76EE\u5F55\u9009\u62E9\u5668\uFF1A{message}",
  "action.rename": "\u91CD\u547D\u540D",
  "action.fork": "\u5206\u53C9",
  "action.moveToGroup": "\u79FB\u52A8\u5230\u5206\u7EC4",
  "action.removeFromGroup": "\u79FB\u51FA\u5206\u7EC4",
  "action.moveToRoot": "\u79FB\u5230\u6839\u7EA7",
  "groups.emptyGroups": "\u6682\u65E0\u5206\u7EC4",
  "action.copyId": "\u590D\u5236\u4F1A\u8BDD ID",
  "action.menu": "\u66F4\u591A\u64CD\u4F5C",
  "action.renameWorkspace": "\u91CD\u547D\u540D\u5DE5\u4F5C\u533A",
  "action.deleteWorkspace": "\u5220\u9664\u5DE5\u4F5C\u533A",
  "action.newSession": "\u65B0\u5EFA\u4F1A\u8BDD",
  "toast.renamed": "\u5DF2\u91CD\u547D\u540D",
  "toast.forked": "\u5DF2\u521B\u5EFA\u5206\u53C9",
  "toast.copied": "\u5DF2\u590D\u5236\u4F1A\u8BDD ID",
  "toast.workspaceAdded": "\u5DF2\u6DFB\u52A0\u5DE5\u4F5C\u533A",
  "toast.workspaceRenamed": "\u5DF2\u91CD\u547D\u540D\u5DE5\u4F5C\u533A",
  "toast.workspaceDeleted": "\u5DF2\u5220\u9664\u5DE5\u4F5C\u533A",
  "toast.stoppedArchived": "\u5DF2\u505C\u6B62\u5E76\u5F52\u6863",
  "empty.none": "\u8FD8\u6CA1\u6709\u4F1A\u8BDD",
  "empty.noneHint": "\u4ECE\u4E0A\u65B9\u201C\u65B0\u4F1A\u8BDD\u201D\u5F00\u59CB\uFF0C\u6216\u6DFB\u52A0\u4E00\u4E2A\u5DE5\u4F5C\u533A\u3002",
  "focus.title": "\u4E13\u6CE8\u6A21\u5F0F",
  "focus.desc": "\u628A\u82E5\u5E72\u5DE5\u4F5C\u533A\u7EC4\u6210\u4E13\u6CE8\u7EC4\uFF1B\u8FDB\u5165\u540E\u5DE6\u4FA7\u4F1A\u8BDD\u680F\u53EA\u663E\u793A\u7EC4\u5185\u5DE5\u4F5C\u533A\u7684\u4F1A\u8BDD\u3002",
  "focus.current": "\u5F53\u524D\u4E13\u6CE8\uFF1A{name}",
  "focus.exit": "\u9000\u51FA\u4E13\u6CE8",
  "focus.manage": "\u7BA1\u7406\u4E13\u6CE8\u7EC4",
  "focus.memberCount": "{n} \u4E2A\u5DE5\u4F5C\u533A",
  "focus.staleCount": "{n} \u4E2A\u5DF2\u5931\u6548",
  "focus.editMembers": "\u6210\u5458\u5DE5\u4F5C\u533A",
  "focus.rename.title": "\u91CD\u547D\u540D\u4E13\u6CE8\u7EC4",
  "focus.members.title": "\u7F16\u8F91\u6210\u5458\u5DE5\u4F5C\u533A",
  "focus.delete.title": "\u5220\u9664\u4E13\u6CE8\u7EC4",
  "focus.delete.body": "\u5220\u9664\u4E13\u6CE8\u7EC4\u201C{name}\u201D\uFF1F\u53EA\u4F1A\u79FB\u9664\u8FD9\u4E2A\u5206\u7EC4\uFF0C\u4E0D\u5F71\u54CD\u5DE5\u4F5C\u533A\u548C\u4F1A\u8BDD\u3002",
  "focus.empty": "\u8FD8\u6CA1\u6709\u4E13\u6CE8\u7EC4\uFF0C\u5148\u521B\u5EFA\u4E00\u7EC4\u5DE5\u4F5C\u533A\u3002",
  "focus.create": "\u65B0\u5EFA\u4E13\u6CE8\u7EC4",
  "focus.namePlaceholder": "\u4E13\u6CE8\u7EC4\u540D\u79F0\uFF08\u53EF\u9009\uFF09",
  "focus.createAction": "\u521B\u5EFA\u4E13\u6CE8\u7EC4",
  "focus.untitled": "\u672A\u547D\u540D\u4E13\u6CE8\u7EC4",
  "focus.defaultName": "\u4E13\u6CE8\u7EC4 {n}",
  "focus.noWorkspaces": "\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\u53EF\u9009\u3002",
  "focus.emptySide": "\u4E13\u6CE8\u7EC4\u5185\u8FD8\u6CA1\u6709\u4F1A\u8BDD",
  "focus.emptySideHint": "\u5207\u6362\u6210\u5458\u5DE5\u4F5C\u533A\uFF0C\u6216\u9000\u51FA\u4E13\u6CE8\u6A21\u5F0F\u67E5\u770B\u5168\u90E8\u4F1A\u8BDD\u3002",
  "focus.expand": "\u5C55\u5F00\u4E13\u6CE8\u7EC4",
  "focus.collapse": "\u6536\u8D77\u4E13\u6CE8\u7EC4",
  "focus.allSessions": "\u5F53\u524D\u663E\u793A\u5168\u90E8\u4F1A\u8BDD",
  "focus.listTitle": "\u4E13\u6CE8\u7EC4\uFF08{n}\uFF09",
  "focus.new": "\u65B0\u5EFA\u4E13\u6CE8\u7EC4",
  "focus.enter": "\u8FDB\u5165",
  "focus.activeBadge": "\u4F7F\u7528\u4E2D",
  "focus.moreMembers": "\u8FD8\u6709 {n} \u4E2A",
  "focus.membersEmpty": "\u672A\u9009\u62E9\u5DE5\u4F5C\u533A",
  "focus.selectAll": "\u5168\u9009",
  "focus.clearAll": "\u6E05\u7A7A",
  "focus.done": "\u5B8C\u6210",
  "focus.switch": "\u5207\u6362",
  "focus.selectedCount": "\u5DF2\u9009 {n} \u4E2A\u5DE5\u4F5C\u533A",
  "focus.groups": "\u4E13\u6CE8\u7EC4"
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
  "filter.group": "Group by",
  "filter.filterSessions": "Click a workspace name to filter sessions",
  "filter.applyWorkspace": "Filter the session view by this workspace",
  "counts.all": "All",
  "counts.summary": "{n} sessions",
  "counts.workspaces": "{n} workspaces",
  "counts.groups": "{n} groups",
  "status.running": "Running",
  "status.pending": "Needs input",
  "status.done": "Done",
  "status.idle": "Idle",
  "pending.approval": "Awaiting approval",
  "pending.planReview": "Awaiting plan review",
  "pending.question": "Awaiting answer",
  "pending.generic": "Awaiting input",
  "row.child": "Sub-session",
  "row.newSession": "New session",
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
  "tab.workspaces": "Workspace filter",
  "tab.sessionGroups": "Session groups",
  "tab.workspaceGroups": "Workspace groups",
  "groups.title": "Session groups",
  "groups.workspaceTitle": "Workspace group management",
  "groups.workspaceHint": "Organise workspaces into groups and sub-groups; the sidebar workspace-group view follows this hierarchy.",
  "groups.hint": "Assign sessions to multi-level groups; use the dropdown on each row to change its group.",
  "groups.manage": "Manage groups",
  "groups.search": "Filter sessions or groups",
  "groups.assign": "Group",
  "groups.empty": "No sessions",
  "workspaceFilter.title": "Filter by workspace",
  "workspaceFilter.hint": "Click a workspace name to show only its sessions here. The switch controls whether it appears in the sidebar.",
  "workspaceFilter.allHint": "Clear the workspace filter and show every session",
  "tab.settings": "Settings",
  "section.pinned": "Pinned",
  "section.running": "Running",
  "section.pending": "Needs input",
  "section.done": "Unread completions",
  "section.idle": "Other sessions",
  "section.all": "All sessions",
  "section.empty": "No sessions",
  "manage.start": "Batch manage",
  "manage.done": "Done",
  "manage.byWorkspace": "By workspace",
  "manage.byStatus": "By status",
  "select.all": "Select all",
  "select.clear": "Clear selection",
  "select.group": "Select group",
  "select.count": "{n} selected",
  "action.pin": "Pin",
  "action.unpin": "Unpin",
  "action.archive": "Archive",
  "action.trash": "Move to trash",
  "action.restore": "Restore",
  "action.expandAll": "Expand all",
  "action.check": "Check & optimize",
  "action.collapseAll": "Collapse all",
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
  "toast.archived": "Archived {n} session(s)",
  "toast.trashed": "Moved {n} session(s) to trash",
  "toast.restored": "Restored {n} session(s)",
  "toast.purged": "Permanently deleted {n} session(s)",
  "toast.failed": "Action failed: {message}",
  "toast.stale": "Removed {n} stale session(s)",
  "toast.checked": "Session list re-checked",
  "batch.forcePurge": "Force delete",
  "confirm.forcePurge.title": "Force permanent delete",
  "confirm.forcePurge.body": "Skips the in-use check and deletes the logs and local files of {n} session(s). This cannot be undone.",
  "confirm.forcePurge.warning": "Running sessions are still rejected. If files are locked, restart DSH and retry.",
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
  "loading": "Loading\u2026",
  "side.title": "Sessions",
  "side.manage": "Manage sessions",
  "settings.nav": "Session view",
  "side.new": "New session",
  "side.addWorkspace": "Add workspace",
  "side.search": "Search sessions",
  "side.native": "Native workspace",
  "side.sessionView": "Session view",
  "side.switch.native": "Switch to native workspace",
  "side.switch.session": "Switch to session view",
  "side.settings": "Settings",
  "side.active": "Active sessions",
  "side.recent": "Recent sessions",
  "side.workspaces": "Workspace sessions",
  "side.workspaceFilter": "Workspace filter",
  "side.workspaceActive": "Has active sessions",
  "side.archived": "Archived",
  "side.ungrouped": "Ungrouped",
  "side.more": "Show more",
  "side.less": "Show less",
  "side.menu": "More actions",
  "side.searchResults": "Search results",
  "side.searching": "Searching\u2026",
  "side.noContent": "No content matches",
  "side.clear": "Clear",
  "side.closeSearch": "Close search",
  "side.dropHere": "Drop here",
  "side.pinHint": "Pinned sessions stay at the top",
  "settings.title": "Settings",
  "settings.mode": "Left workspace",
  "settings.mode.session": "Session view",
  "settings.mode.native": "Native workspace",
  "settings.activeLimit": "Active sessions shown",
  "settings.recentLimit": "Recent sessions shown",
  "settings.workspaceLimit": "Sessions per workspace",
  "settings.showIdle": "Show idle sessions",
  "settings.showSubagents": "Show subagent sessions",
  "settings.showRecent": "Show recent sessions group",
  "settings.showPinned": "Show pinned sessions group",
  "settings.showActive": "Show active sessions group",
  "settings.showWorkspaces": "Show workspace sessions group",
  "settings.showTimes": "Show update times",
  "settings.compact": "Compact rows",
  "settings.group.glow": "Glow border",
  "settings.glow.hint": "Configure running, waiting and completed-unread rows separately. The preview is the exact effect; row height is unchanged.",
  "settings.glow.running": "Running session",
  "settings.glow.pending": "Waiting session",
  "settings.glow.done": "Completed unread",
  "settings.glow.sample": "Example session",
  "settings.glow.now": "now",
  "settings.glow.style": "Border effect",
  "settings.glow": "Active/waiting border",
  "settings.desc.glow": "Animated border for running and waiting session rows; layout is unchanged.",
  "settings.glow.off": "Off",
  "settings.glow.marquee": "Marquee",
  "settings.glow.aurora": "Aurora",
  "settings.glow.pulse": "Pulse",
  "settings.glow.rainbow": "Rainbow",
  "settings.glow.comet": "Comet",
  "settings.glow.scan": "Scan line",
  "settings.glow.dash": "Dashed chase",
  "settings.shortcuts": "Shortcuts: Ctrl+K search, Ctrl+Alt+N new, F2 rename, Ctrl+Alt+F fork, Ctrl+Alt+A archive",
  "settings.sort": "Session order",
  "settings.sort.updated": "Last updated",
  "settings.sort.manual": "Manual",
  "settings.archived": "Archived sessions",
  "settings.archived.hide": "Hide",
  "settings.archived.show": "Show below the list",
  "settings.archived.only": "Only archived",
  "settings.nest": "Nest workspace tree",
  "settings.workspaceGroupMode": "Workspace grouping",
  "settings.desc.workspaceGroupMode": 'Default lists workspaces in registry order; Nested builds a path tree; Workspace groups show group \u2192 subgroup \u2192 workspace \u2192 sessions, with unassigned workspaces under "Ungrouped". Manage session groups on the "Session groups" tab.',
  "group.mode.default": "Default order",
  "group.mode.nested": "Workspace nesting",
  "group.mode.session": "Session groups",
  "group.mode.workspace": "Workspace groups",
  "group.mode.title": "Workspace display mode",
  "group.ungrouped": "Ungrouped",
  "group.manage": "Manage groups",
  "group.searchAll": "Filter groups or members",
  "group.manage.session": "Session groups",
  "group.manage.workspace": "Workspace groups",
  "group.manage.session.title": "Manage session groups",
  "group.manage.session.hint": 'Use the "Session groups" tab to assign sessions to multi-level groups. Each session belongs to at most one group; unassigned sessions go to "Ungrouped".',
  "group.manage.title": "Workspace groups",
  "group.manage.hint": 'Custom groups only change the order of the "Workspace sessions" section; workspaces and sessions themselves are unaffected. Multi-level groups are supported and each workspace belongs to one group.',
  "group.count": "{n} groups",
  "group.new": "New group",
  "group.create": "Create",
  "group.namePlaceholder": "Group name",
  "group.parent": "Parent group",
  "group.parentNone": "None (top level)",
  "group.defaultName": "Group {n}",
  "group.memberCount": "{n} workspaces",
  "group.empty": "No workspaces",
  "group.members": "Member workspaces",
  "group.members.sessions": "Member sessions",
  "group.sessionFilter": "Filter sessions\u2026",
  "group.noSessions": "No sessions available.",
  "group.addChild": "Add child group",
  "group.emptyList": 'No groups yet \u2014 click "New group" to create one.',
  "group.delete.title": "Delete group",
  "group.delete.body": 'Delete "{name}"? Child groups move up one level and its workspaces return to Ungrouped.',
  "settings.reset": "Reset",
  "settings.limitAll": "All",
  "settings.hint": "Settings are stored in this browser and do not change DSH config.",
  "settings.group.display": "Display",
  "settings.group.sections": "Groups",
  "settings.group.workspaceFilter": "Workspace filter",
  "settings.workspaceFilterHint": "Uncheck to hide a workspace from the left session view only; session management is unaffected. New workspaces are visible by default.",
  "settings.workspaceShow": "Show in sidebar",
  "settings.workspaceFilterEmpty": "No workspaces yet.",
  "settings.workspaceFilterReset": "Show all",
  "settings.group.limits": "Counts and order",
  "settings.group.behavior": "List behavior",
  "settings.desc.mode": "Use the session view in the left workspace area, or restore the native DSH workspace.",
  "settings.desc.subagents": "Show subagent rows beneath their parent session.",
  "settings.desc.idle": "When off, only running, pending, and unread-complete sessions are shown.",
  "settings.desc.sections": "Choose which shortcut groups appear in the sidebar; pinned and active sessions stay in workspace groups.",
  "settings.desc.workspaces": "Show every workspace heading, including workspaces without sessions.",
  "settings.desc.limits": "0 means unlimited; each workspace expands automatically for active sessions.",
  "settings.desc.sort": "Manual order only changes how sessions and workspaces are displayed.",
  "settings.desc.nest": "Nest child workspaces by their filesystem path.",
  "settings.focusEnabled": "Focus mode",
  "settings.desc.focusEnabled": "Hides the focus section, the focus bar and every focus entry when off; existing groups are kept.",
  "settings.desc.archived": "Control whether archived sessions appear in the list and the panel.",
  "settings.desc.times": "Show the relative update time at the end of each session row.",
  "settings.desc.compact": "Reduce row height for small screens or long session lists.",
  "settings.resetHint": "Only display settings are reset; session data is untouched.",
  "dialog.renameSession.title": "Rename session",
  "dialog.renameSession.label": "Session title",
  "dialog.renameWorkspace.title": "Rename workspace",
  "dialog.addWorkspace.title": "Add workspace",
  "dialog.addWorkspace.path": "Directory path",
  "dialog.addWorkspace.browse": "Browse\u2026",
  "dialog.addWorkspace.hint": "Enter an absolute path, or browse for a directory.",
  "dialog.deleteWorkspace.title": "Delete workspace",
  "dialog.deleteWorkspace.body": "Remove \u201C{name}\u201D from the list? Sessions are kept.",
  "dialog.archiveRunning.title": "Archive a running session",
  "dialog.archiveRunning.body": "\u201C{title}\u201D is still running. Stop it and archive?",
  "dialog.save": "Save",
  "dialog.delete": "Delete",
  "dialog.confirm": "Confirm",
  "dialog.cancel": "Cancel",
  "dialog.browseFailed": "Cannot open the directory picker: {message}",
  "action.rename": "Rename",
  "action.fork": "Fork",
  "action.moveToGroup": "Move to group",
  "action.removeFromGroup": "Remove from group",
  "action.moveToRoot": "Move to root",
  "groups.emptyGroups": "No groups",
  "action.copyId": "Copy session ID",
  "action.menu": "More actions",
  "action.renameWorkspace": "Rename workspace",
  "action.deleteWorkspace": "Delete workspace",
  "action.newSession": "New session",
  "toast.renamed": "Renamed",
  "toast.forked": "Fork created",
  "toast.copied": "Session ID copied",
  "toast.workspaceAdded": "Workspace added",
  "toast.workspaceRenamed": "Workspace renamed",
  "toast.workspaceDeleted": "Workspace deleted",
  "toast.stoppedArchived": "Stopped and archived",
  "empty.none": "No sessions yet",
  "empty.noneHint": "Start with \u201CNew session\u201D above, or add a workspace.",
  "focus.title": "Focus mode",
  "focus.desc": "Group a few workspaces and narrow the sidebar session list to that group while it is active.",
  "focus.current": "Focused: {name}",
  "focus.exit": "Exit focus",
  "focus.manage": "Manage focus groups",
  "focus.memberCount": "{n} workspaces",
  "focus.staleCount": "{n} missing",
  "focus.editMembers": "Member workspaces",
  "focus.rename.title": "Rename focus group",
  "focus.members.title": "Edit member workspaces",
  "focus.delete.title": "Delete focus group",
  "focus.delete.body": "Delete the focus group \u201C{name}\u201D? Only the group is removed; workspaces and sessions stay.",
  "focus.empty": "No focus groups yet. Create one from a set of workspaces.",
  "focus.create": "New focus group",
  "focus.namePlaceholder": "Focus group name (optional)",
  "focus.createAction": "Create focus group",
  "focus.untitled": "Untitled focus group",
  "focus.defaultName": "Focus group {n}",
  "focus.noWorkspaces": "No workspaces available yet.",
  "focus.emptySide": "No sessions in this focus group",
  "focus.emptySideHint": "Change its workspaces, or exit focus mode to see every session.",
  "focus.expand": "Expand focus group",
  "focus.collapse": "Collapse focus group",
  "focus.allSessions": "Showing all sessions",
  "focus.listTitle": "Focus groups ({n})",
  "focus.new": "New group",
  "focus.enter": "Enter",
  "focus.activeBadge": "Active",
  "focus.moreMembers": "{n} more",
  "focus.membersEmpty": "No workspaces selected",
  "focus.selectAll": "Select all",
  "focus.clearAll": "Clear",
  "focus.done": "Done",
  "focus.switch": "Switch",
  "focus.selectedCount": "{n} selected",
  "focus.groups": "Focus groups"
};

// src/client/index.jsx
var PANEL_ID = "dsh-session-view";
var NS = PANEL_ID;
var inject = ["slots", "locale", "uiWorkspace", "layout", "sessions", "workspaces"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-session-view: dictionaries");
  const t = ctx.locale.bind(NS);
  const ui = ctx.uiWorkspace;
  const renameSession = async (sessionId, title) => {
    const result = await ctx.sessions.using(
      sessionId,
      { source: "workspaceOperation" },
      (reference) => reference.binding.session.rename(title)
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
    insertWorkspaceBefore: (workspaceId, beforeWorkspaceId) => ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId)
  };
  const paneActions = {
    openSession: (target) => ui.openSession(target),
    openWorkspace: (workspaceId, options) => ui.openWorkspace(workspaceId, options),
    pinSession: (sessionId) => ui.pinSession(sessionId),
    unpinSession: (sessionId) => ui.unpinSession(sessionId),
    archiveSession: (sessionId, options) => ui.archiveSession(sessionId, options),
    unarchiveSession: (sessionId) => ui.unarchiveSession(sessionId),
    startSession: (workspaceId, options) => {
      ctx.layout.selectPanel(null);
      return ui.startSession(workspaceId, options);
    },
    forkSession: (sessionId, onCreated, options) => ui.forkSession(sessionId, onCreated, options),
    pickDirectory: () => ui.pickDirectory(),
    renameSession,
    searchSessions,
    ...workspaceActions
  };
  ctx.slots.inject(
    "main",
    () => ctx.slots.register(
      {
        name: "main",
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
          openSession: paneActions.openSession,
          pinSession: paneActions.pinSession,
          unpinSession: paneActions.unpinSession,
          archiveSession: paneActions.archiveSession,
          unarchiveSession: paneActions.unarchiveSession
        })
      },
      SessionView
    )
  );
  ctx.slots.inject(
    "sidebar.footer.action",
    () => ctx.slots.register(
      {
        name: "sidebar.footer.action",
        id: `${PANEL_ID}-mode`,
        locale: NS,
        order: 10,
        inject: () => ({
          ...paneActions,
          openPanel: () => ctx.layout.selectPanel(PANEL_ID)
        })
      },
      SidebarHost
    )
  );
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: PANEL_ID,
        order: 60,
        locale: NS,
        label: () => t("settings.nav")
      },
      SessionViewSettings
    )
  );
}

    return module.exports;
  }
});
