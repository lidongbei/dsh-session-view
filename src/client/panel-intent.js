/**
 * One-shot intents handed from the sidebar to the main session-management page.
 *
 * The sidebar can only request that the page opens; it never takes over page
 * state. Consumers read the pending intent once and clear it, so a later
 * remount does not re-trigger the same action.
 */
let pending = null;
const listeners = new Set();

export function requestPanelIntent(intent) {
  pending = intent;
  for (const listener of listeners) listener();
}

export function consumePanelIntent() {
  const current = pending;
  pending = null;
  return current;
}

export function getPanelIntent() {
  return pending;
}

export function subscribePanelIntent(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
