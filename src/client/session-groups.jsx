/**
 * Custom session groups: a multi-level tree the user builds to arrange the
 * "工作区会话" section by session instead of by workspace. A session belongs to
 * at most one group; unassigned sessions fall into the 未分组 bucket.
 */

import { useState } from 'react';
import { flattenWorkspaceGroups } from './logic.js';
import { ConfirmDialog, Dialog } from './dialog.jsx';
import { groupDisplayName } from './workspace-groups.jsx';

export function createSessionGroupId() {
  return `ssg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function descendantIds(groups, id) {
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

export function SessionGroupsDialog({ t, prefs, sessions = [], onChange, onClose }) {
  const groups = prefs.sessionGroups ?? [];
  const flattened = flattenWorkspaceGroups(groups);
  const assignments = prefs.sessionAssignments ?? {};

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [renamingId, setRenamingId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [editingId, setEditingId] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const [filter, setFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');

  const setGroups = (next) => onChange({ sessionGroups: next });

  const create = () => {
    const name = newName.trim().slice(0, 60);
    if (!name) return;
    setGroups([...groups, { id: createSessionGroupId(), name, parentId: newParent || null }]);
    setNewName('');
    setNewParent('');
    setCreating(false);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const name = renameValue.trim().slice(0, 60);
    setGroups(groups.map((group) => (group.id === renamingId ? { ...group, name } : group)));
    setRenamingId('');
    setRenameValue('');
  };

  const remove = () => {
    const target = groups.find((group) => group.id === deleteId);
    if (!target) return;
    const removed = descendantIds(groups, target.id);
    const nextGroups = groups
      .filter((group) => !removed.has(group.id))
      .map((group) => (group.parentId && removed.has(group.parentId) ? { ...group, parentId: target.parentId ?? null } : group));
    const nextAssignments = {};
    for (const [sessionId, groupId] of Object.entries(assignments)) {
      if (!removed.has(groupId)) nextAssignments[sessionId] = groupId;
    }
    onChange({ sessionGroups: nextGroups, sessionAssignments: nextAssignments });
    if (editingId && removed.has(editingId)) setEditingId('');
    setDeleteId('');
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
  const visibleSessions = memberQuery
    ? sessions.filter((session) => `${session.title} ${session.workspace ?? ''}`.toLowerCase().includes(memberQuery))
    : sessions;
  const visibleFlattened = flattened.filter((group, index) => !query
    || groupDisplayName(t, group, index).toLowerCase().includes(query)
    || membersOf(group.id).some((session) => `${session.title} ${session.workspace ?? ''}`.toLowerCase().includes(query)));

  return (
    <Dialog
      wide
      title={t('group.manage.session.title')}
      onClose={onClose}
      footer={
        <button type="button" className="dsv-btn" data-tone="primary" onClick={onClose}>
          {t('focus.done')}
        </button>
      }
    >
      <p className="dsv-sideHint dsv-groupIntro">{t('group.manage.session.hint')}</p>

      <div className="dsv-groupToolbar">
        <span className="dsv-focusListTitle">{t('group.count', { n: groups.length })}</span>
        <button
          type="button"
          className="dsv-btn dsv-btnSm"
          data-tone={creating ? undefined : 'primary'}
          onClick={() => setCreating((value) => !value)}
        >
          {creating ? t('dialog.cancel') : t('group.new')}
        </button>
      </div>

      {creating && (
        <div className="dsv-groupCreate">
          <input
            autoFocus
            className="dsv-input"
            maxLength={60}
            placeholder={t('group.namePlaceholder')}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') create();
              if (event.key === 'Escape') setCreating(false);
            }}
          />
          <label className="dsv-groupParentField">
            <span>{t('group.parent')}</span>
            <select className="dsv-select" value={newParent} onChange={(event) => setNewParent(event.target.value)}>
              <option value="">{t('group.parentNone')}</option>
              {flattened.map((group, index) => (
                <option key={group.id} value={group.id}>
                  {`${'—'.repeat(group.depth)} ${groupDisplayName(t, group, index)}`.trim()}
                </option>
              ))}
            </select>
          </label>
          <div className="dsv-groupCreateFoot">
            <button type="button" className="dsv-btn dsv-btnSm" data-tone="primary" disabled={!newName.trim()} onClick={create}>
              {t('group.create')}
            </button>
          </div>
        </div>
      )}

      <input
        className="dsv-input dsv-groupSearch"
        placeholder={t('group.searchAll')}
        aria-label={t('group.searchAll')}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <div className="dsv-groupList">
        {visibleFlattened.map((group) => {
          const index = flattened.findIndex((entry) => entry.id === group.id);
          const members = membersOf(group.id);
          return (
            <article className="dsv-groupCard" key={group.id} style={{ marginLeft: group.depth * 16 }}>
              <div className="dsv-groupCardHead">
                {renamingId === group.id ? (
                  <span className="dsv-focusRename">
                    <input
                      autoFocus
                      className="dsv-input"
                      maxLength={60}
                      value={renameValue}
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
                  <span className="dsv-groupCardName">
                    <span className="dsv-groupDepth" aria-hidden="true">{group.depth > 0 ? '↳' : ''}</span>
                    {groupDisplayName(t, group, index)}
                  </span>
                )}
                <span className="dsv-groupMeta">{t('group.memberCount', { n: members.length })}</span>
              </div>
              <div className="dsv-groupChips">
                {members.slice(0, 4).map((session) => (
                  <span className="dsv-focusChip" key={session.id}>{session.title}</span>
                ))}
                {members.length > 4 && <span className="dsv-focusChip" data-more="true">+{members.length - 4}</span>}
                {members.length === 0 && <span className="dsv-focusChipEmpty">{t('group.empty')}</span>}
              </div>
              <div className="dsv-groupCardActions">
                <button type="button" className="dsv-sideTextBtn" onClick={() => { setEditingId(editingId === group.id ? '' : group.id); }}>
                  {t('group.members.sessions')}
                </button>
                <button type="button" className="dsv-sideTextBtn" onClick={() => { setCreating(true); setNewParent(group.id); }}>
                  {t('group.addChild')}
                </button>
                <button type="button" className="dsv-sideTextBtn" onClick={() => { setRenamingId(group.id); setRenameValue(group.name); }}>
                  {t('action.rename')}
                </button>
                <button type="button" className="dsv-sideTextBtn dsv-focusDanger" onClick={() => setDeleteId(group.id)}>
                  {t('dialog.delete')}
                </button>
              </div>
              {editingId === group.id && (
                <div className="dsv-groupMembers">
                  <input
                    className="dsv-input dsv-groupMemberFilter"
                    placeholder={t('group.sessionFilter')}
                    value={memberFilter}
                    onChange={(event) => setMemberFilter(event.target.value)}
                  />
                  {sessions.length === 0 ? (
                    <p className="dsv-sideHint">{t('group.noSessions')}</p>
                  ) : (
                    visibleSessions.map((session) => (
                      <label className="dsv-sideCheck" key={session.id}>
                        <input
                          type="checkbox"
                          checked={assignments[session.id] === group.id}
                          onChange={() => moveSession(group, session.id)}
                        />
                        <span>
                          {session.title}
                          {session.workspace ? <em className="dsv-groupMemberMeta">{session.workspace}</em> : null}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </article>
          );
        })}
        {visibleFlattened.length === 0 && <p className="dsv-sideEmpty">{t('group.emptyList')}</p>}
      </div>

      {deleting && (
        <ConfirmDialog
          t={t}
          title={t('group.delete.title')}
          body={t('group.delete.body', { name: groupDisplayName(t, deleting, flattened.findIndex((entry) => entry.id === deleting.id)) })}
          confirmKey="dialog.delete"
          onConfirm={remove}
          onClose={() => setDeleteId('')}
        />
      )}
    </Dialog>
  );
}
