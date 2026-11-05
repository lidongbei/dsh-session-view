import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  STATUS_LIST,
  annotateRows,
  archivedRows,
  buildCandidates,
  buildRows,
  countByStatus,
  filterRows,
  formatRelativeTime,
  isStaleSessionError,
  matchesQuery,
  pendingLabelKey,
  splitSections,
  statusLabelKey,
  trashRows,
  workspaceLabel,
} from './logic.js';
import { addToTrash, fetchTrash, purgeTrash, restoreTrash } from './api.js';
import { getPrefs, subscribePrefs } from './prefs.js';
import { STYLES } from './styles.js';
import {
  ArchiveIcon,
  ChevronDownIcon,
  PinIcon,
  RestoreIcon,
  SearchIcon,
  TrashIcon,
} from './icons.jsx';

const ALL = 'all';
const TABS = ['active', 'archived', 'trash'];

const CONFIRM_COPY = {
  archive: { title: 'confirm.archive.title', body: 'confirm.archive.body', tone: 'normal' },
  trash: { title: 'confirm.trash.title', body: 'confirm.trash.body', tone: 'normal' },
  purge: {
    title: 'confirm.purge.title',
    body: 'confirm.purge.body',
    warning: 'confirm.purge.warning',
    tone: 'danger',
  },
};

function errorText(error) {
  return String(error?.message ?? error);
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
      setTrash({ state: 'ready', items: Array.isArray(data.items) ? data.items : [], error: null });
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
  const archived = useMemo(() => {
    const all = archivedRows(sessions, workspaces?.archivedSessionIds, workspaces)
      .filter((row) => !trashedIds.has(row.session.id) && !staleIds.has(row.session.id));
    const rows = prefs.showSubagents ? all : all.filter((row) => row.session.origin !== 'subagent');
    return rows.filter((row) => matchesQuery(row, query));
  }, [sessions, workspaces?.archivedSessionIds, query, prefs.showSubagents, trashedIds, staleIds]);
  const trashed = useMemo(() => {
    const all = trashRows(trash.items, sessions?.byId, workspaces);
    const rows = prefs.showSubagents ? all : all.filter((row) => row.session.origin !== 'subagent');
    return rows.filter((row) => matchesQuery(row, query) && !staleIds.has(row.session.id));
  }, [trash.items, sessions?.byId, workspaces, query, prefs.showSubagents, staleIds]);

  const workspaceOptions = useMemo(() => {
    const byWorkspace = new Map();
    const source = tab === 'archived' ? archived : tab === 'trash' ? trashed : annotated;
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
  }, [annotated, archived, trashed, tab]);

  const pinnedSet = useMemo(
    () => new Set(workspaces?.pinnedSessionIds ?? []),
    [workspaces?.pinnedSessionIds],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const tabRows = tab === 'active' ? activeRows : tab === 'archived' ? archived : trashed;
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
      notify(ok === 0 ? '' : t('toast.restored', { n: ok }), failures, ok);
      reportStale(stale);
      await Promise.allSettled(ids.map((id) => unarchiveSession(id)));
      await loadTrash();
    } catch (error) {
      notify('', [{ error }]);
    }
    setSelected([]);
  };

  const purgeMany = async (ids) => {
    try {
      const result = await purgeTrash(ids);
      const failures = Array.isArray(result.failed) ? result.failed : [];
      const ok = result.purged?.length ?? 0;
      notify(ok === 0 ? '' : t('toast.purged', { n: ok }), failures, ok);
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

  const renderSection = (key, title, rows, selectable = false) => {
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
            <span className="dsv-sectionTitle">{title}</span>
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
    tab === 'archived'
      ? groupWorkspaces
        ? archivedWorkspaceSections.map((group) => [group.key, group.title, group.rows])
        : [['archived', t('tab.archived'), archived]]
      : tab === 'trash'
        ? groupWorkspaces
          ? trashWorkspaceSections.map((group) => [group.key, group.title, group.rows])
          : [['trash', t('tab.trash'), trashed]]
        : groupWorkspaces
          ? activeWorkspaceSections.map((group) => [group.key, group.title, group.rows])
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

  const empty = tab === 'active' ? activeRows.length === 0 : tab === 'archived' ? archived.length === 0 : trashed.length === 0;

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
              {t('counts.summary', { n: tabCounts[tab] })}
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
              {value !== 'settings' && <span className="dsv-tabCount">{tabCounts[value]}</span>}
            </button>
          ))}
        </nav>

        {tab !== 'settings' && (
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

        {manage && tab !== 'settings' && (
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
              </>
            )}
          </div>
        )}

        {workspaces?.state === 'error' && <div className="dsv-banner">{t('error.workspaces')}</div>}

        {empty ? (
          <div className="dsv-empty">{emptyNode}</div>
        ) : (
          sectionList.map(([key, title, rows]) => renderSection(key, title, rows, manage && groupWorkspaces && tab === 'active'))
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

      {toast && (
        <div className="dsv-toast" role="status" data-tone={toast.tone}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
