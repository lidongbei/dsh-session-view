import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  STATUS_LIST,
  annotateRows,
  archivedRows,
  buildCandidates,
  buildRows,
  countByStatus,
  errorMessage,
  filterRows,
  formatRelativeTime,
  flattenWorkspaceGroups,
  groupStatus,
  isStaleSessionError,
  matchesQuery,
  pendingLabelKey,
  splitSections,
  statusLabelKey,
  trashRows,
  workspaceLabel,
} from './logic.js';
import { addToTrash, fetchTrash, purgeTrash, restoreTrash } from './api.js';
import { SessionGroupsDialog } from './session-groups.jsx';
import { WorkspaceGroupsDialog } from './workspace-groups.jsx';
import { getPrefs, setPrefs, subscribePrefs } from './prefs.js';
import { consumePanelIntent, getPanelIntent, subscribePanelIntent } from './panel-intent.js';
import { addTrashIds, removeTrashIds, setTrashItems } from './trash-store.js';
import { STYLES } from './styles.js';
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PinIcon,
  RestoreIcon,
  SearchIcon,
  TrashIcon,
} from './icons.jsx';

const ALL = 'all';
const TABS = ['active', 'archived', 'trash', 'sessionGroups', 'workspaceGroups', 'workspaces'];

const CONFIRM_COPY = {
  archive: { title: 'confirm.archive.title', body: 'confirm.archive.body', tone: 'normal' },
  trash: { title: 'confirm.trash.title', body: 'confirm.trash.body', tone: 'normal' },
  purge: {
    title: 'confirm.purge.title',
    body: 'confirm.purge.body',
    warning: 'confirm.purge.warning',
    tone: 'danger',
  },
  forcePurge: {
    title: 'confirm.forcePurge.title',
    body: 'confirm.forcePurge.body',
    warning: 'confirm.forcePurge.warning',
    tone: 'danger',
  },
};

function errorText(error) {
  return errorMessage(error);
}

/**
 * Session-first management page rendered by the keyed `main` panel.
 *
 * Tabs separate live sessions, archived sessions and the trash. The live tab is
 * grouped by state (pinned first, then running / pending / unread), with batch
 * selection for archive, trash, restore and permanent purge.
 */
