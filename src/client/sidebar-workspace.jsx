import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  activeRows,
  annotateRows,
  archivedRows,
  buildCandidates,
  buildRows,
  filterRows,
  filterRowsByFocus,
  filterRowsByWorkspaceIds,
  focusGroupById,
  focusIncludesPath,
  formatRelativeTime,
  groupByWorkspace,
  moveId,
  pendingLabelKey,
  removeFocusGroup,
  renameFocusGroup,
  restrictWorkspaces,
  restrictWorkspacesToIds,
  sessionTitle,
  splitSections,
  statusLabelKey,
  topLevelRows,
  watermarkLimit,
  workspaceLabel,
} from './logic.js';
import { addToTrash } from './api.js';
import { getPrefs, setPrefs, subscribePrefs } from './prefs.js';
import { addTrashIds, getTrashIds, refreshTrash, subscribeTrash } from './trash-store.js';
import { ConfirmDialog, Dialog, PromptDialog } from './dialog.jsx';
import { FocusBar, FocusDialog, FocusMembersDialog, groupLabel, memberSummary } from './focus-mode.jsx';
import { STYLES } from './styles.js';
import { ActivityIcon, ArchiveIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, FolderIcon, LayoutIcon, PinIcon, PlusIcon, RestoreIcon, SearchIcon, SessionViewIcon, TargetIcon, TrashIcon, ChevronsUpIcon, ChevronsDownIcon } from './icons.jsx';

const ALL = '__all';

function errorText(error) {
  return String(error?.message ?? error);
}

function looksRunning(error) {
  return /running|active|stop|运行|停止/i.test(errorText(error));
}

/** Rows belonging to the given top-level families. */
function familyIds(rows, topIds) {
  const wanted = new Set(topIds);
  const ids = new Set();
  let inFamily = false;
  for (const row of rows) {
    if ((row.depth ?? 0) === 0) inFamily = wanted.has(row.session.id);
    if (inFamily) ids.add(row.session.id);
  }
  return ids;
}

/** Rows of one top-level family, parent first. */
function familyFor(rows, topId) {
  const out = [];
  let inFamily = false;
  for (const row of rows) {
    if ((row.depth ?? 0) === 0) inFamily = row.session.id === topId;
    if (inFamily) out.push(row);
  }
  return out;
}

/** Keep the first `limit` top-level sessions together with their descendants. */
function takeTopFamilies(rows, tops, limit) {
  const picked = limit > 0 ? tops.slice(0, limit) : tops;
  const ids = familyIds(rows, picked.map((row) => row.session.id));
  return rows.filter((row) => ids.has(row.session.id));
}

/** Sort families by their top-level row, keeping children attached. */
function sortFamilies(rows, compare) {
  const families = [];
  for (const row of rows) {
    if ((row.depth ?? 0) === 0) families.push({ top: row, rows: [row] });
    else if (families.length > 0) families[families.length - 1].rows.push(row);
    else families.push({ top: row, rows: [row] });
  }
  families.sort((a, b) => compare(a.top, b.top));
  return families.flatMap((family) => family.rows);
}

function byUpdated(a, b) {
  return (b.session.updatedAt ?? 0) - (a.session.updatedAt ?? 0);
}

/** Apply a saved top-level order, leaving families intact. */
function applyFamilyOrder(rows, order) {
  if (!Array.isArray(order) || order.length === 0) return rows;
  const index = new Map(order.map((id, position) => [id, position]));
  return sortFamilies(rows, (a, b) => {
    const ai = index.get(a.session.id);
    const bi = index.get(b.session.id);
    if (ai === undefined && bi === undefined) return 0;
    if (ai === undefined) return 1;
    if (bi === undefined) return -1;
    return ai - bi;
  });
}

function usePrefs() {
  return useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);
}

function formatTime(t, updatedAt, now) {
  const value = formatRelativeTime(updatedAt, now);
  if (value.key === 'time.justNow') return t('time.justNow');
  return t(value.key, value.n === undefined ? undefined : { n: value.n });
}

function Dot({ status }) {
  return <span className="dsv-dot" data-status={status ?? 'idle'} aria-hidden="true" />;
}

