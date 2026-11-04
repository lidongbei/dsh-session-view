import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  STATUS_LIST,
  annotateRows,
  archivedRows,
  buildCandidates,
  buildRows,
  countByStatus,
  filterRows,
  formatRelativeTime,
  matchesQuery,
  pendingLabelKey,
  splitSections,
  statusLabelKey,
  trashRows,
  workspaceLabel,
} from './logic.js';
import { addToTrash, fetchTrash, purgeTrash, restoreTrash } from './api.js';
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
  const sessions = useSessions((state) => state);
  const statuses = useSessionStatus((state) => state);
  const workspaces = useWorkspaces((state) => state);

  const [tab, setTab] = useState('active');
  const [query, setQuery] = useState('');
  const [workspaceId, setWorkspaceId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [now, setNow] = useState(() => Date.now());
  const [manage, setManage] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [trash, setTrash] = useState({ state: 'idle', items: [], error: null });

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
    if (tab === 'trash') loadTrash();
  }, [tab, loadTrash]);

  useEffect(() => {
    setSelected([]);
    setManage(false);
  }, [tab]);

  const annotated = useMemo(() => {
    if (!sessions || !workspaces) return [];
    const candidates = buildCandidates(sessions, workspaces.archivedSessionIds);
    const rows = buildRows(candidates, sessions.byId ?? {}, workspaces);
    // Keep descendant rows long enough to count running children, then drop
    // them: subagent sessions are execution detail, not management rows.
    return annotateRows(rows, statuses).filter((row) => row.session.origin !== 'subagent');
  }, [sessions, statuses, workspaces]);

  const workspaceOptions = useMemo(() => {
    const byWorkspace = new Map();
    for (const row of annotated) {
      const workspace = row.workspace;
      if (!workspace?.workspaceId) continue;
      if (!byWorkspace.has(workspace.workspaceId)) {
        byWorkspace.set(workspace.workspaceId, workspaceLabel(workspace) || workspace.workspaceId);
      }
    }
    return Array.from(byWorkspace, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [annotated]);

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
    const rows = archivedRows(sessions, workspaces?.archivedSessionIds).filter(
      (row) => row.session.origin !== 'subagent',
    );
    return rows.filter((row) => matchesQuery(row, query));
  }, [sessions, workspaces?.archivedSessionIds, query]);
  const trashed = useMemo(() => {
    const rows = trashRows(trash.items, sessions?.byId).filter((row) => row.session.origin !== 'subagent');
    return rows.filter((row) => matchesQuery(row, query));
  }, [trash.items, sessions?.byId, query]);

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

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const togglePin = async (row) => {
    const id = row.session.id;
    const pinned = pinnedSet.has(id);
    setBusy(true);
    try {
      await (pinned ? unpinSession(id) : pinSession(id));
      setToast({ text: t(pinned ? 'toast.unpinned' : 'toast.pinned'), tone: 'info' });
    } catch (error) {
      setToast({ text: t('toast.failed', { message: errorText(error) }), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const archiveMany = async (ids) => {
    const results = await Promise.allSettled(ids.map((id) => archiveSession(id)));
    const failures = results
      .map((result, index) => (result.status === 'rejected' ? { id: ids[index], error: result.reason } : null))
      .filter(Boolean);
    const ok = ids.length - failures.length;
    notify(failures.length === ids.length ? '' : t('toast.archived', { n: ok }), failures, ok);
    setSelected([]);
  };

  const trashMany = async (rows) => {
    const ids = rows.map((row) => row.session.id);
    const archived = await Promise.allSettled(rows.map((row) => archiveSession(row.session.id)));
    const failures = archived
      .map((result, index) => (result.status === 'rejected' ? { sessionId: ids[index], error: result.reason } : null))
      .filter(Boolean);
    const ready = rows.filter((_, index) => archived[index].status === 'fulfilled');
    if (ready.length > 0) {
      try {
        const result = await addToTrash(
          ready.map((row) => ({
            sessionId: row.session.id,
            title: row.session.displayTitle || row.session.title || '',
            cwd: row.session.cwd || '',
          })),
        );
        if (Array.isArray(result.failed)) failures.push(...result.failed);
        const ok = result.added ?? ready.length - (result.failed?.length ?? 0);
        notify(ok === 0 ? '' : t('toast.trashed', { n: ok }), failures, ok);
        await loadTrash();
      } catch (error) {
        failures.push({ error });
        notify('', failures);
      }
    } else {
      notify('', failures);
    }
    setSelected([]);
  };

  const restoreMany = async (ids) => {
    const results = await Promise.allSettled(ids.map((id) => unarchiveSession(id)));
    const failures = results.filter((result) => result.status === 'rejected');
    const ok = ids.length - failures.length;
    notify(ok === 0 ? '' : t('toast.restored', { n: ok }), failures, ok);
    if (tab === 'trash') await loadTrash();
    setSelected([]);
  };

  const restoreFromTrash = async (ids) => {
    try {
      const result = await restoreTrash(ids);
      const failures = Array.isArray(result.failed) ? result.failed : [];
      const ok = result.restored ?? ids.length - failures.length;
      notify(ok === 0 ? '' : t('toast.restored', { n: ok }), failures, ok);
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
    const meta = tab === 'trash' ? t('trash.deletedAt', { time: timeLabel }) : `${workspaceName} · ${timeLabel}`;

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
          title={tab === 'active' ? t('row.open', { title: row.title }) : row.title}
        >
          {tab !== 'trash' && <span className="dsv-status" data-status={row.status} aria-hidden="true" />}
          <span className="dsv-main">
            <span className="dsv-rowTitle">
              {pinned && tab === 'active' && (
                <span className="dsv-boardPin">
                  <PinIcon size={10} />
                </span>
              )}
              {row.title}
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

  const renderSection = (key, titleKey, rows) => {
    if (rows.length === 0) return null;
    return (
      <section className="dsv-section" key={key}>
        <div className="dsv-sectionHead">
          <h2 className="dsv-sectionTitle">{t(titleKey)}</h2>
          <span className="dsv-sectionCount">{rows.length}</span>
        </div>
        <div className="dsv-list" role="list" aria-label={t(titleKey)}>
          {rows.map(renderRow)}
        </div>
      </section>
    );
  };

  const sectionList =
    tab !== 'active'
      ? []
      : status === ALL
        ? [
            ['pinned', 'section.pinned', sections.pinned],
            ['running', 'section.running', sections.running],
            ['pending', 'section.pending', sections.pending],
            ['done', 'section.done', sections.done],
            ['idle', 'section.idle', sections.idle],
          ]
        : [['all', 'section.all', activeRows]];

  const tabCounts = {
    active: annotated.length,
    archived: archived.length,
    trash: trash.items.length,
  };

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
    <div className="dsv-page" aria-busy={busy || undefined}>
      <style>{STYLES}</style>
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
          {tab !== 'settings' && (
            <div className="dsv-headActions">
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
              <button
                type="button"
                className="dsv-btn"
                disabled={selected.length === 0}
                onClick={() => restoreMany(selected)}
              >
                {t('batch.restore')}
              </button>
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
          sectionList.map(([key, titleKey, rows]) => renderSection(key, titleKey, rows))
        )}
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
