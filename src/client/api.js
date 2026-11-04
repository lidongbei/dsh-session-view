/**
 * Thin client for the host half's trash routes.
 *
 * The routes live on the DSH webServer and share the page origin, so the
 * browser's session cookie is sent automatically.
 */
async function request(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
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

/** List trashed session records. */
export function fetchTrash() {
  return request('/session-view/trash');
}

/** Move sessions into the trash index (also archives them host-side). */
export function addToTrash(items) {
  return request('/session-view/trash/add', { method: 'POST', body: { items } });
}

/** Restore sessions from the trash index and unarchive them. */
export function restoreTrash(sessionIds) {
  return request('/session-view/trash/restore', { method: 'POST', body: { sessionIds } });
}

/** Physically delete sessions from disk, then refresh the workspace index. */
export function purgeTrash(sessionIds) {
  return request('/session-view/trash/purge', { method: 'POST', body: { sessionIds } });
}