export function SessionView({
  t,
  useSessions,
  useSessionStatus,
  useWorkspaces,
  openSession,
  pinSession,
  unpinSession,
  archiveSession,
  unarchiveSession,
}) {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);
  const sessions = useSessions((state) => state);
  const statuses = useSessionStatus((state) => state);
  const workspaces = useWorkspaces((state) => state);

  const [tab, setTab] = useState('active');
  const [query, setQuery] = useState('');
  const [workspaceId, setWorkspaceId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [now, setNow] = useState(() => Date.now());
  const [groupWorkspaces, setGroupWorkspaces] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
  const [manage, setManage] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [trash, setTrash] = useState({ state: 'idle', items: [], error: null });
  const [staleIds, setStaleIds] = useState(() => new Set());
  const [groupsQuery, setGroupsQuery] = useState('');
  const [groupDialog, setGroupDialog] = useState(false);
  const [expandedSessionGroups, setExpandedSessionGroups] = useState(() => new Set());
  const panelIntent = useSyncExternalStore(subscribePanelIntent, getPanelIntent, () => null);

  useEffect(() => {
    if (!panelIntent) return;
    if (panelIntent.kind === 'workspaceFilter') {
      setTab('workspaces');
      if (panelIntent.workspaceId) setWorkspaceId(panelIntent.workspaceId);
    } else if (panelIntent.kind === 'workspaceGroups') {
      setTab('workspaceGroups');
    } else {
      return;
    }
    consumePanelIntent();
  }, [panelIntent]);

  const sessionGroupTree = useMemo(
    () => flattenWorkspaceGroups(prefs.sessionGroups ?? []),
    [prefs.sessionGroups],
  );
  const hiddenWorkspaceIds = prefs.hiddenWorkspaceIds ?? [];
  const hiddenWorkspaceSet = useMemo(() => new Set(hiddenWorkspaceIds), [hiddenWorkspaceIds]);
  const filterWorkspaceItems = useMemo(
    () =>
      [...(workspaces?.items ?? [])].sort((a, b) =>
        String(a?.path ?? a?.title ?? '').localeCompare(String(b?.path ?? b?.title ?? ''), 'zh'),
      ),
    [workspaces?.items],
  );
  const toggleWorkspaceVisibility = (id) => {
    if (!id) return;
    setPrefs({
      hiddenWorkspaceIds: hiddenWorkspaceSet.has(id)
        ? hiddenWorkspaceIds.filter((item) => item !== id)
        : [...hiddenWorkspaceIds, id],
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadTrash = useCallback(async () => {
    setTrash((prev) => ({ ...prev, state: 'loading', error: null }));
    try {
      const data = await fetchTrash();
      const items = Array.isArray(data.items) ? data.items : [];
      setTrash({ state: 'ready', items, error: null });
      setTrashItems(items);
    } catch (error) {
      setTrash({ state: 'error', items: [], error: errorText(error) });
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  useEffect(() => {
    setSelected([]);
    setManage(false);
  }, [tab]);

  const trashedIds = useMemo(
    () => new Set((trash.items ?? []).map((item) => item.sessionId)),
    [trash.items],
  );

  const annotated = useMemo(() => {
    if (!sessions || !workspaces) return [];
    const candidates = buildCandidates(sessions, workspaces.archivedSessionIds);
    const rows = buildRows(candidates, sessions.byId ?? {}, workspaces);
    // Keep descendant rows long enough to count running children, then drop
    // them: subagent sessions are execution detail, not management rows.
    const annotatedRows = annotateRows(rows, statuses);
    const visible = prefs.showSubagents ? annotatedRows : annotatedRows.filter((row) => row.session.origin !== 'subagent');
    return visible.filter((row) => !trashedIds.has(row.session.id) && !staleIds.has(row.session.id));
  }, [sessions, statuses, workspaces, prefs.showSubagents, trashedIds, staleIds]);

  const sessionGroupItems = useMemo(
    () => annotated.map((row) => ({
      id: row.session.id,
      title: row.session.blank ? t('row.newSession') : (row.title || row.session.id),
      workspace: row.workspace ? workspaceLabel(row.workspace) : t('workspace.unknown'),
      status: row.status,
    })),
    [annotated, t],
  );
  const sessionAssignments = prefs.sessionAssignments ?? {};
  const groupsFilter = groupsQuery.trim().toLowerCase();
  const assignSession = (sessionId, groupId) => {
    const next = { ...sessionAssignments };
    if (groupId) next[sessionId] = groupId;
    else delete next[sessionId];
    setPrefs({ sessionAssignments: next });
  };
  const filteredGroupItems = sessionGroupItems.filter((item) => {
    if (!groupsFilter) return true;
    return item.title.toLowerCase().includes(groupsFilter)
      || item.workspace.toLowerCase().includes(groupsFilter)
      || sessionGroupTree.some((group) => group.id === sessionAssignments[item.id]
        && String(group.name ?? '').toLowerCase().includes(groupsFilter));
  });

  const scopeRows = useMemo(
    () => filterRows(annotated, { query, workspaceId, status: ALL }),
    [annotated, query, workspaceId],
  );
  const activeRows = useMemo(
    () => (status === ALL ? scopeRows : filterRows(scopeRows, { status })),
    [scopeRows, status],
  );
  const counts = useMemo(() => countByStatus(scopeRows), [scopeRows]);
  const sections = useMemo(
    () => splitSections(activeRows, workspaces?.pinnedSessionIds),
    [activeRows, workspaces?.pinnedSessionIds],
  );
  const archivedAll = useMemo(() => {
    const all = archivedRows(sessions, workspaces?.archivedSessionIds, workspaces)
      .filter((row) => !trashedIds.has(row.session.id) && !staleIds.has(row.session.id));
    return prefs.showSubagents ? all : all.filter((row) => row.session.origin !== 'subagent');
  }, [sessions, workspaces, prefs.showSubagents, trashedIds, staleIds]);
  const archived = useMemo(
    () => filterRows(archivedAll, { query, workspaceId, status: ALL }),
    [archivedAll, query, workspaceId],
  );
  const trashedAll = useMemo(() => {
    const all = trashRows(trash.items, sessions?.byId, workspaces);
    return prefs.showSubagents ? all : all.filter((row) => row.session.origin !== 'subagent');
  }, [trash.items, sessions?.byId, workspaces, prefs.showSubagents]);
  const trashed = useMemo(
    () => filterRows(trashedAll.filter((row) => !staleIds.has(row.session.id)), { query, workspaceId, status: ALL }),
    [trashedAll, query, workspaceId, staleIds],
  );

  const workspaceOptions = useMemo(() => {
    const byWorkspace = new Map();
    const source = tab === 'archived' ? archivedAll : tab === 'trash' ? trashedAll : annotated;
    for (const row of source) {
      const workspace = row.workspace;
      if (!workspace?.workspaceId) continue;
      if (!byWorkspace.has(workspace.workspaceId)) {
        byWorkspace.set(workspace.workspaceId, workspaceLabel(workspace) || workspace.workspaceId);
      }
    }
    return Array.from(byWorkspace, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [annotated, archivedAll, trashedAll, tab]);

  const pinnedSet = useMemo(
    () => new Set(workspaces?.pinnedSessionIds ?? []),
    [workspaces?.pinnedSessionIds],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const tabRows =
    tab === 'active' ? activeRows : tab === 'archived' ? archived : tab === 'trash' ? trashed : [];
  const tabIds = tabRows.map((row) => row.session.id);
  const allSelected = tabIds.length > 0 && tabIds.every((id) => selectedSet.has(id));

  const filtersActive = query.trim().length > 0 || workspaceId !== ALL || status !== ALL;

  const clearFilters = () => {
    setQuery('');
    setWorkspaceId(ALL);
    setStatus(ALL);
  };

  const notify = (successText, failures = [], ok = 1) => {
    if (failures.length === 0) {
      setToast({ text: successText, tone: 'info' });
      return;
    }
    if (successText) {
      setToast({
        text: `${successText} · ${t('toast.partial', { ok, failed: failures.length })}`,
        tone: 'error',
      });
      return;
    }
    setToast({ text: t('toast.failed', { message: errorText(failures[0]) }), tone: 'error' });
  };

  const runCheck = async () => {
    setBusy(true);
    try {
      await loadTrash();
      setStaleIds(new Set());
      setSelected([]);
      notify(t('toast.checked'));
    } catch (error) {
      notify('', [error]);
    } finally {
      setBusy(false);
    }
  };

  const markStale = (ids) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return 0;
    setStaleIds((prev) => {
      const next = new Set(prev);
      unique.forEach((id) => next.add(id));
      return next;
    });
    return unique.length;
  };

  const reportStale = (count) => {
    if (!count) return;
    setToast((prev) => ({
      text: prev?.text ? `${prev.text} · ${t('toast.stale', { n: count })}` : t('toast.stale', { n: count }),
      tone: 'error',
    }));
  };

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const togglePin = async (row) => {
    const id = row.session.id;
    const pinned = pinnedSet.has(id);
    setBusy(true);
    try {
      await (pinned ? unpinSession(id) : pinSession(id));
    } catch (error) {
      if (isStaleSessionError(error)) {
        markStale([id]);
        setToast({ text: t('toast.stale', { n: 1 }), tone: 'error' });
      } else {
        setToast({ text: t('toast.failed', { message: errorText(error) }), tone: 'error' });
      }
    } finally {
      setBusy(false);
    }
  };

  const archiveMany = async (ids) => {
    const failures = [];
    let ok = 0;
    // Serialize Host mutations: concurrent archive calls on the same workspace
    // index race and one of them can fail after the others already landed.
    for (const id of ids) {
      try {
        await archiveSession(id);
        ok += 1;
      } catch (error) {
        failures.push({ id, error });
      }
    }
    const stale = markStale(failures.filter((item) => isStaleSessionError(item.error)).map((item) => item.id));
    notify(ok === 0 ? '' : t('toast.archived', { n: ok }), failures, ok);
    reportStale(stale);
    setSelected([]);
  };

  const trashMany = async (rows) => {
    const ids = rows.map((row) => row.session.id);
    const archived = await Promise.allSettled(
      rows.map((row) => (row.archived ? Promise.resolve() : archiveSession(row.session.id))),
    );
    const failures = archived
      .map((result, index) => (result.status === 'rejected' ? { sessionId: ids[index], error: result.reason } : null))
      .filter(Boolean);
    const ready = rows.filter((_, index) => archived[index].status === 'fulfilled');
    let stale = markStale(failures.filter((item) => isStaleSessionError(item.error)).map((item) => item.sessionId));
    if (ready.length > 0) {
      try {
        const result = await addToTrash(
          ready.map((row) => ({
            sessionId: row.session.id,
            title: row.session.displayTitle || row.session.title || '',
            cwd: row.session.cwd || '',
          })),
        );
        if (Array.isArray(result.failed)) {
          failures.push(...result.failed);
          stale += markStale(result.failed.filter((item) => isStaleSessionError(item.error)).map((item) => item.sessionId));
        }
        const added = new Set(ready.map((row) => row.session.id));
        for (const failed of result.failed ?? []) added.delete(failed.sessionId);
        await Promise.allSettled([...added].map((id) => unarchiveSession(id)));
        const ok = result.added ?? added.size;
        addTrashIds([...added]);
        notify(ok === 0 ? '' : t('toast.trashed', { n: ok }), failures, ok);
        reportStale(stale);
        await loadTrash();
      } catch (error) {
        failures.push({ error });
        notify('', failures);
      }
    } else {
      notify('', failures);
      reportStale(stale);
    }
    setSelected([]);
  };

  const restoreMany = async (ids) => {
    const failures = [];
    let ok = 0;
    for (const id of ids) {
      try {
        await unarchiveSession(id);
        ok += 1;
      } catch (error) {
        failures.push({ id, error });
      }
    }
    const stale = markStale(failures.filter((item) => isStaleSessionError(item.error)).map((item) => item.id));
    notify(ok === 0 ? '' : t('toast.restored', { n: ok }), failures, ok);
    reportStale(stale);
    if (tab === 'trash') await loadTrash();
    setSelected([]);
  };

  const restoreFromTrash = async (ids) => {
    try {
      const result = await restoreTrash(ids);
      const failures = Array.isArray(result.failed) ? result.failed : [];
      const ok = result.restored ?? ids.length - failures.length;
      const stale = markStale(failures.filter((item) => isStaleSessionError(item.error)).map((item) => item.sessionId));
      const failedIds = new Set(failures.map((item) => item.sessionId));
      removeTrashIds(ids.filter((id) => !failedIds.has(id)));
      notify(ok === 0 ? '' : t('toast.restored', { n: ok }), failures, ok);
      reportStale(stale);
      await Promise.allSettled(ids.map((id) => unarchiveSession(id)));
      await loadTrash();
    } catch (error) {
      notify('', [{ error }]);
    }
    setSelected([]);
  };

  const purgeMany = async (ids, force = false) => {
    try {
      const result = await purgeTrash(ids, force);
      const failures = Array.isArray(result.failed) ? result.failed : [];
      const ok = result.purged?.length ?? 0;
      removeTrashIds(Array.isArray(result.purged) ? result.purged : ids);
      notify(ok === 0 ? '' : t('toast.purged', { n: ok }), failures, ok);
      if (failures.length > 0) {
        setTab('trash');
        setQuery('');
        setWorkspaceId(ALL);
        setStatus(ALL);
        setCollapsedSections(new Set());
      }
      await loadTrash();
    } catch (error) {
      notify('', [{ error }]);
    }
    setSelected([]);
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    const { kind, ids, rows } = confirm;
    setConfirm(null);
    setBusy(true);
    try {
      if (kind === 'archive') await archiveMany(ids);
      if (kind === 'trash') await trashMany(rows);
      if (kind === 'purge') await purgeMany(ids);
      if (kind === 'forcePurge') await purgeMany(ids, true);
    } finally {
      setBusy(false);
    }
  };

  const requestConfirm = (kind, rows) => {
    const ids = rows.map((row) => row.session.id);
    if (ids.length === 0) return;
    setConfirm({ kind, ids, rows });
  };

  const togglePinFromRow = (row) => {
    togglePin(row);
  };

  const renderActions = (row) => {
    const id = row.session.id;
    if (tab === 'active') {
      const pinned = pinnedSet.has(id);
      return (
        <>
          <button
            type="button"
            className="dsv-iconBtn"
            aria-pressed={pinned}
            aria-label={t(pinned ? 'action.unpin' : 'action.pin')}
            title={t(pinned ? 'action.unpin' : 'action.pin')}
            onClick={() => togglePinFromRow(row)}
          >
            <PinIcon size={13} />
          </button>
          <button
            type="button"
            className="dsv-iconBtn"
            aria-label={t('action.archive')}
            title={t('action.archive')}
            onClick={() => requestConfirm('archive', [row])}
          >
            <ArchiveIcon size={13} />
          </button>
          <button
            type="button"
            className="dsv-iconBtn"
            data-tone="danger"
            aria-label={t('action.trash')}
            title={t('action.trash')}
            onClick={() => requestConfirm('trash', [row])}
          >
            <TrashIcon size={13} />
          </button>
        </>
      );
    }
    if (tab === 'archived') {
      return (
        <>
          <button
            type="button"
            className="dsv-iconBtn"
            aria-label={t('action.restore')}
            title={t('action.restore')}
            onClick={() => restoreMany([id])}
          >
            <RestoreIcon size={13} />
          </button>
          <button
            type="button"
            className="dsv-iconBtn"
            data-tone="danger"
            aria-label={t('action.trash')}
            title={t('action.trash')}
            onClick={() => requestConfirm('trash', [row])}
          >
            <TrashIcon size={13} />
          </button>
        </>
      );
    }
    return (
      <>
        <button
          type="button"
          className="dsv-iconBtn"
          aria-label={t('action.restore')}
          title={t('action.restore')}
          onClick={() => restoreFromTrash([id])}
        >
          <RestoreIcon size={13} />
        </button>
        <button
          type="button"
          className="dsv-iconBtn"
          data-tone="danger"
          aria-label={t('action.purge')}
          title={t('action.purge')}
          onClick={() => requestConfirm('purge', [row])}
        >
          <TrashIcon size={13} />
        </button>
      </>
    );
  };

  const renderRow = (row) => {
    const id = row.session.id;
    const pinned = pinnedSet.has(id);
    const time = formatRelativeTime(
      tab === 'trash' ? row.deletedAt : row.session.updatedAt,
      now,
    );
    const timeLabel = t(time.key, time.n === undefined ? undefined : { n: time.n });
    const workspaceName = row.workspace
      ? workspaceLabel(row.workspace) || t('workspace.unknown')
      : t('workspace.unknown');
    const meta = tab === 'trash' ? `${workspaceName} · ${t('trash.deletedAt', { time: timeLabel })}` : `${workspaceName} · ${timeLabel}`;
    const title = row.session.blank ? t('row.newSession') : row.title;

    return (
      <div
        key={id}
        className="dsv-row"
        data-depth={row.depth}
        style={{ '--dsv-depth': row.depth }}
        role="listitem"
        data-manage={manage}
      >
        {manage && (
          <input
            type="checkbox"
            className="dsv-check"
            checked={selectedSet.has(id)}
            onChange={() => toggleSelect(id)}
            aria-label={t('select.count', { n: 1 })}
          />
        )}
        <button
          type="button"
          className="dsv-rowButton"
          onClick={() => (manage ? toggleSelect(id) : tab === 'active' && openSession(id))}
          title={tab === 'active' ? t('row.open', { title }) : title}
        >
          {tab !== 'trash' && <span className="dsv-status" data-status={row.status} aria-hidden="true" />}
          <span className="dsv-main">
            <span className="dsv-rowTitle">
              {pinned && tab === 'active' && (
                <span className="dsv-boardPin">
                  <PinIcon size={10} />
                </span>
              )}
              {title}
            </span>
            <span className="dsv-rowMeta">
              {row.session.origin === 'subagent' && <span className="dsv-tag">{t('row.child')}</span>}
              {row.orphan && (
                <span className="dsv-tag" data-kind="orphan">
                  {t('row.orphan')}
                </span>
              )}
              <span className="dsv-metaText dsv-workspace">{meta}</span>
              {row.runningChildren > 0 && (
                <>
                  <span className="dsv-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="dsv-metaText">{t('row.runningChildren', { n: row.runningChildren })}</span>
                </>
              )}
            </span>
          </span>
          <span className="dsv-srOnly">{t(statusLabelKey(row.status))}</span>
          {tab === 'active' && row.status === 'pending' && (
            <span className="dsv-pill" data-status="pending">
              {t(pendingLabelKey(row.pendingKind))}
            </span>
          )}
          {tab === 'active' && row.status === 'done' && (
            <span className="dsv-pill" data-status="done">
              {t('status.done')}
            </span>
          )}
        </button>
        {!manage && <div className="dsv-rowActions">{renderActions(row)}</div>}
      </div>
    );
  };

  const toggleSection = (key) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderSection = (key, title, rows, selectable = false, path = '') => {
    if (rows.length === 0) return null;
    const ids = rows.map((row) => row.session.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedSet.has(id));
    const collapsed = collapsedSections.has(key);
    return (
      <section className="dsv-section" key={key}>
        <div className="dsv-sectionHead">
          <button
            type="button"
            className="dsv-sectionToggle"
            aria-expanded={!collapsed}
            onClick={() => toggleSection(key)}
          >
            <span className="dsv-sectionChevron" data-collapsed={collapsed} aria-hidden="true">
              <ChevronDownIcon size={12} />
            </span>
            <span className="dsv-sectionTitleWrap">
              <span className="dsv-sectionTitle">{title}</span>
              {path ? <code className="dsv-sectionPath" title={path}>{path}</code> : null}
            </span>
            <span className="dsv-sectionCount">{rows.length}</span>
          </button>
          {selectable && (
            <button
              type="button"
              className="dsv-sectionSelect"
              onClick={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (allSelected) ids.forEach((id) => next.delete(id));
                  else ids.forEach((id) => next.add(id));
                  return [...next];
                })
              }
            >
              {allSelected ? t('select.clear') : t('select.group')}
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="dsv-list" role="list" aria-label={title}>
            {rows.map(renderRow)}
          </div>
        )}
      </section>
    );
  };

  const buildWorkspaceSections = (rows) => {
    const buckets = new Map();
    for (const row of rows) {
      const workspace = row.workspace;
      const key = workspace?.workspaceId ?? '__none';
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          title: workspace ? workspaceLabel(workspace) : t('workspace.unknown'),
          path: String(workspace?.path ?? ''),
          rows: [],
        });
      }
      buckets.get(key).rows.push(row);
    }
    for (const bucket of buckets.values()) {
      bucket.rows.sort((a, b) => Number(pinnedSet.has(b.session.id)) - Number(pinnedSet.has(a.session.id)));
    }
    return [...buckets.values()].sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  };

  const activeWorkspaceSections = buildWorkspaceSections(activeRows);
  const archivedWorkspaceSections = buildWorkspaceSections(archived);
  const trashWorkspaceSections = buildWorkspaceSections(trashed);

  const sectionList =
    tab === 'workspaces' || tab === 'sessionGroups'
      ? []
      : tab === 'archived'
      ? groupWorkspaces
        ? archivedWorkspaceSections.map((group) => [group.key, group.title, group.rows, group.path])
        : [['archived', t('tab.archived'), archived]]
      : tab === 'trash'
        ? groupWorkspaces
          ? trashWorkspaceSections.map((group) => [group.key, group.title, group.rows, group.path])
          : [['trash', t('tab.trash'), trashed]]
        : groupWorkspaces
          ? activeWorkspaceSections.map((group) => [group.key, group.title, group.rows, group.path])
          : status === ALL
            ? [
                ['pinned', t('section.pinned'), sections.pinned],
                ['running', t('section.running'), sections.running],
                ['pending', t('section.pending'), sections.pending],
                ['done', t('section.done'), sections.done],
                ['idle', t('section.idle'), sections.idle],
              ]
            : [['all', t('section.all'), activeRows]];

  const tabCounts = {
    active: annotated.length,
    archived: archived.length,
    trash: trashed.length,
    sessionGroups: sessionGroupTree.length,
    workspaceGroups: prefs.workspaceGroups?.length ?? 0,
    workspaces: workspaces?.items?.length ?? 0,
  };

  const sectionKeys = sectionList.map(([key]) => key);
  const allCollapsed = sectionKeys.length > 0 && sectionKeys.every((key) => collapsedSections.has(key));

  const emptyNode = (() => {
    if (tab === 'trash') {
      if (trash.state === 'loading') return <p className="dsv-emptyHint">{t('loading')}</p>;
      if (trash.state === 'error') {
        return (
          <>
            <p className="dsv-emptyTitle">{t('error.trash')}</p>
            <p className="dsv-emptyHint">{trash.error}</p>
            <button type="button" className="dsv-clear" onClick={loadTrash}>
              {t('loading')}
            </button>
          </>
        );
      }
      return <p className="dsv-emptyTitle">{t('trash.empty')}</p>;
    }
    if (tab === 'archived') return <p className="dsv-emptyTitle">{t('archived.empty')}</p>;
    return (
      <>
        <p className="dsv-emptyTitle">
          {annotated.length === 0 ? t('empty.title') : t('empty.filtered')}
        </p>
        <p className="dsv-emptyHint">{t('empty.hint')}</p>
        {filtersActive && (
          <button type="button" className="dsv-clear" onClick={clearFilters}>
            {t('empty.clear')}
          </button>
        )}
      </>
    );
  })();

  const empty =
    tab === 'workspaces'
      ? false
      : tab === 'active'
        ? activeRows.length === 0
        : tab === 'archived'
          ? archived.length === 0
          : trashed.length === 0;

  const sessionDragRef = useRef(null);

  const orderSessionItems = (items, orderKey) => {
    const order = prefs.sessionGroupOrders?.[orderKey];
    if (!order?.length) return items;
    const rank = new Map(order.map((id, index) => [id, index]));
    return [...items].sort((a, b) => {
      const ai = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bi = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  };

  const assignSessionTo = (sessionId, groupId, beforeId, after = false) => {
    if (!sessionId) return;
    const assignments = { ...(prefs.sessionAssignments ?? {}) };
    if (groupId) assignments[sessionId] = groupId;
    else delete assignments[sessionId];
    const orderKey = groupId ?? '__root';
    const orders = { ...(prefs.sessionGroupOrders ?? {}) };
    for (const key of Object.keys(orders)) {
      if (key !== orderKey && orders[key]?.includes(sessionId)) {
        orders[key] = orders[key].filter((id) => id !== sessionId);
      }
    }
    const base = (orders[orderKey] ?? []).filter((id) => id !== sessionId);
    if (beforeId && beforeId !== sessionId) {
      const at = base.indexOf(beforeId);
      if (at >= 0) base.splice(after ? at + 1 : at, 0, sessionId);
      else base.push(sessionId);
    } else {
      base.push(sessionId);
    }
    orders[orderKey] = base;
    setPrefs({ sessionAssignments: assignments, sessionGroupOrders: orders });
  };

  const collapsedSessionGroups = collapsedSections;
  const sessionGroupSections = sessionGroupTree.map((group) => ({
    ...group,
    items: orderSessionItems(filteredGroupItems.filter((item) => sessionAssignments[item.id] === group.id), group.id),
  }));
  const ungroupedSessionItems = orderSessionItems(filteredGroupItems.filter(
    (item) => !item.id || !sessionGroupTree.some((group) => group.id === sessionAssignments[item.id]),
  ), '__root');

  const renderGroupSessionRow = (item) => (
    <div
      className="dsv-groupSession"
      key={item.id}
      draggable
      onDragStart={(event) => {
        sessionDragRef.current = item.id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
        event.currentTarget.classList.add('dsv-dragSource');
      }}
      onDragOver={(event) => {
        if (!sessionDragRef.current || sessionDragRef.current === item.id) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        const from = sessionDragRef.current;
        if (!from || from === item.id) return;
        event.preventDefault();
        event.stopPropagation();
        sessionDragRef.current = null;
        const groupId = sessionGroupTree.some((group) => group.id === sessionAssignments[item.id])
          ? sessionAssignments[item.id]
          : null;
        const rect = event.currentTarget.getBoundingClientRect();
        assignSessionTo(from, groupId, item.id, event.clientY > rect.top + rect.height / 2);
        event.currentTarget.classList.remove('dsv-dragSource');
      }}
      onDragEnd={(event) => {
        sessionDragRef.current = null;
        event.currentTarget.classList.remove('dsv-dragSource');
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setSessionMenu({ itemId: item.id, x: event.clientX, y: event.clientY });
      }}
    >
      <button type="button" className="dsv-groupSessionOpen" onClick={() => openSession(item.id)} title={item.title}>
        <span className="dsv-groupSessionTitle">{item.title}</span>
        <span className="dsv-groupSessionMeta">{item.workspace}</span>
      </button>
      <select
        className="dsv-select dsv-groupSessionSelect"
        value={sessionAssignments[item.id] ?? ''}
        aria-label={t('groups.assign')}
        onChange={(event) => assignSession(item.id, event.target.value)}
      >
        <option value="">{t('group.ungrouped')}</option>
        {sessionGroupTree.map((group) => (
          <option key={group.id} value={group.id}>
            {group.depth > 0 ? `${'—'.repeat(group.depth)} ` : ''}{group.name}
          </option>
        ))}
      </select>
    </div>
  );

  const renderSessionGroupBlock = (key, label, depth, items, groupId = null) => {
    const collapsed = collapsedSessionGroups.has(key);
    return (
      <div
        className="dsv-groupBlock"
        key={key}
        onDragOver={(event) => {
          if (!sessionDragRef.current) return;
          event.preventDefault();
          event.currentTarget.classList.add('dsv-dropTarget');
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          event.currentTarget.classList.remove('dsv-dropTarget');
        }}
        onDrop={(event) => {
          const from = sessionDragRef.current;
          if (!from) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.classList.remove('dsv-dropTarget');
          sessionDragRef.current = null;
          assignSessionTo(from, groupId, null);
        }}
      >
        <button
          type="button"
          className="dsv-groupBlockHead"
          aria-expanded={!collapsed}
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => toggleSection(key)}
        >
          <span className="dsv-sectionChevron" data-collapsed={collapsed || undefined}>
            <ChevronRightIcon size={12} />
          </span>
          <span className="dsv-groupBlockName">{label}</span>
          {(() => {
            const status = groupStatus(items);
            return status ? (
              <span className={`dsv-groupStatusMark dsv-groupStatusMark--${status}`} title={t(statusLabelKey(status))}>
                <span className="dsv-dot" data-status={status} />
              </span>
            ) : null;
          })()}
          <span className="dsv-groupBlockCount">{items.length}</span>
        </button>
        {!collapsed && (
          items.length === 0
            ? <p className="dsv-groupEmpty">{t('groups.empty')}</p>
            : items.map(renderGroupSessionRow)
        )}
      </div>
    );
  };

  const sessionGroupsPage = (
    <section className="dsv-groupsPage" aria-label={t('tab.sessionGroups')}>
      <div className="dsv-groupsHead">
        <div>
          <h2 className="dsv-groupsTitle">{t('groups.title')}</h2>
          <p className="dsv-groupsHint">{t('groups.hint')}</p>
        </div>
        <button type="button" className="dsv-btn" onClick={() => setGroupDialog(true)}>
          {t('groups.manage')}
        </button>
      </div>
      <input
        className="dsv-input dsv-groupsSearch"
        value={groupsQuery}
        placeholder={t('groups.search')}
        aria-label={t('groups.search')}
        onChange={(event) => setGroupsQuery(event.target.value)}
      />
      <div className="dsv-groupsList">
        {sessionGroupSections.map((group) => renderSessionGroupBlock(`g:${group.id}`, group.name, group.depth, group.items, group.id))}
        {true && (
          <div
            className={`dsv-groupRootRows${ungroupedSessionItems.length === 0 ? ' dsv-groupRootEmpty' : ''}`}
            aria-label={t('group.ungrouped')}
            onDragOver={(event) => {
              if (!sessionDragRef.current) return;
              event.preventDefault();
              event.currentTarget.classList.add('dsv-dropTarget');
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget)) return;
              event.currentTarget.classList.remove('dsv-dropTarget');
            }}
            onDrop={(event) => {
              const from = sessionDragRef.current;
              if (!from) return;
              event.preventDefault();
              event.currentTarget.classList.remove('dsv-dropTarget');
              sessionDragRef.current = null;
              assignSessionTo(from, null, null);
            }}
          >
            {ungroupedSessionItems.map(renderGroupSessionRow)}
          </div>
        )}
        {sessionGroupTree.length === 0 && ungroupedSessionItems.length === 0 && (
          <p className="dsv-groupEmpty">{t('groups.empty')}</p>
        )}
      </div>
    </section>
  );

  const workspaceGroupsPage = (
    <section className="dsv-groupsPage dsv-groupsEmbedded">
      <div className="dsv-groupsHead">
        <h2 className="dsv-groupsTitle">{t('groups.workspaceTitle')}</h2>
        <p className="dsv-groupsHint">{t('groups.workspaceHint')}</p>
      </div>
      <WorkspaceGroupsDialog
        t={t}
        prefs={prefs}
        workspaces={workspaces}
        onChange={setPrefs}
        onClose={() => {}}
        embedded
      />
    </section>
  );

  const workspaceFilterPage = (
    <section className="dsv-wsPage" aria-label={t('tab.workspaces')}>
      <div className="dsv-wsIntro">
        <h2 className="dsv-wsTitle">{t('workspaceFilter.title')}</h2>
        <p className="dsv-wsHint">{t('workspaceFilter.hint')}</p>
      </div>
      <div className="dsv-wsTools">
        <label className="dsv-wsShowToggle">
          <span>{t('settings.showWorkspaces')}</span>
          <input
            className="dsv-switch"
            type="checkbox"
            role="switch"
            checked={prefs.showWorkspaces}
            aria-label={t('settings.showWorkspaces')}
            onChange={(event) => setPrefs({ showWorkspaces: event.target.checked })}
          />
        </label>
        {hiddenWorkspaceIds.length > 0 ? (
          <button
            type="button"
            className="dsv-btn"
            onClick={() => setPrefs({ hiddenWorkspaceIds: [] })}
          >
            {t('settings.workspaceFilterReset')}
          </button>
        ) : null}
      </div>
      <div className="dsv-wsList" role="list">
        <button
          type="button"
          className="dsv-wsRow dsv-wsRowAll"
          role="listitem"
          data-active={workspaceId === ALL ? 'true' : 'false'}
          aria-pressed={workspaceId === ALL}
          onClick={() => {
            setWorkspaceId(ALL);
            setTab('active');
          }}
        >
          <span className="dsv-wsMain">
            <span className="dsv-wsName">{t('filter.allWorkspaces')}</span>
            <span className="dsv-wsPath">{t('workspaceFilter.allHint')}</span>
          </span>
          <span className="dsv-wsCount">{t('counts.summary', { n: annotated.length })}</span>
        </button>
        {filterWorkspaceItems.map((workspace) => {
          const id = workspace?.workspaceId;
          const path = String(workspace?.path ?? '');
          const title = String(workspace?.title || path || id || '');
          const hidden = hiddenWorkspaceSet.has(id);
          return (
            <div
              className="dsv-wsRow"
              role="listitem"
              key={id ?? path}
              data-active={workspaceId === id ? 'true' : 'false'}
              data-hidden={hidden ? 'true' : 'false'}
            >
              <button
                type="button"
                className="dsv-wsMain dsv-wsApply"
                aria-pressed={workspaceId === id}
                title={t('filter.applyWorkspace')}
                onClick={() => {
                  setWorkspaceId(id);
                  setQuery('');
                  setStatus(ALL);
                  setTab('active');
                }}
              >
                <span className="dsv-wsName" title={title}>{title}</span>
                {path ? <code className="dsv-wsPath" title={path}>{path}</code> : null}
              </button>
              <span className="dsv-wsCount">{t('counts.summary', { n: workspace?.sessionIds?.length ?? 0 })}</span>
              <input
                className="dsv-switch"
                type="checkbox"
                role="switch"
                checked={!hidden}
                aria-label={t('settings.workspaceShow', { name: title })}
                onChange={() => toggleWorkspaceVisibility(id)}
              />
            </div>
          );
        })}
        {filterWorkspaceItems.length === 0 ? (
          <p className="dsv-wsEmpty">{t('settings.workspaceFilterEmpty')}</p>
        ) : null}
      </div>
    </section>
  );

  const confirmCopy = confirm ? CONFIRM_COPY[confirm.kind] : null;

  return (
    <div
      className="dsv-page"
      aria-busy={busy || undefined}
      onWheel={(event) => {
        if (event.target.closest('.dsv-scroll, .dsv-dialog, .dsv-toast')) return;
        const scroller = event.currentTarget.querySelector('.dsv-scroll');
        if (scroller) scroller.scrollTop += event.deltaY;
      }}
    >
      <style>{STYLES}</style>
      <div className="dsv-scroll">
      <div className="dsv-content">
        <header className="dsv-head">
          <div className="dsv-heading">
            <h1 className="dsv-title">{t('title')}</h1>
            <p className="dsv-subtitle">{t('subtitle')}</p>
          </div>
          {tab !== 'settings' && (
            <span className="dsv-total" aria-live="polite">
              {tab === 'workspaces'
                ? t('counts.workspaces', { n: tabCounts.workspaces })
                : tab === 'sessionGroups'
                  ? t('counts.groups', { n: tabCounts.sessionGroups })
                  : tab === 'workspaceGroups'
                    ? t('counts.groups', { n: tabCounts.workspaceGroups })
                    : t('counts.summary', { n: tabCounts[tab] })}
            </span>
          )}
        </header>

        <nav className="dsv-tabs" role="tablist" aria-label={t('title')}>
          {TABS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              className="dsv-tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
            >
              {t(`tab.${value}`)}
              {value !== 'workspaces' && <span className="dsv-tabCount">{tabCounts[value]}</span>}
            </button>
          ))}
        </nav>

        {tab !== 'workspaces' && tab !== 'sessionGroups' && tab !== 'workspaceGroups' && (
        <div className="dsv-toolbar">
          <div className="dsv-search">
            <span className="dsv-searchIcon">
              <SearchIcon />
            </span>
            <input
              className="dsv-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.label')}
              spellCheck={false}
            />
          </div>
          <div className="dsv-selectWrap">
            <select
              className="dsv-select"
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              aria-label={t('filter.workspace')}
            >
              <option value={ALL}>{t('filter.allWorkspaces')}</option>
              {workspaceOptions.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.label}
                </option>
              ))}
            </select>
            <span className="dsv-chevron">
              <ChevronDownIcon />
            </span>
          </div>
          <div className="dsv-selectWrap">
            <select
              className="dsv-select"
              value={groupWorkspaces ? 'workspace' : 'status'}
              onChange={(event) => setGroupWorkspaces(event.target.value === 'workspace')}
              aria-label={t('filter.group')}
            >
              <option value="workspace">{t('manage.byWorkspace')}</option>
              <option value="status">{t('manage.byStatus')}</option>
            </select>
            <span className="dsv-chevron">
              <ChevronDownIcon />
            </span>
          </div>
          <div className="dsv-toolbarActions">
            <button type="button" className="dsv-btn" disabled={busy} onClick={runCheck}>
              {t('action.check')}
            </button>
            <button
              type="button"
              className="dsv-btn"
              disabled={sectionKeys.length === 0}
              onClick={() => setCollapsedSections(allCollapsed ? new Set() : new Set(sectionKeys))}
            >
              {t(allCollapsed ? 'action.expandAll' : 'action.collapseAll')}
            </button>
            <button
              type="button"
              className="dsv-btn"
              aria-pressed={manage}
              onClick={() => {
                setManage((prev) => !prev);
                setSelected([]);
              }}
            >
              {t(manage ? 'manage.done' : 'manage.start')}
            </button>
          </div>
        </div>
        )}

        {tab === 'active' && (
          <div className="dsv-chips" role="group" aria-label={t('filter.status')}>
            {[ALL, ...STATUS_LIST].map((value) => (
              <button
                key={value}
                type="button"
                className="dsv-chip"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {value !== ALL && <span className="dsv-dot" data-status={value} aria-hidden="true" />}
                <span>{value === ALL ? t('counts.all') : t(statusLabelKey(value))}</span>
                <span className="dsv-chipCount">{counts[value] ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        {manage && tab !== 'workspaces' && tab !== 'sessionGroups' && tab !== 'workspaceGroups' && (
          <div className="dsv-batch">
            <span className="dsv-batchText">{t('select.count', { n: selected.length })}</span>
            <button
              type="button"
              className="dsv-btn"
              onClick={() =>
                setSelected(allSelected ? [] : tabIds.filter((id) => !selectedSet.has(id)).concat(selected))
              }
            >
              {allSelected ? t('select.clear') : t('select.all')}
            </button>
            {tab === 'active' && (
              <>
                <button
                  type="button"
                  className="dsv-btn"
                  disabled={selected.length === 0}
                  onClick={() =>
                    requestConfirm(
                      'archive',
                      activeRows.filter((row) => selectedSet.has(row.session.id)),
                    )
                  }
                >
                  {t('batch.archive')}
                </button>
                <button
                  type="button"
                  className="dsv-btn"
                  data-tone="danger"
                  disabled={selected.length === 0}
                  onClick={() =>
                    requestConfirm(
                      'trash',
                      activeRows.filter((row) => selectedSet.has(row.session.id)),
                    )
                  }
                >
                  {t('batch.trash')}
                </button>
              </>
            )}
            {tab === 'archived' && (
              <>
                <button
                  type="button"
                  className="dsv-btn"
                  disabled={selected.length === 0}
                  onClick={() => restoreMany(selected)}
                >
                  {t('batch.restore')}
                </button>
                <button
                  type="button"
                  className="dsv-btn"
                  data-tone="danger"
                  disabled={selected.length === 0}
                  onClick={() => requestConfirm('trash', archived.filter((row) => selectedSet.has(row.session.id)))}
                >
                  {t('batch.trash')}
                </button>
              </>
            )}
            {tab === 'trash' && (
              <>
                <button
                  type="button"
                  className="dsv-btn"
                  disabled={selected.length === 0}
                  onClick={() => restoreFromTrash(selected)}
                >
                  {t('batch.restore')}
                </button>
                <button
                  type="button"
                  className="dsv-btn"
                  data-tone="danger"
                  disabled={selected.length === 0}
                  onClick={() => {
                    const rows = trashed.filter((row) => selectedSet.has(row.session.id));
                    requestConfirm('purge', rows);
                  }}
                >
                  {t('batch.purge')}
                </button>
                <button
                  type="button"
                  className="dsv-btn"
                  data-tone="danger"
                  disabled={selected.length === 0}
                  onClick={() => {
                    const rows = trashed.filter((row) => selectedSet.has(row.session.id));
                    requestConfirm('forcePurge', rows);
                  }}
                >
                  {t('batch.forcePurge')}
                </button>
              </>
            )}
          </div>
        )}

        {workspaces?.state === 'error' && <div className="dsv-banner">{t('error.workspaces')}</div>}

        {tab === 'workspaces' ? (
          workspaceFilterPage
        ) : tab === 'sessionGroups' ? (
          sessionGroupsPage
        ) : tab === 'workspaceGroups' ? (
          workspaceGroupsPage
        ) : empty ? (
          <div className="dsv-empty">{emptyNode}</div>
        ) : (
          sectionList.map(([key, title, rows, path]) => renderSection(key, title, rows, manage && groupWorkspaces && tab === 'active', path))
        )}
      </div>
      </div>

      {confirm && confirmCopy && (
        <div className="dsv-dialogOverlay" role="presentation">
          <div className="dsv-dialog" role="dialog" aria-modal="true" aria-labelledby="dsv-dialog-title">
            <h2 className="dsv-dialogTitle" id="dsv-dialog-title">
              {t(confirmCopy.title)}
            </h2>
            <p className="dsv-dialogBody">{t(confirmCopy.body, { n: confirm.ids.length })}</p>
            {confirmCopy.warning && <p className="dsv-dialogWarning">{t(confirmCopy.warning)}</p>}
            <div className="dsv-dialogActions">
              <button type="button" className="dsv-btn" onClick={() => setConfirm(null)}>
                {t('confirm.cancel')}
              </button>
              <button
                type="button"
                className="dsv-btn"
                data-tone={confirmCopy.tone === 'danger' ? 'danger' : undefined}
                onClick={runConfirmed}
              >
                {t('confirm.ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {groupDialog && (
        <SessionGroupsDialog
          t={t}
          prefs={prefs}
          sessions={sessionGroupItems}
          onChange={(patch) => setPrefs(patch)}
          onClose={() => setGroupDialog(false)}
        />
      )}

      {toast && (
        <div className="dsv-toast" role="status" data-tone={toast.tone}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
