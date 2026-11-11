/**
 * Custom workspace groups, edited as a live tree.
 *
 * The tree mirrors what the sidebar renders in "工作区分组" mode: groups and
 * sub-groups contain the workspaces assigned to them, unassigned workspaces
 * stay at the root. Dragging a group onto the middle of another nests it;
 * dropping on the top/bottom edge reorders it as a sibling. Dropping a
 * workspace onto a group assigns it there; dropping it on the root area
 * removes its assignment.
 */

import { useEffect, useMemo, useState } from 'react';
import { workspaceLabel } from './logic.js';
import { ConfirmDialog, Dialog } from './dialog.jsx';
import { GroupCascade } from './group-cascade.jsx';
import {
  GROUP_ROOT_ORDER,
  createWorkspaceGroupId,
  groupDisplayName,
  descendantIds,
  groupOrderKey,
  childrenOf,
  orderedChildren,
  moveGroupInTree,
  moveWorkspaceToGroup,
  buildGroupTree,
} from './group-tree.js';

export {
  GROUP_ROOT_ORDER,
  createWorkspaceGroupId,
  groupDisplayName,
  descendantIds,
  groupOrderKey,
  childrenOf,
  orderedChildren,
  moveGroupInTree,
  moveWorkspaceToGroup,
  buildGroupTree,
} from './group-tree.js';

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
  onWorkspaceMenu,
}) {
  const group = node.group;
  const isCollapsed = collapsed.has(group.id);
  const drop = dropState?.id === group.id ? dropState.edge : null;
  return (
    <div className="dsv-treeNode">
      <div
        className={`dsv-treeRow dsv-treeGroup${drop ? ` dsv-treeDrop-${drop}` : ''}`}
        style={{ paddingLeft: 8 + node.depth * 16 }}
        draggable={!renaming}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', group.id);
          setDragState({ type: 'group', id: group.id });
        }}
        onDragEnd={() => { setDragState(null); setDropState(null); }}
        onClick={(event) => {
          if (event.target.closest('button, input, select, a, textarea, label')) return;
          onToggle(group.id);
        }}
        onDragOver={(event) => {
          if (dragState?.type === 'workspace') {
            event.preventDefault();
            setDropState({ id: group.id, edge: 'inside' });
            return;
          }
          if (dragState?.type !== 'group') return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientY - rect.top) / rect.height;
          const edge = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside';
          setDropState({ id: group.id, edge });
        }}
        onDragLeave={() => setDropState((current) => (current?.id === group.id ? null : current))}
        onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onMenu(group, event); }}
        onDrop={(event) => {
          event.preventDefault();
          if (dragState?.type === 'workspace') onAssignWorkspace(group.id);
          else onDropGroup(group.id);
          setDragState(null);
          setDropState(null);
        }}
      >
        <button
          type="button"
          className="dsv-treeChevron"
          aria-label={isCollapsed ? t('action.expand') : t('action.collapse')}
          aria-expanded={!isCollapsed}
          onClick={() => onToggle(group.id)}
        >
          <span data-collapsed={isCollapsed}>▾</span>
        </button>
        {renaming ? (
          <input
            className="dsv-input dsv-treeRename"
            value={renameValue}
            autoFocus
            maxLength={60}
            onChange={(event) => setRenameValue(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename();
              if (event.key === 'Escape') cancelRename();
            }}
          />
        ) : (
          <span className="dsv-treeName">{groupDisplayName(t, group, node.depth)}</span>
        )}
        <span className="dsv-treeMeta">{node.workspaces.length}</span>
        {!renaming && (
          <span className="dsv-treeActions">
            <button type="button" className="dsv-btn dsv-btnSm" onClick={() => onAddChild(group.id)}>{t('group.addChild')}</button>
            <button type="button" className="dsv-btn dsv-btnSm" onClick={() => onRename(group)}>{t('action.rename')}</button>
            <button type="button" className="dsv-btn dsv-btnSm" data-tone="danger" onClick={() => onDelete(group.id)}>{t('dialog.delete')}</button>
          </span>
        )}
      </div>
      {!isCollapsed && (
        <div className="dsv-treeChildren">
          {node.children.map((child) => (
            <TreeRow
              key={child.group.id}
              t={t}
              node={child}
              collapsed={collapsed}
              onToggle={onToggle}
              dragState={dragState}
              setDragState={setDragState}
              dropState={dropState}
              setDropState={setDropState}
              onDropGroup={onDropGroup}
              onAssignWorkspace={onAssignWorkspace}
              onDropWorkspace={onDropWorkspace}
              onRename={onRename}
              renaming={renaming?.id === child.group.id}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              commitRename={commitRename}
              cancelRename={cancelRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onMenu={onMenu}
              onWorkspaceMenu={onWorkspaceMenu}
            />
          ))}
          {node.workspaces.map((workspace) => (
            <div
              key={workspace.workspaceId}
              className={`dsv-treeRow dsv-treeWorkspace${dropState?.id === workspace.workspaceId ? ` dsv-treeDrop-${dropState.edge}` : ''}`}
              style={{ paddingLeft: 8 + (node.depth + 1) * 16 }}
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', workspace.workspaceId);
                setDragState({ type: 'workspace', id: workspace.workspaceId });
              }}
              onDragEnd={() => { setDragState(null); setDropState(null); }}
              onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onWorkspaceMenu(workspace, event); }}
              onDragOver={(event) => {
                if (dragState?.type !== 'workspace') return;
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                const ratio = (event.clientY - rect.top) / rect.height;
                setDropState({ id: workspace.workspaceId, edge: ratio < 0.5 ? 'before' : 'after' });
              }}
              onDrop={(event) => {
                event.preventDefault();
                onDropWorkspace(workspace.workspaceId);
                setDragState(null);
                setDropState(null);
              }}
            >
              <span className="dsv-treeDot" aria-hidden="true" />
              <span className="dsv-treeName">{workspaceLabel(workspace)}</span>
              <span className="dsv-treeMeta">{(workspace.sessionIds || []).length}</span>
              <code className="dsv-treePath">{workspace.path}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceGroupsDialog({ t, prefs, workspaces, onChange, onClose, embedded = false }) {
  const groups = prefs.workspaceGroups ?? [];
  const orders = prefs.workspaceGroupOrders ?? {};
  const assignments = prefs.workspaceAssignments ?? {};
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [filter, setFilter] = useState('');
  const [dragState, setDragState] = useState(null);
  const [dropState, setDropState] = useState(null);
  const [menu, setMenu] = useState(null);

  const tree = useMemo(
    () => buildGroupTree(groups, orders, assignments, workspaces),
    [groups, orders, assignments, workspaces],
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
    const nextOrders = { ...orders, [key]: [...(orders[key] || []), id] };
    onChange({ workspaceGroups: nextGroups, workspaceGroupOrders: nextOrders });
    setNewName('');
    setCreating(false);
  };

  const commitRename = () => {
    if (!renaming) return;
    const value = renameValue.trim().slice(0, 60);
    setGroups(groups.map((group) => (group.id === renaming.id ? { ...group, name: value || group.name } : group)));
    setRenaming(null);
  };

  const remove = () => {
    const target = groups.find((group) => group.id === deleting);
    if (!target) return;
    const removed = descendantIds(groups, target.id);
    const nextGroups = groups
      .filter((group) => !removed.has(group.id))
      .map((group) => (removed.has(group.parentId) ? { ...group, parentId: target.parentId || null } : group));
    const nextAssignments = Object.fromEntries(Object.entries(assignments).filter(([, id]) => !removed.has(id)));
    const nextOrders = Object.fromEntries(Object.entries(orders).map(([key, list]) => [
      key,
      Array.isArray(list) ? list.filter((id) => !removed.has(id)) : list,
    ]));
    onChange({ workspaceGroups: nextGroups, workspaceAssignments: nextAssignments, workspaceGroupOrders: nextOrders });
    setDeleting('');
  };

  const dropGroup = (targetId) => {
    if (dragState?.type !== 'group' || !dropState) return;
    const result = moveGroupInTree(groups, orders, dragState.id, targetId, dropState.edge);
    if (result) onChange({ workspaceGroups: result.groups, workspaceGroupOrders: result.orders });
  };

  const assignWorkspaceToGroup = (groupId) => {
    if (dragState?.type !== 'workspace') return;
    const result = moveWorkspaceToGroup(assignments, orders, dragState.id, groupId, null, false);
    onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
  };

  const dropWorkspace = (targetWorkspaceId) => {
    if (dragState?.type !== 'workspace' || !dropState) return;
    const target = (workspaces?.items ?? []).find((workspace) => workspace.workspaceId === targetWorkspaceId);
    const groupId = target ? assignments[target.workspaceId] || null : null;
    const result = moveWorkspaceToGroup(assignments, orders, dragState.id, groupId, targetWorkspaceId, dropState.edge === 'after');
    onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
  };

  const moveGroupToRoot = (groupId) => {
    const nextGroups = groups.map((group) => (group.id === groupId ? { ...group, parentId: null } : group));
    const rootKey = groupOrderKey(null);
    const nextOrders = { ...orders };
    for (const key of Object.keys(nextOrders)) {
      if (Array.isArray(nextOrders[key])) nextOrders[key] = nextOrders[key].filter((id) => id !== groupId);
    }
    nextOrders[rootKey] = [...(nextOrders[rootKey] || []), groupId];
    onChange({ workspaceGroups: nextGroups, workspaceGroupOrders: nextOrders });
  };

  const openMenu = (kind, id, event) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ kind, id, x: Math.min(event.clientX, window.innerWidth - 200), y: Math.min(event.clientY, window.innerHeight - 220) });
  };

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const onKey = (event) => { if (event.key === 'Escape') setMenu(null); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const toggle = (id) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const query = filter.trim().toLowerCase();
  const matches = (value) => !query || String(value || '').toLowerCase().includes(query);

  const filteredNodes = useMemo(() => {
    if (!query) return tree.nodes;
    const filterNodes = (nodes) => nodes
      .map((node) => {
        const children = filterNodes(node.children);
        const workspaces = node.workspaces.filter((workspace) => matches(workspaceLabel(workspace)) || matches(workspace.path));
        if (children.length || workspaces.length || matches(groupDisplayName(t, node.group, node.depth))) {
          return { ...node, children, workspaces };
        }
        return null;
      })
      .filter(Boolean);
    return filterNodes(tree.nodes);
  }, [tree.nodes, query]);

  const body = (
    <>
      <p className="dsv-sideHint dsv-groupIntro">{t('group.manage.hint')}</p>
      <div className="dsv-groupToolbar">
        <span className="dsv-focusListTitle">{t('group.count', { n: groups.length })}</span>
        <div className="dsv-groupToolbarActions">
          <button type="button" className="dsv-btn dsv-btnSm" onClick={() => setCollapsed(new Set((groups ?? []).map((group) => group.id)))}>
            {t('action.collapseAll')}
          </button>
          <button type="button" className="dsv-btn dsv-btnSm" onClick={() => setCollapsed(new Set())}>
            {t('action.expandAll')}
          </button>
          <button type="button" className="dsv-btn dsv-btnSm" data-tone={creating ? undefined : 'primary'} onClick={() => setCreating((value) => !value)}>
            {creating ? t('dialog.cancel') : t('group.new')}
          </button>
        </div>
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
            onKeyDown={(event) => { if (event.key === 'Enter') create(); }}
          />
          <label className="dsv-groupParentField">
            <span>{t('group.parent')}</span>
            <select className="dsv-select" value={newParent} onChange={(event) => setNewParent(event.target.value)}>
              <option value="">{t('group.parentNone')}</option>
              {groups.map((group, index) => <option key={group.id} value={group.id}>{groupDisplayName(t, group, index)}</option>)}
            </select>
          </label>
          <div className="dsv-groupCreateFoot">
            <button type="button" className="dsv-btn dsv-btnSm" data-tone="primary" disabled={!newName.trim()} onClick={create}>{t('dialog.save')}</button>
          </div>
        </div>
      )}

      <input
        className="dsv-input dsv-groupSearch"
        type="search"
        value={filter}
        placeholder={t('group.searchAll')}
        onChange={(event) => setFilter(event.target.value)}
      />

      <div className="dsv-tree">
        {filteredNodes.map((node) => (
          <TreeRow
            key={node.group.id}
            t={t}
            node={node}
            collapsed={collapsed}
            onToggle={toggle}
            dragState={dragState}
            setDragState={setDragState}
            dropState={dropState}
            setDropState={setDropState}
            onDropGroup={dropGroup}
            onAssignWorkspace={assignWorkspaceToGroup}
            onDropWorkspace={dropWorkspace}
            onRename={(group) => { setRenaming(group); setRenameValue(group.name || ''); }}
            renaming={renaming?.id === node.group.id ? renaming : null}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            commitRename={commitRename}
            cancelRename={() => setRenaming(null)}
            onAddChild={(id) => { setCreating(true); setNewParent(id); }}
            onDelete={(id) => setDeleting(id)}
            onMenu={(group, event) => openMenu('group', group.id, event)}
            onWorkspaceMenu={(workspace, event) => openMenu('workspace', workspace.workspaceId, event)}
          />
        ))}

        <div
          className={`dsv-treeChildren dsv-treeRoot${dropState?.id === '__root' ? ' dsv-treeDropInside' : ''}`}
          onDragOver={(event) => {
            if (dragState?.type !== 'workspace') return;
            event.preventDefault();
            setDropState({ id: '__root', edge: 'inside' });
          }}
          onDrop={(event) => {
            if (dragState?.type !== 'workspace') return;
            event.preventDefault();
            const result = moveWorkspaceToGroup(assignments, orders, dragState.id, null);
            onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
            setDragState(null);
            setDropState(null);
          }}
        >
          {tree.ungrouped
            .filter((workspace) => matches(workspaceLabel(workspace)) || matches(workspace.path))
            .map((workspace) => (
              <div
                key={workspace.workspaceId}
                className={`dsv-treeRow dsv-treeWorkspace dsv-treeUngrouped${dropState?.id === workspace.workspaceId ? ` dsv-treeDrop-${dropState.edge}` : ''}`}
                style={{ paddingLeft: 8 }}
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', workspace.workspaceId);
                  setDragState({ type: 'workspace', id: workspace.workspaceId });
                }}
                onDragEnd={() => { setDragState(null); setDropState(null); }}
                onContextMenu={(event) => openMenu('workspace', workspace.workspaceId, event)}
                onDragOver={(event) => {
                  if (dragState?.type !== 'workspace') return;
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = (event.clientY - rect.top) / rect.height;
                  setDropState({ id: workspace.workspaceId, edge: ratio < 0.5 ? 'before' : 'after' });
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragState?.type !== 'workspace') return;
                  const result = moveWorkspaceToGroup(assignments, orders, dragState.id, null, workspace.workspaceId, dropState?.edge === 'after');
                  onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
                  setDragState(null);
                  setDropState(null);
                }}
              >
                <span className="dsv-treeDot" aria-hidden="true" />
                <span className="dsv-treeName">{workspaceLabel(workspace)}</span>
                <span className="dsv-treeMeta">{(workspace.sessionIds || []).length}</span>
                <code className="dsv-treePath">{workspace.path}</code>
              </div>
            ))}
          {tree.ungrouped.length === 0 && filteredNodes.length === 0 && !query && <p className="dsv-sideEmpty">{t('group.emptyList')}</p>}
        </div>
      </div>

      {menu && (
        <div
          className="dsv-menu dsv-contextMenu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {menu.kind === 'group' ? (
            <>
              <GroupCascade
                t={t}
                groups={groups}
                excludeIds={[menu.id, ...descendantIds(groups, menu.id)]}
                onPick={(groupId) => {
                  const result = moveGroupInTree(groups, orders, menu.id, groupId, 'inside');
                  if (result) onChange({ workspaceGroups: result.groups, workspaceGroupOrders: result.orders });
                  setMenu(null);
                }}
                rootLabel={groups.find((group) => group.id === menu.id)?.parentId ? t('action.moveToRoot') : undefined}
                onRoot={() => { moveGroupToRoot(menu.id); setMenu(null); }}
              />
              <span className="dsv-menuDivider" role="separator" />
              <button type="button" role="menuitem" onClick={() => { setCreating(true); setNewParent(menu.id); setMenu(null); }}>{t('group.addChild')}</button>
              <button type="button" role="menuitem" onClick={() => { const target = groups.find((group) => group.id === menu.id); if (target) { setRenaming(target); setRenameValue(target.name || ''); } setMenu(null); }}>{t('action.rename')}</button>
              <button type="button" role="menuitem" className="dsv-danger" onClick={() => { setDeleting(menu.id); setMenu(null); }}>{t('dialog.delete')}</button>
            </>
          ) : (
            <GroupCascade
              t={t}
              groups={groups}
              onPick={(groupId) => {
                const result = moveWorkspaceToGroup(assignments, orders, menu.id, groupId, null, false);
                onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
                setMenu(null);
              }}
              rootLabel={assignments[menu.id] ? t('action.removeFromGroup') : undefined}
              onRoot={() => {
                const result = moveWorkspaceToGroup(assignments, orders, menu.id, null);
                onChange({ workspaceAssignments: result.assignments, workspaceGroupOrders: result.orders });
                setMenu(null);
              }}
            />
          )}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          t={t}
          title={t('group.delete.title')}
          body={t('group.delete.body', { name: groupDisplayName(t, groups.find((group) => group.id === deleting), 0) })}
          confirmKey="dialog.delete"
          onConfirm={remove}
          onClose={() => setDeleting('')}
        />
      )}
    </>
  );

  if (embedded) return <div className="dsv-groupEmbedded">{body}</div>;

  return (
    <Dialog
      wide
      title={t('group.manage.title')}
      onClose={onClose}
      footer={<button type="button" className="dsv-btn" data-tone="primary" onClick={onClose}>{t('focus.done')}</button>}
    >
      {body}
    </Dialog>
  );
}
