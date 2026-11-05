/**
 * Focus mode: a named group of workspaces that narrows the sidebar session
 * list. The group definitions live in prefs; this module renders the
 * active-group strip and the manager dialog.
 */

import { useState } from 'react';
import { ConfirmDialog, Dialog } from './dialog.jsx';
import { TargetIcon } from './icons.jsx';
import { focusGroupById, workspaceLabel } from './logic.js';

const CHIP_LIMIT = 4;

export function createGroupId() {
  return `focus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function updateGroup(groups, id, patch) {
  return groups.map((group) => (group.id === id ? { ...group, ...patch } : group));
}

export function groupName(t, group, index) {
  return group.name || t('focus.defaultName', { n: index + 1 });
}

/** Resolve a group's display name from the current prefs list. */
export function groupLabel(t, prefs, group) {
  const groups = prefs?.focusGroups ?? [];
  const index = groups.findIndex((entry) => entry.id === group?.id);
  return groupName(t, group ?? {}, Math.max(index, 0));
}

/**
 * Split a group's members into the workspace labels worth showing and the
 * count of member ids that no longer resolve to a workspace.
 */
export function memberSummary(group, workspaces, max = CHIP_LIMIT) {
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

/** Compact strip shown while a focus group is active. */
export function FocusBar({ t, prefs, onManage, onExit }) {
  const group = focusGroupById(prefs);
  if (!group) return null;
  return (
    <div className="dsv-focusBar">
      <span className="dsv-focusBarIcon">
        <TargetIcon size={12} />
      </span>
      <button
        type="button"
        className="dsv-focusBarName"
        title={t('focus.manage')}
        onClick={onManage}
      >
        {groupLabel(t, prefs, group)}
      </button>
      <span className="dsv-focusBarCount">{t('focus.memberCount', { n: group.workspaceIds.length })}</span>
      <button type="button" className="dsv-focusBarBtn" onClick={onManage}>
        {t('focus.switch')}
      </button>
      <button type="button" className="dsv-focusBarBtn" onClick={onExit}>
        {t('focus.exit')}
      </button>
    </div>
  );
}

/** Manager dialog: switch, create, rename, edit members and delete groups. */
export function FocusDialog({ t, prefs, workspaces, onChange, onClose }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIds, setNewIds] = useState([]);
  const [renamingId, setRenamingId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [editingId, setEditingId] = useState('');
  const [deleteId, setDeleteId] = useState('');

  const groups = prefs.focusGroups ?? [];
  const activeId = prefs.focusGroupId ?? '';
  const active = focusGroupById(prefs);
  const items = workspaces?.items ?? [];

  const enter = (group) => {
    onChange({ focusGroupId: activeId === group.id ? '' : group.id });
  };

  const toggleNew = (workspaceId) => {
    setNewIds((current) => (
      current.includes(workspaceId)
        ? current.filter((id) => id !== workspaceId)
        : [...current, workspaceId]
    ));
  };

  const setMembers = (group, workspaceIds) => {
    onChange({ focusGroups: updateGroup(groups, group.id, { workspaceIds }) });
  };

  const toggleMember = (group, workspaceId) => {
    const workspaceIds = group.workspaceIds.includes(workspaceId)
      ? group.workspaceIds.filter((id) => id !== workspaceId)
      : [...group.workspaceIds, workspaceId];
    setMembers(group, workspaceIds);
  };

  const create = () => {
    if (newIds.length === 0) return;
    const id = createGroupId();
    const name = newName.trim() || t('focus.defaultName', { n: groups.length + 1 });
    onChange({ focusGroups: [...groups, { id, name, workspaceIds: [...newIds] }] });
    setNewName('');
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
    setRenamingId('');
    setRenameValue('');
  };

  const remove = () => {
    const index = groups.findIndex((group) => group.id === deleteId);
    if (index < 0) return;
    const rest = groups.filter((group) => group.id !== deleteId);
    onChange({
      focusGroups: rest,
      ...(activeId === deleteId ? { focusGroupId: '' } : {}),
    });
    if (editingId === deleteId) setEditingId('');
    setDeleteId('');
  };

  const deleting = groups.find((group) => group.id === deleteId);

  return (
    <Dialog
      wide
      title={t('focus.title')}
      onClose={onClose}
      footer={
        <button type="button" className="dsv-btn" data-tone="primary" onClick={onClose}>
          {t('focus.done')}
        </button>
      }
    >
      <div className="dsv-focusStatus" data-active={Boolean(active)}>
        <span className="dsv-focusStatusIcon">
          <TargetIcon size={12} />
        </span>
        <span className="dsv-focusStatusText">
          {active ? t('focus.current', { name: groupLabel(t, prefs, active) }) : t('focus.allSessions')}
        </span>
        {active && (
          <button type="button" className="dsv-btn dsv-btnSm" onClick={() => onChange({ focusGroupId: '' })}>
            {t('focus.exit')}
          </button>
        )}
      </div>

      <div className="dsv-focusListHead">
        <span className="dsv-focusListTitle">{t('focus.listTitle', { n: groups.length })}</span>
        <button
          type="button"
          className="dsv-btn dsv-btnSm"
          data-tone={creating ? undefined : 'primary'}
          onClick={() => setCreating((value) => !value)}
        >
          {creating ? t('dialog.cancel') : t('focus.new')}
        </button>
      </div>

      {creating && (
        <div className="dsv-focusCreate">
          <input
            autoFocus
            className="dsv-input"
            placeholder={t('focus.namePlaceholder')}
            value={newName}
            maxLength={60}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') create();
              if (event.key === 'Escape') setCreating(false);
            }}
          />
          <div className="dsv-focusMembers">
            {items.length === 0 ? (
              <p className="dsv-sideHint">{t('focus.noWorkspaces')}</p>
            ) : (
              items.map((workspace) => (
                <label className="dsv-sideCheck" key={workspace.workspaceId}>
                  <input
                    type="checkbox"
                    checked={newIds.includes(workspace.workspaceId)}
                    onChange={() => toggleNew(workspace.workspaceId)}
                  />
                  <span>{workspaceLabel(workspace)}</span>
                </label>
              ))
            )}
          </div>
          <div className="dsv-focusCreateFoot">
            <span className="dsv-sideHint">{t('focus.selectedCount', { n: newIds.length })}</span>
            <button
              type="button"
              className="dsv-btn dsv-btnSm"
              data-tone="primary"
              disabled={newIds.length === 0}
              onClick={create}
            >
              {t('focus.createAction')}
            </button>
          </div>
        </div>
      )}

      <div className="dsv-focusList">
        {groups.map((group, index) => {
          const summary = memberSummary(group, workspaces);
          const isActive = group.id === activeId;
          return (
            <article className="dsv-focusCard" data-active={isActive} key={group.id}>
              <div className="dsv-focusCardHead">
                {renamingId === group.id ? (
                  <span className="dsv-focusRename">
                    <input
                      autoFocus
                      className="dsv-input"
                      value={renameValue}
                      maxLength={60}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename();
                        if (event.key === 'Escape') setRenamingId('');
                      }}
                    />
                    <button type="button" className="dsv-btn dsv-btnSm" data-tone="primary" onClick={commitRename}>
                      {t('dialog.save')}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="dsv-focusCardName"
                    aria-pressed={isActive}
                    onClick={() => enter(group)}
                  >
                    <TargetIcon size={12} />
                    <span>{groupName(t, group, index)}</span>
                  </button>
                )}
                {isActive && <span className="dsv-focusBadge">{t('focus.activeBadge')}</span>}
                <span className="dsv-focusMeta">
                  {t('focus.memberCount', { n: summary.known + summary.stale })}
                </span>
              </div>

              <div className="dsv-focusChips">
                {summary.shown.map((label, chipIndex) => (
                  <span className="dsv-focusChip" key={`${group.id}-${chipIndex}`}>
                    {label}
                  </span>
                ))}
                {summary.extra > 0 && (
                  <span className="dsv-focusChip" data-more="true">
                    {t('focus.moreMembers', { n: summary.extra })}
                  </span>
                )}
                {summary.stale > 0 && (
                  <span className="dsv-focusChip" data-stale="true">
                    {t('focus.staleCount', { n: summary.stale })}
                  </span>
                )}
                {summary.known === 0 && summary.stale === 0 && (
                  <span className="dsv-focusChipEmpty">{t('focus.membersEmpty')}</span>
                )}
              </div>

              <div className="dsv-focusCardFoot">
                <button
                  type="button"
                  className="dsv-btn dsv-btnSm"
                  data-tone={isActive ? undefined : 'primary'}
                  onClick={() => enter(group)}
                >
                  {isActive ? t('focus.exit') : t('focus.enter')}
                </button>
                <span className="dsv-focusCardActions">
                  <button type="button" className="dsv-sideTextBtn" onClick={() => startRename(group)}>
                    {t('action.rename')}
                  </button>
                  <button
                    type="button"
                    className="dsv-sideTextBtn"
                    onClick={() => setEditingId(editingId === group.id ? '' : group.id)}
                  >
                    {t('focus.editMembers')}
                  </button>
                  <button
                    type="button"
                    className="dsv-sideTextBtn dsv-focusDanger"
                    onClick={() => setDeleteId(group.id)}
                  >
                    {t('dialog.delete')}
                  </button>
                </span>
              </div>

              {editingId === group.id && (
                <div className="dsv-focusMembers">
                  <div className="dsv-focusMembersHead">
                    <span>{t('focus.selectedCount', { n: group.workspaceIds.length })}</span>
                    <span className="dsv-focusMembersTools">
                      <button
                        type="button"
                        className="dsv-sideTextBtn"
                        onClick={() => setMembers(group, items.map((workspace) => workspace.workspaceId))}
                      >
                        {t('focus.selectAll')}
                      </button>
                      <button type="button" className="dsv-sideTextBtn" onClick={() => setMembers(group, [])}>
                        {t('focus.clearAll')}
                      </button>
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="dsv-sideHint">{t('focus.noWorkspaces')}</p>
                  ) : (
                    items.map((workspace) => (
                      <label className="dsv-sideCheck" key={workspace.workspaceId}>
                        <input
                          type="checkbox"
                          checked={group.workspaceIds.includes(workspace.workspaceId)}
                          onChange={() => toggleMember(group, workspace.workspaceId)}
                        />
                        <span>{workspaceLabel(workspace)}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </article>
          );
        })}
        {groups.length === 0 && <p className="dsv-sideEmpty">{t('focus.empty')}</p>}
      </div>

      {deleting && (
        <ConfirmDialog
          t={t}
          title={t('focus.delete.title')}
          body={t('focus.delete.body', { name: groupName(t, deleting, groups.indexOf(deleting)) })}
          confirmKey="dialog.delete"
          onConfirm={remove}
          onClose={() => setDeleteId('')}
        />
      )}
    </Dialog>
  );
}
