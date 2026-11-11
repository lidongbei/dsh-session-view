/**
 * Component-scoped CSS, rendered as a plain `<style>` element by the page.
 * Every color comes from the Host theme so the panel follows light/dark.
 */
export const STYLES = `
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
  font-size: 15px;
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
.dsv-toolbarActions { display: flex; align-items: center; gap: 8px; margin-left: auto; flex: none; }
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
  font-size: 12px;
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
  font-size: 15px;
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
  font-size: 9px;
  line-height: 14px;
}
.dsv-sideRunning { flex: none; margin-right: 4px; color: var(--dsw-alias-state-business-primary); font-size: 10px; font-variant-numeric: tabular-nums; }
.dsv-sideTime { flex: none; margin-left: 6px; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 16px; font-variant-numeric: tabular-nums; }
.dsv-sideWaiting { flex: none; margin-left: 6px; color: var(--dsw-alias-state-warn-primary); font-size: 10px; line-height: 16px; }
.dsv-side[data-compact="true"] .dsv-sideRow,
.dsv-side[data-compact="true"] .dsv-sideOpen { min-height: 26px; height: 26px; }
.dsv-side[data-compact="true"] .dsv-sideRowTitle { font-size: 13px; line-height: 18px; }
.dsv-side[data-compact="true"] .dsv-sideTag { display: none; }
.dsv-side[data-compact="true"] .dsv-sideTime { font-size: 9px; }
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
  font-size: 12px;
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
.dsv-contextMenu { position: fixed; z-index: 140; min-width: 176px; padding: 4px; }
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
  height: 34px;
  padding: 6px 8px;
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
.dsv-settingsTitle { margin: 0 0 6px; font-size: 16px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsv-settingsIntro { margin: 0; max-width: 560px; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }
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
.dsv-settingLabel { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary); }
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
.dsv-btnSm { height: 26px; padding: 0 8px; border-radius: 7px; font-size: 11px; }

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
  font-size: 12px;
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
.dsv-focusListTitle { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
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
  font-size: 12px;
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
.dsv-focusDialogName { margin: 0 0 6px; color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600; }
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
.dsv-workspaceFilterName { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsv-workspaceFilterPath {
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10.5px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-workspaceFilterEmpty { margin: 0; padding: 14px 16px; border-top: 1px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.dsv-workspaceFilterFoot { display: flex; justify-content: flex-end; padding: 10px 16px; border-top: 1px solid var(--dsw-alias-border-l3); }
/* Workspace visibility menu opened from the "工作区会话" header / workspace context menu. */
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
.dsv-wsFilterEmpty { margin: 0; padding: 8px; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dsv-wsFilterReset {
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
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
.dsv-groupCreate { display:flex; flex-direction:column; gap:8px; margin-bottom:10px; padding:10px; border:1px solid var(--dsw-alias-border-l4); border-radius:10px; }
.dsv-groupParentField { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--dsw-alias-label-secondary); }
.dsv-groupParentField .dsv-select { flex:1; min-width:0; }
.dsv-groupCreateFoot { display:flex; justify-content:flex-end; }
.dsv-groupList { display:flex; flex-direction:column; gap:8px; max-height:420px; overflow:auto; padding-right:2px; }
.dsv-groupCard { padding:8px 10px; border:1px solid var(--dsw-alias-border-l3); border-radius:10px; }
.dsv-groupCardHead { display:flex; align-items:center; gap:6px; }
.dsv-groupCardName { display:inline-flex; align-items:center; gap:4px; min-width:0; font-size:12px; font-weight:600; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsv-groupDepth { width:10px; color:var(--dsw-alias-label-tertiary); }
.dsv-groupMeta { flex:none; margin-left:auto; font-size:10px; color:var(--dsw-alias-label-tertiary); }
.dsv-groupChips { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
.dsv-groupCardActions { display:flex; gap:2px; margin-top:8px; }
.dsv-groupMembers { display:flex; flex-direction:column; gap:4px; max-height:180px; overflow:auto; margin-top:8px; padding-top:6px; border-top:1px solid var(--dsw-alias-border-l4); }
.dsv-groupMemberFilter { margin-bottom:2px; }
.dsv-groupMemberMeta { display:block; color:var(--dsw-alias-label-tertiary); font-size:11px; font-style:normal; }


.dsv-groupsPage { display:flex; flex-direction:column; gap:12px; padding:8px 0 32px; max-width:980px; }
.dsv-groupsHead { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.dsv-groupsTitle { margin:0 0 4px; font-size:18px; font-weight:600; color:var(--dsw-alias-label-primary); }
.dsv-groupsHint { margin:0; font-size:12px; line-height:18px; color:var(--dsw-alias-label-tertiary); }
.dsv-groupsSearch { width:100%; }
.dsv-groupsList { display:flex; flex-direction:column; gap:8px; }
.dsv-groupBlock { border:1px solid var(--dsw-alias-border-l3); border-radius:12px; background:var(--dsw-alias-bg-base); overflow:hidden; }
.dsv-groupBlockHead { display:flex; align-items:center; gap:8px; width:100%; min-height:42px; padding:0 10px; border:0; background:none; color:var(--dsw-alias-label-primary); font:inherit; cursor:pointer; text-align:left; }
.dsv-groupBlockHead:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsv-groupBlockName { flex:1; min-width:0; font-size:14px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsv-groupBlockCount { color:var(--dsw-alias-label-tertiary); font-size:12px; }
.dsv-groupEmpty { margin:0; padding:8px 14px 12px; color:var(--dsw-alias-label-tertiary); font-size:12px; }
.dsv-groupRootRows { display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l3); border-radius:12px; overflow:hidden; }
.dsv-groupRootRows .dsv-groupSession:first-child { border-top:0; }
.dsv-groupRootEmpty { min-height:30px; border-style:dashed; }
.dsv-groupBlock.dsv-dropTarget, .dsv-groupRootRows.dsv-dropTarget { border-color: var(--dsw-alias-state-business-primary); }
.dsv-groupSession { display:flex; align-items:center; gap:10px; padding:5px 12px; border-top:1px solid var(--dsw-alias-border-l4); }
.dsv-groupSession:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsv-groupSessionOpen { display:flex; align-items:baseline; gap:8px; flex:1; min-width:0; padding:2px 0; border:0; background:none; color:var(--dsw-alias-label-primary); font:inherit; text-align:left; cursor:pointer; }
.dsv-groupSessionTitle { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
.dsv-groupSessionMeta { color:var(--dsw-alias-label-tertiary); font-size:11px; white-space:nowrap; }
.dsv-groupSessionSelect { width:170px; height:28px; font-size:12px; }
.dsv-groupSearch { margin:0 0 4px; }
.dsv-dialogWide .dsv-groupList { max-height:52vh; overflow:auto; padding-right:2px; }

`;

export const BOARD_ONLY_STYLES = '';
