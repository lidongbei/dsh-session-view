/**
 * Component-scoped CSS, rendered as a plain `<style>` element by the page.
 * Every color comes from the Host theme so the panel follows light/dark.
 */
export const STYLES = `
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
  color: var(--dsw-alias-label-secondary);
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
.dsv-sideGroupHead.dsv-sideSectionHead { height: 28px; margin-top: 4px; }
.dsv-sideSectionHead .dsv-sideGroupToggle { height: 28px; gap: 4px; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.dsv-sideSectionHead .dsv-sideGroupTitle { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
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
.dsv-sideChevron { display: none; flex: none; color: var(--dsw-alias-label-caption); transition: transform 0.15s ease; }
.dsv-sideChevron[data-collapsed="true"] { display: inline-flex; }
.dsv-sideGroupHead:hover .dsv-sideChevron,
.dsv-sideGroupHead:focus-within .dsv-sideChevron { display: inline-flex; }
.dsv-sideFolder { display: inline-flex; flex: none; color: var(--dsw-alias-label-tertiary); }
.dsv-sideGroupHead:hover .dsv-sideFolder,
.dsv-sideGroupHead:focus-within .dsv-sideFolder { display: none; }
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
.dsv-sideGroupActions { display: flex; flex: none; gap: 2px; opacity: 0; }
.dsv-sideGroupHead:hover .dsv-sideGroupActions,
.dsv-sideGroupHead:focus-within .dsv-sideGroupActions { opacity: 1; }
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
  font-size: 9px;
  line-height: 14px;
}
.dsv-sideRunning { flex: none; margin-right: 4px; color: var(--dsw-alias-state-business-primary); font-size: 10px; font-variant-numeric: tabular-nums; }
.dsv-sideTime { flex: none; margin-left: 6px; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 16px; font-variant-numeric: tabular-nums; }
.dsv-sideWaiting { flex: none; margin-left: 6px; color: var(--dsw-alias-state-warn-primary); font-size: 10px; line-height: 16px; }
.dsv-side[data-compact="true"] .dsv-sideRow,
.dsv-side[data-compact="true"] .dsv-sideOpen { min-height: 26px; height: 26px; }
.dsv-side[data-compact="true"] .dsv-sideRowTitle { font-size: 13px; line-height: 18px; }
.dsv-side[data-compact="true"] .dsv-sideTag,
.dsv-side[data-compact="true"] .dsv-sideTime { display: none; }
.dsv-sidePin { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 16px; height: 20px; margin-left: 6px; color: var(--dsw-alias-label-caption); }
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
.dsv-sideRowActions .dsv-sideIconBtn { width: 20px; height: 20px; }
.dsv-sideRow:hover .dsv-sideTime,
.dsv-sideRow:hover .dsv-sideWaiting,
.dsv-sideRow:hover .dsv-sidePin,
.dsv-sideRow:focus-within .dsv-sideTime,
.dsv-sideRow:focus-within .dsv-sideWaiting,
.dsv-sideRow:focus-within .dsv-sidePin { display: none; }
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
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.dsv-sideMore:hover { color: var(--dsw-alias-label-secondary); }
.dsv-sideEmpty,
.dsv-sideEmptyWorkspace {
  padding: 6px 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsv-sideEmpty { padding: 16px 12px; text-align: center; }
.dsv-sideHint { margin: 2px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 1.4; }
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
  font-size: 12px;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-sideField { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dsv-sideField input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 7px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  outline: none;
}
.dsv-sideField input:focus { border-color: var(--dsw-alias-state-business-primary); }
.dsv-sidePathRow { display: flex; gap: 6px; }
.dsv-sidePathRow input { flex: 1; min-width: 0; }
.dsv-sideCheck { display: flex; align-items: center; gap: 6px; min-height: 26px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
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
.dsv-contextMenu { position: fixed; z-index: 140; min-width: 184px; padding: 5px; }
.dsv-menu {
  min-width: 156px;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 9px;
  background: var(--dsw-alias-bg-base);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
}
.dsv-menu button {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
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
.dsv-settings { max-width: 560px; padding-top: 4px; }
.dsv-settingsPage { padding-bottom: 24px; }
.dsv-settingsReset { margin-top: 16px; }
.dsv-settingsTitle { margin: 8px 0 12px; font-size: 15px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsv-settingsGrid { display: grid; gap: 0; }
.dsv-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 42px;
  border-bottom: 1px solid var(--dsw-alias-border-l3);
}
.dsv-fieldLabel { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dsv-field .dsv-select,
.dsv-field .dsv-input { width: 200px; height: 32px; }
.dsv-field .dsv-number { width: 88px; text-align: right; }
.dsv-toggleRow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.dsv-hint { margin: 12px 0; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
`;

export const BOARD_ONLY_STYLES = '';

