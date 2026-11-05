import { fetchTrash } from './api.js';

// Shared trash membership across the sidebar and the management panel. The
// sidebar used to fetch trash only on mount/focus, so trashing from the panel
// left the row visible until the window regained focus.
let ids = new Set();
let items = [];
const listeners = new Set();
let inflight;

function emit() {
  listeners.forEach((listener) => listener());
}

function sameIds(next) {
  if (next.size !== ids.size) return false;
  for (const id of next) if (!ids.has(id)) return false;
  return true;
}

export function subscribeTrash(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTrashIds() {
  return ids;
}

export function setTrashItems(nextItems) {
  items = Array.isArray(nextItems) ? nextItems : [];
  const next = new Set(items.map((item) => item.sessionId).filter(Boolean));
  if (sameIds(next)) return;
  ids = next;
  emit();
}

export function addTrashIds(list) {
  const add = list.filter(Boolean).filter((id) => !ids.has(id));
  if (add.length === 0) return;
  ids = new Set([...ids, ...add]);
  emit();
}

export function removeTrashIds(list) {
  const remove = list.filter(Boolean).filter((id) => ids.has(id));
  if (remove.length === 0) return;
  const next = new Set(ids);
  remove.forEach((id) => next.delete(id));
  ids = next;
  items = items.filter((item) => next.has(item.sessionId));
  emit();
}

export function refreshTrash() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const data = await fetchTrash();
      setTrashItems(data?.items);
      return data;
    } finally {
      inflight = undefined;
    }
  })();
  return inflight;
}
