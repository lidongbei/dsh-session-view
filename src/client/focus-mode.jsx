/**
 * Focus mode: a named group of workspaces that narrows the sidebar session
 * list. The group definitions live in prefs; this module only renders the
 * active-group strip and the manager dialog.
 */

import { useState } from 'react';
import { ConfirmDialog, Dialog } from './dialog.jsx';
import { TargetIcon } from './icons.jsx';
import { focusGroupById, workspaceLabel } from './logic.js';

export function createGroupId() {
  return `focus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function updateGroup(groups, id, patch) {
  return groups.map((group) => (group.id === id ? { ...group, ...patch } : group));
}

export function groupName(t, group, index) {
  return group.name || t('focus.defaultName', { n: index + 1 });
}

/** Compact strip shown while a focus group is active. */
export function FocusBar({ t, prefs, onManage, onExit }) {
  const group = focusGroupById(prefs);
  if (!group) return null;
  const index = (prefs.focusGroups ?? []).findIndex((entry) => entry.id === group.id);
  const label = groupName(t, group, Math.max(index, 0));
  return (
    <div className="dsv-focusBar">
      <span className="dsv-focusBarIcon">
        <TargetIcon size={12} />
      </span>
      <span className="dsv-focusBarName" title={label}>
        {label}
      </span>
      <span className="dsv-focusBarCount">{t('focus.memberCount', { n: group.workspaceIds.length })}</span>
      <button type="button" className="dsv-focusBarBtn" onClick={onManage}>
        {t('focus.manage')}
      </button>
      <button type="button" className="dsv-focusBarBtn" onClick={onExit}>
        {t('focus.exit')}
      </button>
    </div>
  );
}

/** Manager dialog: enter/exit groups, create, rename, edit members, delete. */
export function FocusDialog({ t, prefs, workspaces, onChange, onClose }) {
  const [newName, setNewName] = useState('');
  const [newIds, setNewIds] = useState([]);
  const [renamingId, setRenamingId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [editingId, setEditingId] = useState('');
  const [deleteId, setDeleteId] = useState('');

  const groups = prefs.focusGroups ?? [];
  const activeId = prefs.focusGroupId ?? '';
  const active = focusGroupById(prefs);
  const activeIndex = groups.findIndex((group) => group.id === activeId);
  const items = workspaces?.items ?? [];

  const toggleNew = (workspaceId) => {
    setNewIds((current) => (
      current.includes(workspaceId)
        ? current.filter((id) => id !== workspaceId)
        : [...current, workspaceId]
    ));
  };

  const toggleMember = (group, workspaceId) => {
    const workspaceIds = group.workspaceIds.includes(workspaceId)
      ? group.workspaceIds.filter((id) => id !== workspaceId)
      : [...group.workspaceIds, workspaceId];
    onChange({ focusGroups: updateGroup(groups, group.id, { workspaceIds }) });
  };

  const create = () => {
    if (newIds.length === 0) return;
    const id = createGroupId();
    const name = newName.trim() || t('focus.defaultName', { n: groups.length + 1 });
    onChange({ focusGroups: [...groups, { id, name, workspaceIds: [...newIds] }] });
    setNewName('');
    setNewIds([]);
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
      title={t('focus.title')}
      onClose={onClose}
      footer={
        <button type="button" className="dsv-btn" onClick={onClose}>
          {t('dialog.cancel')}
        </button>
      }
    >
      <p className="dsv-sideHint">{t('focus.desc')}</p>

      {active && (
        <div className="dsv-focusActive">
          <TargetIcon size={12} />
          <span className="dsv-focusActiveText">
            {t('focus.current', { name: groupName(t, active, Math.max(activeIndex, 0)) })}
          </span>
          <button type="button" className="dsv-btn" onClick={() => onChange({ focusGroupId: '' })}>
            {t('focus.exit')}
          </button>
        </div>
      )}

      <div className="dsv-focusList">
        {groups.map((group, index) => {
          const known = group.workspaceIds.filter((id) => items.some((workspace) => workspace.workspaceId === id));
          const stale = group.workspaceIds.length - known.length;
          const isActive = group.id === activeId;
          return (
            <div className="dsv-focusGroup" data-active={isActive} key={group.id}>
              <div className="dsv-focusGroupHead">
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
                    <button type="button" className="dsv-btn" data-tone="primary" onClick={commitRename}>
                      {t('dialog.save')}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="dsv-focusName"
                    aria-pressed={isActive}
                    onClick={() => onChange({ focusGroupId: isActive ? '' : group.id })}
                  >
                    <TargetIcon size={12} />
                    <span>{groupName(t, group, index)}</span>
                  </button>
                )}
                <span className="dsv-focusMeta">
                  {t('focus.memberCount', { n: known.length })}
                  {stale > 0 ? ` · ${t('focus.staleCount', { n: stale })}` : ''}
                </span>
                <span className="dsv-focusActions">
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
            </div>
          );
        })}
        {groups.length === 0 && <p className="dsv-sideEmpty">{t('focus.empty')}</p>}
      </div>

      <div className="dsv-focusCreate">
        <div className="dsv-focusCreateHead">{t('focus.create')}</div>
        <input
          className="dsv-input"
          placeholder={t('focus.namePlaceholder')}
          value={newName}
          maxLength={60}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') create();
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
        <button
          type="button"
          className="dsv-btn"
          data-tone="primary"
          disabled={newIds.length === 0}
          onClick={create}
        >
          {t('focus.createAction')}
        </button>
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