export function SidebarWorkspacePane({
  t,
  useSessions,
  useSessionStatus,
  useWorkspaces,
  openSession,
  pinSession,
  unpinSession,
  archiveSession,
  unarchiveSession,
  startSession,
  forkSession,
  renameSession,
  renameWorkspace,
  deleteWorkspace,
  createWorkspace,
  insertWorkspaceBefore,
  pickDirectory,
  searchSessions,
  openPanel,
}) {
  const prefs = usePrefs();
  const glowFor = (row) =>
    row.status === 'running'
      ? prefs.glowRunning
      : row.status === 'pending'
        ? prefs.glowPending
        : row.status === 'done'
          ? prefs.glowDone
          : 'off';
  const focusGroup = focusGroupById(prefs);
  const sessions = useSessions((state) => state);
  const statuses = useSessionStatus((state) => state);
  const workspaces = useWorkspaces((state) => state);

  const paneRef = useRef(null);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedActive, setExpandedActive] = useState(false);
  const [expandedRecent, setExpandedRecent] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [search, setSearch] = useState({ state: 'idle', items: [], error: '' });
  const trashIds = useSyncExternalStore(subscribeTrash, getTrashIds, getTrashIds);
  const dragRef = useRef(null);
  const workspaceDragRef = useRef(null);
  const searchRef = useRef(null);
  const focusedRef = useRef(null);

  const collapsedGroups = useMemo(() => new Set(prefs.collapsedGroups ?? []), [prefs.collapsedGroups]);
  const focusExpandedSet = useMemo(() => new Set(prefs.focusExpanded ?? []), [prefs.focusExpanded]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = () => refreshTrash().catch(() => {});
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(''), 3200);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!menu && !contextMenu) return undefined;
    const close = () => {
      setMenu(null);
      setContextMenu(null);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('blur', close);
    };
  }, [menu, contextMenu]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2 || typeof searchSessions !== 'function') {
      setSearch({ state: 'idle', items: [], error: '' });
      return undefined;
    }
    const controller = new AbortController();
    setSearch((prev) => ({ ...prev, state: 'loading', error: '' }));
    const timer = setTimeout(() => {
      searchSessions(text, controller.signal)
        .then((value) => {
          if (controller.signal.aborted) return;
          setSearch({ state: 'ready', items: value?.items ?? [], error: '' });
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setSearch({ state: 'error', items: [], error: errorText(error) });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchSessions]);

  const annotated = useMemo(() => {
    if (!sessions || !workspaces) return [];
    const candidates = buildCandidates(sessions, workspaces.archivedSessionIds);
    const built = buildRows(candidates, sessions.byId ?? {}, workspaces);
    // Subagent sessions stay in the row graph while annotating so their parent
    // can show a running-children count; the setting decides whether their own
    // rows are rendered too.
    const rows = annotateRows(built, statuses);
    const visible = prefs.showSubagents ? rows : rows.filter((row) => row.session.origin !== 'subagent');
    return filterRowsByFocus(visible, prefs).filter((row) => !trashIds.has(row.session.id));
  }, [sessions, statuses, workspaces, prefs.showSubagents, prefs.focusGroups, prefs.focusGroupId, trashIds]);

  const pinnedSet = useMemo(() => new Set(workspaces?.pinnedSessionIds ?? []), [workspaces?.pinnedSessionIds]);
  const archivedSet = useMemo(
    () => new Set(workspaces?.archivedSessionIds ?? []),
    [workspaces?.archivedSessionIds],
  );
  const focusWorkspaces = useMemo(
    () => restrictWorkspaces(workspaces, prefs),
    [workspaces, prefs.focusGroups, prefs.focusGroupId],
  );

  const sections = useMemo(() => splitSections(annotated, workspaces?.pinnedSessionIds), [annotated, workspaces?.pinnedSessionIds]);

  const pinnedRows = useMemo(() => {
    const order = workspaces?.pinnedSessionIds ?? [];
    const byId = new Map(sections.pinned.map((row) => [row.session.id, row]));
    return order.map((id) => byId.get(id)).filter(Boolean);
  }, [sections.pinned, workspaces?.pinnedSessionIds]);

  const activeTop = useMemo(() => {
    const list = sortFamilies(
      activeRows(annotated).filter((row) => !pinnedSet.has(row.session.id)),
      byUpdated,
    );
    return topLevelRows(list);
  }, [annotated, pinnedSet]);

  const activeRowsView = useMemo(() => {
    const limit = expandedActive ? 0 : prefs.activeLimit;
    const picked = limit > 0 ? activeTop.slice(0, limit) : activeTop;
    return picked.flatMap((row) => familyFor(annotated, row.session.id));
  }, [annotated, activeTop, expandedActive, prefs.activeLimit]);

  const pinnedView = useMemo(
    () => pinnedRows.flatMap((row) => familyFor(annotated, row.session.id)),
    [annotated, pinnedRows],
  );
  // "Recent" is the recency shortcut across every session, including pinned and
  // active ones. The three shortcut groups may overlap; workspace groups stay
  // the canonical place for every session.
  const recentTop = useMemo(
    () =>
      topLevelRows(
        sortFamilies(
          annotated.filter((row) => prefs.showIdle || row.status !== 'idle'),
          byUpdated,
        ),
      ),
    [annotated, prefs.showIdle],
  );

  const recentRowsView = useMemo(() => {
    const limit = expandedRecent ? 0 : prefs.recentLimit;
    const picked = limit > 0 ? recentTop.slice(0, limit) : recentTop;
    return picked.flatMap((row) => familyFor(annotated, row.session.id));
  }, [annotated, recentTop, expandedRecent, prefs.recentLimit]);

  // Every session still belongs to its workspace, including rows that also
  // appear in the pinned/active/recent shortcut groups above.
  const restRows = useMemo(
    () => annotated.filter((row) => prefs.showIdle || row.status !== 'idle'),
    [annotated, prefs.showIdle],
  );

  // Shared by the workspace section and the expandable focus group bodies.
  // Empty workspaces stay visible: their header is still a useful place to
  // start a session from the workspace context menu.
  const buildGroups = (rows, workspaceView) => {
    if (!workspaceView) return [];
    return groupByWorkspace(rows, workspaceView, prefs.nestWorkspaces).map((group) => {
      const key = group.workspace?.workspaceId ?? '__none';
      const sorted =
        prefs.sort === 'manual' ? applyFamilyOrder(group.rows, prefs.manualOrder[key]) : sortFamilies(group.rows, byUpdated);
      return { ...group, rows: sorted, key };
    });
  };

  const groups = useMemo(
    () => buildGroups(restRows, focusWorkspaces),
    [restRows, focusWorkspaces, prefs.nestWorkspaces, prefs.sort, prefs.manualOrder],
  );

  const archived = useMemo(() => {
    if (prefs.archivedFilter === 'hide') return [];
    const rows = archivedRows(sessions, workspaces?.archivedSessionIds, workspaces);
    const visible = prefs.showSubagents ? rows : rows.filter((row) => row.session.origin !== 'subagent');
    const kept = filterRowsByFocus(visible.filter((row) => !trashIds.has(row.session.id)), prefs);
    return query.trim() ? filterRows(kept, { query: query.trim() }) : kept;
  }, [sessions, workspaces?.archivedSessionIds, prefs.archivedFilter, prefs.showSubagents, prefs.focusGroups, prefs.focusGroupId, query, trashIds]);

  const localMatches = useMemo(() => (query.trim() ? filterRows(annotated, { query: query.trim() }) : []), [annotated, query]);
  const localIds = useMemo(() => new Set(localMatches.map((row) => row.session.id)), [localMatches]);
  const contentHits = useMemo(
    () => (search.state === 'ready'
      ? search.items.filter((item) => !localIds.has(item.sessionId)
        && !archivedSet.has(item.sessionId)
        && !trashIds.has(item.sessionId)
        && (prefs.showSubagents || sessions?.byId?.[item.sessionId]?.origin !== 'subagent')
        && focusIncludesPath(prefs, workspaces, sessions?.byId?.[item.sessionId]?.cwd))
      : []),
    [search.state, search.items, localIds, archivedSet, trashIds, prefs.showSubagents, prefs.focusGroups, prefs.focusGroupId, sessions?.byId, workspaces],
  );
  const localDisplay = localMatches.slice(0, 20);
  const contentDisplay = contentHits.slice(0, Math.max(0, 20 - localDisplay.length));

  const run = useCallback(
    async (action, successKey, params) => {
      setBusy(true);
      try {
        await action();
        if (successKey) setFlash(t(successKey, params));
        return true;
      } catch (error) {
        setFlash(errorText(error));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const togglePin = async (row) => {
    const id = row.session.id;
    setMenu(null);
    await run(() => (pinnedSet.has(id) ? unpinSession(id) : pinSession(id)));
  };

  const archive = async (row) => {
    setMenu(null);
    setBusy(true);
    try {
      await archiveSession(row.session.id);
      setFlash(t('toast.archived', { n: 1 }));
    } catch (error) {
      if (looksRunning(error)) setDialog({ kind: 'archiveRunning', row });
      else setFlash(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const moveToTrash = async (row) => {
    setMenu(null);
    setBusy(true);
    try {
      if (!row.archived) await archiveSession(row.session.id);
      const result = await addToTrash([
        {
          sessionId: row.session.id,
          title: row.title,
          cwd: row.session.cwd ?? '',
          deletedAt: Date.now(),
        },
      ]);
      const failure = (result?.failed ?? []).find((item) => item.sessionId === row.session.id);
      if (!failure) {
        addTrashIds([row.session.id]);
        // Archiving is only the first half: a trashed session must also leave
        // the archived list, otherwise it reappears after the trash filter.
        await unarchiveSession(row.session.id).catch(() => {});
      }
      setFlash(failure ? errorText(failure.error ?? failure) : t('toast.trashed', { n: 1 }));
    } catch (error) {
      if (looksRunning(error)) setDialog({ kind: 'archiveRunning', row, trash: true });
      else setFlash(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const copyId = async (row) => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(row.session.id);
      setFlash(t('toast.copied'));
    } catch (error) {
      setFlash(errorText(error));
    }
  };

  const toggleGroup = (key) => {
    const next = new Set(prefs.collapsedGroups ?? []);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      // Native workspace resets the watermark when a group is collapsed.
      setExpandedGroups((prev) => {
        if (prev[key] === undefined) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
    setPrefs({ collapsedGroups: [...next] });
  };

  const showMore = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 5 }));
  };

  const toggleFocusExpanded = (id) => {
    const next = new Set(prefs.focusExpanded ?? []);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setPrefs({ focusExpanded: [...next] });
  };

  const showLess = (key) => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearDragMarks = () => {
    document.body.classList.remove('dsv-dragging');
    document
      .querySelectorAll('.dsv-dragSource, .dsv-dropBefore, .dsv-dropAfter, .dsv-dropTarget')
      .forEach((node) => node.classList.remove('dsv-dragSource', 'dsv-dropBefore', 'dsv-dropAfter', 'dsv-dropTarget'));
    window.getSelection()?.removeAllRanges();
  };

  const markRowDrop = (event) => {
    if (prefs.sort !== 'manual' || query.trim() || busy) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    event.currentTarget.classList.toggle('dsv-dropAfter', after);
    event.currentTarget.classList.toggle('dsv-dropBefore', !after);
  };

  const onDropRow = (event, target) => {
    event.preventDefault();
    event.stopPropagation();
    clearDragMarks();
    const dragId = dragRef.current;
    dragRef.current = null;
    if (!dragId || dragId === target.session.id) return;
    const group = groups.find((item) => item.rows.some((row) => row.session.id === target.session.id));
    const key = group?.key ?? '__none';
    const current = prefs.manualOrder[key] ?? (group?.rows ?? []).map((row) => row.session.id);
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    const next = moveId(current, dragId, target.session.id, after);
    setPrefs({ manualOrder: { ...prefs.manualOrder, [key]: next } });
  };

  const startDrag = (event, row) => {
    if (prefs.sort !== 'manual' || query.trim() || busy) return;
    dragRef.current = row.session.id;
    window.getSelection()?.removeAllRanges();
    document.body.classList.add('dsv-dragging');
    event.currentTarget.classList.add('dsv-dragSource');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.session.id);
    event.dataTransfer.setDragImage(event.currentTarget, 14, 18);
  };

  const closeMenus = () => {
    setMenu(null);
    setContextMenu(null);
  };

  const contextSessionItems = (row, archivedRow = false) => {
    const isPinned = pinnedSet.has(row.session.id);
    return (
      <>
        <button type="button" role="menuitem" onClick={() => { closeMenus(); openSession(row.session.id); }}>
          {t('action.open')}
        </button>
        {!archivedRow && (
          <button type="button" role="menuitem" onClick={() => { closeMenus(); togglePin(row); }}>
            {t(isPinned ? 'action.unpin' : 'action.pin')}
          </button>
        )}
        <button type="button" role="menuitem" onClick={() => { closeMenus(); setDialog({ kind: 'renameSession', row }); }}>
          {t('action.rename')}
        </button>
        <button type="button" role="menuitem" onClick={() => { closeMenus(); run(() => forkSession(row.session.id), 'toast.forked'); }}>
          {t('action.fork')}
        </button>
        <button type="button" role="menuitem" onClick={() => { closeMenus(); copyId(row); }}>
          {t('action.copyId')}
        </button>
        {archivedRow ? (
          <>
            <button type="button" role="menuitem" onClick={() => { closeMenus(); run(() => unarchiveSession(row.session.id), 'toast.restored', { n: 1 }); }}>
              {t('action.restore')}
            </button>
            <button type="button" role="menuitem" className="dsv-danger" onClick={() => { closeMenus(); moveToTrash(row); }}>
              {t('action.trash')}
            </button>
          </>
        ) : (
          <>
            <button type="button" role="menuitem" onClick={() => { closeMenus(); archive(row); }}>
              {t('action.archive')}
            </button>
            <button type="button" role="menuitem" className="dsv-danger" onClick={() => { closeMenus(); moveToTrash(row); }}>
              {t('action.trash')}
            </button>
          </>
        )}
      </>
    );
  };

  const contextWorkspaceItems = (workspace) => (
    <>
      <button type="button" role="menuitem" onClick={() => { closeMenus(); startSession(workspace.workspaceId); }}>
        {t('action.newSession')}
      </button>
      <button type="button" role="menuitem" onClick={() => { closeMenus(); setDialog({ kind: 'renameWorkspace', workspace }); }}>
        {t('action.renameWorkspace')}
      </button>
      <button type="button" role="menuitem" className="dsv-danger" onClick={() => { closeMenus(); setDialog({ kind: 'deleteWorkspace', workspace }); }}>
        {t('action.deleteWorkspace')}
      </button>
    </>
  );

  const contextFocusItems = (focus) => {
    const active = focus.id === prefs.focusGroupId;
    const label = active ? t('focus.exit') : prefs.focusGroupId ? t('focus.switch') : t('focus.enter');
    return (
      <>
        <button
          type="button"
          role="menuitem"
          onClick={() => { closeMenus(); setPrefs({ focusGroupId: active ? '' : focus.id }); }}
        >
          {label}
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => { closeMenus(); setDialog({ kind: 'focusRename', id: focus.id }); }}
        >
          {t('action.rename')}
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => { closeMenus(); setDialog({ kind: 'focusMembers', id: focus.id }); }}
        >
          {t('focus.editMembers')}
        </button>
        <button
          type="button"
          role="menuitem"
          className="dsv-danger"
          onClick={() => { closeMenus(); setDialog({ kind: 'focusDelete', id: focus.id }); }}
        >
          {t('dialog.delete')}
        </button>
      </>
    );
  };

  const contextRow = contextMenu?.kind === 'session'
    ? (contextMenu.archived ? archived : annotated).find((row) => row.session.id === contextMenu.id)
    : null;
  const contextWorkspace = contextMenu?.kind === 'workspace'
    ? groups.map((group) => group.workspace).find((workspace) => workspace?.workspaceId === contextMenu.id)
    : null;
  const contextFocus = contextMenu?.kind === 'focus'
    ? prefs.focusGroups.find((group) => group.id === contextMenu.id) ?? null
    : null;
  const contextItems = contextRow
    ? contextSessionItems(contextRow, contextMenu.archived)
    : contextWorkspace
      ? contextWorkspaceItems(contextWorkspace)
      : contextFocus
        ? contextFocusItems(contextFocus)
        : null;

  const sectionHead = ({ key, label, count, icon = null, collapsed, extra = null }) => (
    <div className="dsv-sideGroupHead dsv-sideSectionHead">
      <button
        type="button"
        className="dsv-sideGroupToggle"
        aria-expanded={!collapsed}
        onClick={() => toggleGroup(key)}
      >
        <span className="dsv-sideChevron" data-collapsed={collapsed}>
          {collapsed ? <ChevronRightIcon size={10} /> : <ChevronDownIcon size={10} />}
        </span>
        {icon}
        <span className="dsv-sideGroupTitle">{label}</span>
        <span className="dsv-sideCount">{count}</span>
      </button>
      {extra}
    </div>
  );

  const renderRow = (row, options = {}) => {
    const { archivedRow = false } = options;
    const open = () => openSession(row.session.id);
    const isPinned = pinnedSet.has(row.session.id);
    const time = formatTime(t, row.session.updatedAt, now);
    const waiting = row.status === 'pending';
    const title = row.session.blank ? t('row.newSession') : row.title;
    return (
      <div
        key={row.session.id}
        className="dsv-sideRow"
        data-depth={row.depth ?? 0}
        data-status={row.status}
        data-archived={archivedRow || undefined}
        data-pinned={isPinned || undefined}
        style={{ '--dsv-indent': `${(row.depth ?? 0) * 12}px` }}
        draggable={prefs.sort === 'manual' && !query.trim() && !archivedRow}
        onDragStart={(event) => startDrag(event, row)}
        onDragOver={markRowDrop}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          event.currentTarget.classList.remove('dsv-dropBefore', 'dsv-dropAfter');
        }}
        onDragEnd={clearDragMarks}
        onDrop={(event) => onDropRow(event, row)}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenu(null);
          focusedRef.current = row.session.id;
          setContextMenu({ kind: 'session', id: row.session.id, archived: archivedRow, x: event.clientX, y: event.clientY });
        }}
      >
        {!archivedRow && glowFor(row) !== 'off' && (
          <span
            className={`dsv-sideGlow dsv-sideGlow--${glowFor(row)}`}
            data-status={row.status}
            aria-hidden="true"
          />
        )}
        <button
          type="button"
          className="dsv-sideOpen"
          onClick={open}
          onFocus={() => { focusedRef.current = row.session.id; }}
          title={title}
        >
          <span className="dsv-sideSlot">
            <Dot status={archivedRow ? 'idle' : row.status} />
          </span>
          <span className="dsv-sideRowTitle">{title}</span>
          {row.depth > 0 && <span className="dsv-sideTag">{t('row.child')}</span>}
          {row.runningChildren > 0 && (
            <span className="dsv-sideRunning" title={t('row.runningChildren', { n: row.runningChildren })}>
              +{row.runningChildren}
            </span>
          )}
          {(prefs.showTimes || waiting) && (
            waiting ? (
              <span className="dsv-sideWaiting">{t(pendingLabelKey(row.pendingKind))}</span>
            ) : (
              <span className="dsv-sideTime">{time}</span>
            )
          )}
        </button>
      </div>
    );
  };

  const renderWorkspaceHead = (group, index) => {
    const workspace = group.workspace;
    const key = group.key;
    const collapsable = !!workspace;
    const collapsed = collapsedGroups.has(key);
    const activeCount = activeRows(group.rows).length;
    return (
      <div
        className="dsv-sideGroupHead"
        style={{ paddingLeft: 4 + group.depth * 12 }}
        draggable={!!workspace && prefs.sort === 'manual' && !query.trim()}
        onDragStart={(event) => {
          if (!workspace || prefs.sort !== 'manual' || query.trim()) return;
          workspaceDragRef.current = workspace.workspaceId;
          window.getSelection()?.removeAllRanges();
          document.body.classList.add('dsv-dragging');
          event.currentTarget.classList.add('dsv-dragSource');
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('application/x-dsv-workspace', workspace.workspaceId);
          event.dataTransfer.setDragImage(event.currentTarget, 14, 18);
        }}
        onDragOver={(event) => {
          const from = workspaceDragRef.current;
          if (!from || !workspace || from === workspace.workspaceId) return;
          event.preventDefault();
          event.currentTarget.classList.add('dsv-dropTarget');
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          event.currentTarget.classList.remove('dsv-dropTarget');
        }}
        onDrop={(event) => {
          const from = workspaceDragRef.current;
          workspaceDragRef.current = null;
          clearDragMarks();
          if (!from || !workspace || from === workspace.workspaceId) return;
          event.preventDefault();
          insertWorkspaceBefore?.(from, workspace.workspaceId);
        }}
        onDragEnd={() => {
          workspaceDragRef.current = null;
          clearDragMarks();
        }}
        onContextMenu={(event) => {
          if (!workspace) return;
          event.preventDefault();
          event.stopPropagation();
          setMenu(null);
          setContextMenu({ kind: 'workspace', id: key, x: event.clientX, y: event.clientY });
        }}
      >
        {collapsable ? (
          <button
            type="button"
            className="dsv-sideGroupToggle"
            aria-expanded={!collapsed}
            aria-label={workspaceLabel(workspace)}
            onClick={() => toggleGroup(key)}
          >
            <span className="dsv-sideChevron" data-collapsed={collapsed}>
              {collapsed ? <ChevronRightIcon size={10} /> : <ChevronDownIcon size={10} />}
            </span>
            <span className="dsv-sideGroupTitle">{workspaceLabel(workspace)}</span>
            {activeCount > 0 && (
              <span
                className="dsv-sideActiveMark"
                role="img"
                title={t('side.workspaceActive')}
                aria-label={t('side.workspaceActive')}
              >
                <span className="dsv-dot" data-status="running" aria-hidden="true" />
              </span>
            )}
            <span className="dsv-sideCount">{group.rows.length}</span>
          </button>
        ) : (
          <div className="dsv-sideGroupToggle">
            <span className="dsv-sideGroupTitle">{t('section.all')}</span>
            {activeCount > 0 && (
              <span
                className="dsv-sideActiveMark"
                role="img"
                title={t('side.workspaceActive')}
                aria-label={t('side.workspaceActive')}
              >
                <span className="dsv-dot" data-status="running" aria-hidden="true" />
              </span>
            )}
            <span className="dsv-sideCount">{group.rows.length}</span>
          </div>
        )}
        <div className="dsv-sideGroupActions">
          {workspace && (
            <button
              type="button"
              className="dsv-sideIconBtn"
              aria-label={t('action.newSession')}
              title={t('action.newSession')}
              onClick={() => startSession(workspace.workspaceId)}
            >
              <PlusIcon size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderGroup = (group, index) => {
    const collapsed = collapsedGroups.has(group.key);
    const tops = topLevelRows(group.rows);
    // Native-style watermark: active, waiting, unread-complete and
    // running-child rows raise the fold, while "Show more" grows it in fives.
    const floor = watermarkLimit(tops, prefs.workspaceLimit);
    const extra = expandedGroups[group.key] ?? 0;
    const shown = floor === 0 ? tops.length : Math.min(tops.length, floor + extra);
    const visible = takeTopFamilies(group.rows, tops.slice(0, shown), 0);
    const hidden = shown < tops.length;
    const canLess = extra > 0;
    return (
      <section className="dsv-sideGroup" key={group.key} aria-label={group.workspace ? workspaceLabel(group.workspace) : t('section.all')}>
        {renderWorkspaceHead(group, index)}
        {!collapsed && (
          <>
            {visible.map((row) => renderRow(row))}
            {(hidden || canLess) && (
              <button
                type="button"
                className="dsv-sideMore"
                style={{ paddingLeft: 28 + group.depth * 12 }}
                onClick={() => (hidden ? showMore(group.key) : showLess(group.key))}
              >
                {t(hidden ? 'side.more' : 'side.less')}
                <ChevronDownIcon size={11} />
              </button>
            )}
          </>
        )}
      </section>
    );
  };

  const searchActive = query.trim().length > 0;
  const activeCollapsed = collapsedGroups.has('__active');
  const recentCollapsed = collapsedGroups.has('__recent');
  const pinnedCollapsed = collapsedGroups.has('__pinned');
  const workspacesCollapsed = collapsedGroups.has('__workspaces');
  const workspaceGroupKeys = groups.map((group) => group.key);
  const allWorkspacesCollapsed = workspaceGroupKeys.length > 0
    && workspaceGroupKeys.every((key) => collapsedGroups.has(key));
  const toggleAllWorkspaces = () => {
    const next = new Set(collapsedGroups);
    if (allWorkspacesCollapsed) {
      for (const key of workspaceGroupKeys) next.delete(key);
    } else {
      for (const key of workspaceGroupKeys) next.add(key);
    }
    setPrefs({ collapsedGroups: [...next] });
  };
  const focusCollapsed = collapsedGroups.has('__focus');

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handler = (event) => {
      const target = event.target;
      const pane = paneRef.current;
      const withinPane = Boolean(pane && (pane.contains(target) || pane.contains(document.activeElement)));
      if (!withinPane && !searchOpen) return;
      if (dialog) return;
      const typing = target instanceof HTMLElement
        && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (dialog) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMenu(null);
        setContextMenu(null);
        setSearchOpen(true);
        return;
      }
      if (typing && !(mod && event.altKey)) return;
      if (mod && event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        startSession();
        return;
      }
      const focused = annotated.find((row) => row.session.id === focusedRef.current)
        ?? archived.find((row) => row.session.id === focusedRef.current);
      if (!focused) return;
      if (event.key === 'F2' || (mod && event.altKey && event.key.toLowerCase() === 'g')) {
        event.preventDefault();
        setMenu(null);
        setContextMenu(null);
        setDialog({ kind: 'renameSession', row: focused });
      } else if (mod && event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        closeMenus();
        run(() => forkSession(focused.session.id), 'toast.forked');
      } else if (mod && event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        closeMenus();
        archive(focused);
      } else if (event.key === 'Escape' && (menu || contextMenu)) {
        closeMenus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [annotated, archived, dialog, menu, contextMenu, startSession, forkSession, run, archive]);

  return (
    <div ref={paneRef} className="dsv-side" data-compact={prefs.compact || undefined} onClick={(event) => event.stopPropagation()}>
      <style>{STYLES}</style>
      <header className="dsv-sideHead">
        {searchOpen ? (
          <div className="dsv-sideSearch">
            <button
              type="button"
              className="dsv-sideSearchIcon"
              aria-label={t('side.search')}
              onClick={() => searchRef.current?.focus()}
            >
              <SearchIcon size={14} />
            </button>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder={t('side.search')}
              aria-label={t('side.search')}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  if (query) setQuery('');
                  else setSearchOpen(false);
                }
              }}
            />
            <button
              type="button"
              className="dsv-sideClear"
              aria-label={query ? t('side.clear') : t('side.closeSearch')}
              onClick={() => {
                if (query) setQuery('');
                else setSearchOpen(false);
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="dsv-sideTitleRow">
            <span className="dsv-sideTitle">{t('side.title')}</span>
            <div className="dsv-sideHeadActions">
              <button
                type="button"
                className="dsv-sideIconBtn"
                aria-label={t('side.search')}
                title={t('side.search')}
                onClick={() => {
                  setMenu(null);
                  setSearchOpen(true);
                }}
              >
                <SearchIcon size={14} />
              </button>
              <button type="button" className="dsv-sideIconBtn" aria-label={t('side.new')} title={t('side.new')} onClick={() => startSession()}>
                <PlusIcon size={14} />
              </button>
              <button
                type="button"
                className="dsv-sideIconBtn"
                aria-label={t('side.addWorkspace')}
                title={t('side.addWorkspace')}
                onClick={() => setDialog({ kind: 'addWorkspace' })}
              >
                <FolderIcon size={14} />
              </button>
              <button
                type="button"
                className="dsv-sideIconBtn"
                aria-label={t('side.manage')}
                title={t('side.manage')}
                onClick={() => openPanel?.()}
              >
                <SessionViewIcon size={14} />
              </button>
            </div>
          </div>
        )}
      </header>

      {focusGroup && (
        <FocusBar
          t={t}
          prefs={prefs}
          onManage={() => setDialog({ kind: 'focus' })}
          onExit={() => setPrefs({ focusGroupId: '' })}
        />
      )}

      {flash && <div className="dsv-sideFlash" role="status">{flash}</div>}

      <div className="dsv-sideScroll">
        {searchActive ? (
          <section className="dsv-sideGroup" aria-label={t('side.searchResults')}>
            <div className="dsv-sideGroupHead dsv-sideSectionHead">
              <div className="dsv-sideGroupToggle">
                <span className="dsv-sideGroupTitle">{t('side.searchResults')}</span>
                <span className="dsv-sideCount">{localDisplay.length + contentDisplay.length}</span>
              </div>
              {search.state === 'loading' && <span className="dsv-sideHint">{t('side.searching')}</span>}
            </div>
            {localDisplay.map((row) => renderRow(row))}
            {contentDisplay.map((hit) => {
              const summary = sessions?.byId?.[hit.sessionId];
              if (!summary) return null;
              return (
                <button
                  key={`hit-${hit.sessionId}`}
                  type="button"
                  className="dsv-sideHit"
                  onClick={() => openSession(hit.sessionId)}
                >
                  <Dot status={statuses?.get(hit.sessionId)?.running ? 'running' : 'idle'} />
                  <span className="dsv-sideRowMain">
                    <span className="dsv-sideRowTitle">{sessionTitle(summary)}</span>
                    <span className="dsv-sideHitSnippet">{hit.snippet}</span>
                  </span>
                </button>
              );
            })}
            {search.state === 'error' && <div className="dsv-sideHint">{search.error}</div>}
            {localDisplay.length === 0 && contentDisplay.length === 0 && search.state !== 'loading' && (
              <div className="dsv-sideEmpty">
                <span>{t('empty.filtered')}</span>
                <button type="button" className="dsv-sideTextBtn" onClick={() => setQuery('')}>
                  {t('side.clear')}
                </button>
              </div>
            )}
          </section>
        ) : (
          <>
            {prefs.archivedFilter !== 'only' && prefs.showActive && (
              <section className="dsv-sideGroup" aria-label={t('side.active')}>
                {sectionHead({
                  key: '__active',
                  label: t('side.active'),
                  count: activeTop.length,
                  icon: <ActivityIcon size={12} />,
                  collapsed: activeCollapsed,
                  extra: !activeCollapsed && activeTop.length > prefs.activeLimit && prefs.activeLimit > 0 ? (
                    <button type="button" className="dsv-sideTextBtn" onClick={() => setExpandedActive((prev) => !prev)}>
                      {t(expandedActive ? 'side.less' : 'side.more')}
                    </button>
                  ) : null,
                })}
                {!activeCollapsed && activeRowsView.map((row) => renderRow(row))}
              </section>
            )}

            {prefs.archivedFilter !== 'only' && prefs.showPinned && pinnedRows.length > 0 && (
              <section className="dsv-sideGroup" aria-label={t('section.pinned')}>
                {sectionHead({
                  key: '__pinned',
                  label: t('section.pinned'),
                  count: pinnedRows.length,
                  icon: <PinIcon size={12} />,
                  collapsed: pinnedCollapsed,
                })}
                {!pinnedCollapsed && pinnedView.map((row) => renderRow(row))}
              </section>
            )}

            {prefs.archivedFilter !== 'only' && prefs.showRecent && (
              <section className="dsv-sideGroup" aria-label={t('side.recent')}>
                {sectionHead({
                  key: '__recent',
                  label: t('side.recent'),
                  count: recentTop.length,
                  icon: <ClockIcon size={12} />,
                  collapsed: recentCollapsed,
                  extra: !recentCollapsed && recentTop.length > prefs.recentLimit && prefs.recentLimit > 0 ? (
                    <button type="button" className="dsv-sideTextBtn" onClick={() => setExpandedRecent((prev) => !prev)}>
                      {t(expandedRecent ? 'side.less' : 'side.more')}
                    </button>
                  ) : null,
                })}
                {!recentCollapsed && recentRowsView.map((row) => renderRow(row))}
              </section>
            )}

            {prefs.archivedFilter !== 'only' && prefs.focusEnabled !== false && !query.trim() && (
              <section className="dsv-sideGroup dsv-sideFocus" aria-label={t('focus.groups')}>
                {sectionHead({
                  key: '__focus',
                  label: t('focus.groups'),
                  count: prefs.focusGroups.length,
                  icon: <TargetIcon size={12} />,
                  collapsed: focusCollapsed,
                  extra: (
                    <span className="dsv-sideHeadActions">
                      <button
                        type="button"
                        className="dsv-sideIconBtn"
                        aria-label={t('focus.new')}
                        title={t('focus.new')}
                        onClick={() => setDialog({ kind: 'focus', creating: true })}
                      >
                        <PlusIcon size={12} />
                      </button>
                      <button
                        type="button"
                        className="dsv-sideIconBtn"
                        aria-label={t('focus.manage')}
                        title={t('focus.manage')}
                        onClick={() => setDialog({ kind: 'focus' })}
                      >
                        <SessionViewIcon size={12} />
                      </button>
                    </span>
                  ),
                })}
                {!focusCollapsed && (
                  <>
                    {prefs.focusGroups.map((entry) => {
                      const active = entry.id === prefs.focusGroupId;
                      const summary = memberSummary(entry, workspaces);
                      const expanded = focusExpandedSet.has(entry.id);
                      const memberIds = new Set(entry.workspaceIds);
                      const memberGroups = expanded
                        ? buildGroups(
                            filterRowsByWorkspaceIds(restRows, memberIds),
                            restrictWorkspacesToIds(workspaces, memberIds),
                          )
                        : [];
                      return (
                        <div key={entry.id}>
                          <div
                            className="dsv-focusRow"
                            data-active={active}
                            data-open={expanded || undefined}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              closeMenus();
                              setContextMenu({ kind: 'focus', id: entry.id, x: event.clientX, y: event.clientY });
                            }}
                          >
                            <button
                              type="button"
                              className="dsv-focusRowMain"
                              aria-expanded={expanded}
                              title={t(expanded ? 'focus.collapse' : 'focus.expand')}
                              onClick={() => toggleFocusExpanded(entry.id)}
                            >
                              <span className="dsv-focusChevron" data-collapsed={!expanded}>
                                {expanded ? <ChevronDownIcon size={10} /> : <ChevronRightIcon size={10} />}
                              </span>
                              <span className="dsv-focusDot" aria-hidden="true" />
                              <span className="dsv-focusRowName">{groupLabel(t, prefs, entry)}</span>
                              <span className="dsv-focusRowMeta">
                                {summary.stale > 0
                                  ? t('focus.staleCount', { n: summary.stale })
                                  : t('focus.memberCount', { n: entry.workspaceIds.length })}
                              </span>
                            </button>
                          </div>
                          {expanded && (
                            <div className="dsv-focusBody">
                              {memberGroups.length === 0 ? (
                                <div className="dsv-sideHint dsv-focusEmptyBody">{t('focus.membersEmpty')}</div>
                              ) : (
                                memberGroups.map((group, index) => renderGroup(group, index))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            )}

            {prefs.archivedFilter !== 'only' && prefs.showWorkspaces && groups.length > 0 && (
              <section className="dsv-sideGroup dsv-sideWorkspaces" aria-label={t('side.workspaces')}>
                {sectionHead({
                  key: '__workspaces',
                  label: t('side.workspaces'),
                  count: groups.length,
                  icon: <LayoutIcon size={12} />,
                  collapsed: workspacesCollapsed,
                  extra: workspaceGroupKeys.length > 0 ? (
                    <button
                      type="button"
                      className="dsv-sideGroupIcon"
                      aria-expanded={!allWorkspacesCollapsed}
                      aria-label={allWorkspacesCollapsed ? t('action.expandAll') : t('action.collapseAll')}
                      title={allWorkspacesCollapsed ? t('action.expandAll') : t('action.collapseAll')}
                      data-collapsed={allWorkspacesCollapsed || undefined}
                      onClick={toggleAllWorkspaces}
                    >
                      {allWorkspacesCollapsed ? <ChevronsDownIcon size={14} /> : <ChevronsUpIcon size={14} />}
                    </button>
                  ) : null,
                })}
                {!workspacesCollapsed && groups.map((group, index) => renderGroup(group, index))}
              </section>
            )}

            {(prefs.archivedFilter === 'show' || prefs.archivedFilter === 'only') && (
              <section className="dsv-sideGroup" aria-label={t('side.archived')}>
                <div className="dsv-sideGroupHead dsv-sideSectionHead">
                  <div className="dsv-sideGroupToggle">
                    <span className="dsv-sideChevron" aria-hidden="true" />
                    <ArchiveIcon size={12} />
                    <span className="dsv-sideGroupTitle">{t('side.archived')}</span>
                    <span className="dsv-sideCount">{archived.length}</span>
                  </div>
                </div>
                {archived.length === 0 ? (
                  <div className="dsv-sideHint">{t('archived.empty')}</div>
                ) : (
                  archived.map((row) => renderRow(row, { archivedRow: true }))
                )}
              </section>
            )}

            {activeRowsView.length === 0 && pinnedRows.length === 0 && archived.length === 0 &&
              prefs.showWorkspaces && !groups.some((group) => group.rows.length > 0) && (
              <div className="dsv-sideEmpty">
                {focusGroup ? (
                  <>
                    <span>{t('focus.emptySide')}</span>
                    <span className="dsv-sideHint">{t('focus.emptySideHint')}</span>
                    <button
                      type="button"
                      className="dsv-sideTextBtn"
                      onClick={() => setDialog({ kind: 'focus' })}
                    >
                      {t('focus.manage')}
                    </button>
                  </>
                ) : (
                  <>
                    <span>{t('empty.none')}</span>
                    <span className="dsv-sideHint">{t('empty.noneHint')}</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {dialog?.kind === 'renameSession' && (
        <PromptDialog
          t={t}
          title={t('dialog.renameSession.title')}
          label={t('dialog.renameSession.label')}
          initial={dialog.row.title}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            const row = dialog.row;
            setDialog(null);
            run(() => renameSession(row.session.id, value), 'toast.renamed');
          }}
        />
      )}

      {dialog?.kind === 'addWorkspace' && (
        <PromptDialog
          t={t}
          title={t('dialog.addWorkspace.title')}
          label={t('dialog.addWorkspace.path')}
          browse={async () => {
            try {
              return await pickDirectory();
            } catch (error) {
              setFlash(t('dialog.browseFailed', { message: errorText(error) }));
              return '';
            }
          }}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            setDialog(null);
            run(() => createWorkspace({ path: value }), 'toast.workspaceAdded');
          }}
        />
      )}

      {dialog?.kind === 'renameWorkspace' && (
        <PromptDialog
          t={t}
          title={t('dialog.renameWorkspace.title')}
          label={t('dialog.renameWorkspace.title')}
          initial={workspaceLabel(dialog.workspace)}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            const workspace = dialog.workspace;
            setDialog(null);
            run(() => renameWorkspace(workspace.workspaceId, value), 'toast.workspaceRenamed');
          }}
        />
      )}

      {dialog?.kind === 'deleteWorkspace' && (
        <ConfirmDialog
          t={t}
          title={t('dialog.deleteWorkspace.title')}
          body={t('dialog.deleteWorkspace.body', { name: workspaceLabel(dialog.workspace) })}
          confirmKey="dialog.delete"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const workspace = dialog.workspace;
            setDialog(null);
            run(() => deleteWorkspace(workspace.workspaceId), 'toast.workspaceDeleted');
          }}
        />
      )}

      {dialog?.kind === 'focus' && (
        <FocusDialog
          t={t}
          prefs={prefs}
          workspaces={workspaces}
          initialCreating={dialog.creating === true}
          onChange={(patch) => setPrefs(patch)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'focusRename' && (() => {
        const group = prefs.focusGroups.find((entry) => entry.id === dialog.id);
        if (!group) return null;
        return (
          <PromptDialog
            t={t}
            title={t('focus.rename.title')}
            label={t('focus.rename.title')}
            initial={groupLabel(t, prefs, group)}
            onClose={() => setDialog(null)}
            onSubmit={(value) => {
              setDialog(null);
              setPrefs(renameFocusGroup(prefs, group.id, value));
            }}
          />
        );
      })()}

      {dialog?.kind === 'focusMembers' && (
        <FocusMembersDialog
          t={t}
          prefs={prefs}
          workspaces={workspaces}
          groupId={dialog.id}
          onChange={(patch) => setPrefs(patch)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'focusDelete' && (() => {
        const group = prefs.focusGroups.find((entry) => entry.id === dialog.id);
        if (!group) return null;
        return (
          <ConfirmDialog
            t={t}
            title={t('focus.delete.title')}
            body={t('focus.delete.body', { name: groupLabel(t, prefs, group) })}
            confirmKey="dialog.delete"
            onClose={() => setDialog(null)}
            onConfirm={() => {
              setDialog(null);
              setPrefs(removeFocusGroup(prefs, group.id));
            }}
          />
        );
      })()}

      {contextMenu && contextItems && createPortal(
        <div
          className="dsv-menu dsv-contextMenu"
          role="menu"
          style={{
            left: Math.min(contextMenu.x, (globalThis.innerWidth ?? 1200) - 220),
            top: Math.min(contextMenu.y, (globalThis.innerHeight ?? 800) - 280),
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {contextItems}
        </div>,
        globalThis.document.body,
      )}

      {dialog?.kind === 'archiveRunning' && (
        <ConfirmDialog
          t={t}
          title={t('dialog.archiveRunning.title')}
          body={t('dialog.archiveRunning.body', { title: dialog.row.title })}
          confirmKey="dialog.confirm"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const row = dialog.row;
            const trash = dialog.trash;
            setDialog(null);
            run(async () => {
              await archiveSession(row.session.id, { stopActivity: true });
              if (trash) {
                await addToTrash([
                  { sessionId: row.session.id, title: row.title, cwd: row.session.cwd ?? '', deletedAt: Date.now() },
                ]);
                addTrashIds([row.session.id]);
                await unarchiveSession(row.session.id).catch(() => {});
              }
            }, trash ? 'toast.trashed' : 'toast.stoppedArchived', trash ? { n: 1 } : undefined);
          }}
        />
      )}
    </div>
  );
}
