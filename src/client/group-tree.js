/** Pure tree helpers for workspace/session groups (no React). */

export const GROUP_ROOT_ORDER = '__groupRoot';

export function createWorkspaceGroupId() {
  return `wsg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function groupDisplayName(t, group, index) {
  return group?.name?.trim() || t('group.defaultName', { n: index + 1 });
}

export function descendantIds(groups, id) {
  const out = new Set([id]);
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

export function groupOrderKey(parentId) {
  return parentId ? `__groups:${parentId}` : GROUP_ROOT_ORDER;
}

function idsOf(entries) {
  return entries.map((entry) => entry.id);
}

function ordered(entries, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return entries;
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const out = [];
  for (const id of ids) {
    const entry = byId.get(id);
    if (entry) { out.push(entry); byId.delete(id); }
  }
  for (const entry of entries) if (byId.has(entry.id)) out.push(entry);
  return out;
}

export function childrenOf(groups, parentId) {
  return groups.filter((group) => (group.parentId || null) === (parentId || null));
}

export function orderedChildren(groups, orders, parentId) {
  return ordered(childrenOf(groups, parentId), orders?.[groupOrderKey(parentId)]);
}

/** Move a group inside/before/after another; returns null for invalid drops. */
export function moveGroupInTree(groups, orders, dragId, targetId, edge) {
  if (!dragId || !targetId || dragId === targetId) return null;
  const drag = groups.find((group) => group.id === dragId);
  const target = groups.find((group) => group.id === targetId);
  if (!drag || !target) return null;
  const targetParent = target.parentId || null;
  if (targetParent && descendantIds(groups, dragId).has(targetParent)) return null;
  if (edge === 'inside' && descendantIds(groups, dragId).has(targetId)) return null;
  const nextParent = edge === 'inside' ? targetId : targetParent;
  const nextGroups = groups.map((group) => (group.id === dragId ? { ...group, parentId: nextParent } : group));
  const nextOrders = { ...(orders || {}) };
  for (const key of Object.keys(nextOrders)) {
    if (Array.isArray(nextOrders[key])) nextOrders[key] = nextOrders[key].filter((id) => id !== dragId);
  }
  const key = groupOrderKey(nextParent);
  const siblings = (nextOrders[key] ? [...nextOrders[key]] : idsOf(childrenOf(nextGroups, nextParent)))
    .filter((id) => id !== dragId);
  let index = siblings.length;
  if (edge !== 'inside') {
    const at = siblings.indexOf(targetId);
    if (at >= 0) index = at + (edge === 'after' ? 1 : 0);
  }
  siblings.splice(index, 0, dragId);
  nextOrders[key] = siblings;
  return { groups: nextGroups, orders: nextOrders };
}

export function moveWorkspaceToGroup(assignments, orders, workspaceId, groupId, beforeId = null, after = false) {
  const nextAssignments = { ...(assignments || {}) };
  if (groupId) nextAssignments[workspaceId] = groupId;
  else delete nextAssignments[workspaceId];
  const key = groupId || '__root';
  const nextOrders = { ...(orders || {}) };
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

export function buildGroupTree(groups, orders, assignments, workspaces) {
  const items = workspaces?.items ?? [];
  const byGroup = new Map();
  const ungrouped = [];
  for (const workspace of items) {
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
    empty: !groupHasContent(group.id),
  }));
  return { nodes: nodes(null, 0), ungrouped: ordered(ungrouped, orders?.__root) };
}


/** Build the parent→children map used by the cascading "move to group" menu. */
export function buildCascadeTree(groups = [], excludeIds = []) {
  const blocked = new Set(excludeIds);
  const map = new Map();
  const ids = new Set(groups.map((group) => group.id));
  for (const group of groups) {
    if (blocked.has(group.id)) continue;
    const parentId = group.parentId && ids.has(group.parentId) && !blocked.has(group.parentId) ? group.parentId : null;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(group);
  }
  return map;
}
