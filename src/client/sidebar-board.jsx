import { createPortal } from 'react-dom';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  annotateRows,
  buildCandidates,
  buildRows,
  splitSections,
  topRows,
} from './logic.js';
import { ChevronRightIcon, PinIcon, SessionViewIcon } from './icons.jsx';
import { STYLES } from './styles.js';

const COLLAPSE_KEY = 'dsh-session-view.board.collapsed';
const NARROW_WIDTH = 150;

function readCollapsed() {
  try {
    return globalThis.localStorage?.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value) {
  try {
    globalThis.localStorage?.setItem(COLLAPSE_KEY, value ? '1' : '0');
  } catch {
    /* private mode / quota: the board simply forgets the preference */
  }
}

function BoardGroup({ t, labelKey, tone, rows, openSession, pinned, pinnedSet, togglePin }) {
  if (rows.length === 0) return null;
  return (
    <div className="dsv-boardGroup">
      <div className="dsv-boardGroupTitle">
        {tone && <span className="dsv-dot" data-status={tone} aria-hidden="true" />}
        <span>{t(labelKey)}</span>
        <span>{rows.length}</span>
      </div>
      {rows.map((row) => {
        const isPinned = pinnedSet?.has(row.session.id) ?? false;
        return (
          <div key={row.session.id} className="dsv-boardRow">
            <button
              type="button"
              className="dsv-boardOpen"
              onClick={() => openSession(row.session.id)}
              title={row.title}
            >
              <span className="dsv-dot" data-status={row.status} aria-hidden="true" />
              <span className="dsv-boardRowTitle">{row.title}</span>
            </button>
            {togglePin && (
              <button
                type="button"
                className="dsv-boardAction"
                aria-pressed={isPinned}
                aria-label={t(isPinned ? 'action.unpin' : 'action.pin')}
                title={t(isPinned ? 'action.unpin' : 'action.pin')}
                onClick={() => togglePin(row)}
              >
                <PinIcon size={11} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Sidebar mini-board.
 *
 * The left sidebar exposes `sidebar.panellist` for icon entries only, so a
 * slot cannot render body content next to the workspace list. This component
 * keeps the native list untouched and portals a small board into the sidebar
 * DOM, directly after the panel-icon nav. It hides itself when the sidebar is
 * collapsed to the icon rail.
 */
export function SidebarBoardIcon({
  size = 16,
  t,
  useSessions,
  useSessionStatus,
  useWorkspaces,
  openSession,
  openPanel,
  pinSession,
  unpinSession,
}) {
  const sessions = useSessions?.((state) => state);
  const statuses = useSessionStatus?.((state) => state);
  const workspaces = useWorkspaces?.((state) => state);

  const anchorRef = useRef(null);
  const [host, setHost] = useState(null);
  const [narrow, setNarrow] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const nav = anchor?.closest?.('nav');
    if (!nav || !nav.parentElement) return undefined;

    const node = document.createElement('div');
    node.className = 'dsv-boardHost';
    nav.insertAdjacentElement('afterend', node);
    setHost(node);

    let observer;
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width ?? 0;
        setNarrow(width > 0 && width < NARROW_WIDTH);
      });
      observer.observe(nav.parentElement);
    }

    return () => {
      observer?.disconnect();
      node.remove();
      setHost(null);
    };
  }, []);

  const rows = useMemo(() => {
    if (!sessions || !workspaces) return [];
    const candidates = buildCandidates(sessions, workspaces.archivedSessionIds);
    const built = buildRows(candidates, sessions.byId ?? {}, workspaces);
    return annotateRows(built, statuses);
  }, [sessions, statuses, workspaces]);

  const sections = useMemo(
    () => splitSections(rows, workspaces?.pinnedSessionIds),
    [rows, workspaces?.pinnedSessionIds],
  );

  const pinnedSet = useMemo(
    () => new Set(workspaces?.pinnedSessionIds ?? []),
    [workspaces?.pinnedSessionIds],
  );

  const togglePin = async (row) => {
    const id = row.session.id;
    try {
      await (pinnedSet.has(id) ? unpinSession(id) : pinSession(id));
    } catch {
      /* the panel is the authoritative surface for error details */
    }
  };

  const pinned = topRows(sections.pinned, 3);
  const running = topRows(sections.running, 2);
  const pending = topRows(sections.pending, 2);
  const done = topRows(sections.done, 2);
  const total = pinned.length + running.length + pending.length + done.length;

  const toggle = () => {
    setCollapsed((prev) => {
      writeCollapsed(!prev);
      return !prev;
    });
  };

  return (
    <>
      <span ref={anchorRef} className="dsv-panelIcon">
        <SessionViewIcon size={size} />
      </span>
      {host &&
        !narrow &&
        createPortal(
          <div
            className="dsv-board"
            onClick={(event) => {
              // The board is portaled out of the panellist row's DOM, but React
              // events still bubble through that row. Without this stop the
              // row's select-panel handler would immediately re-open the panel.
              event.stopPropagation();
            }}
          >
            <style>{STYLES}</style>
            <button
              type="button"
              className="dsv-boardHead"
              aria-expanded={!collapsed}
              aria-label={t(collapsed ? 'board.expand' : 'board.collapse')}
              onClick={toggle}
            >
              <span
                className="dsv-boardChevron"
                data-collapsed={collapsed}
                aria-hidden="true"
              >
                <ChevronRightIcon size={11} />
              </span>
              <span className="dsv-boardTitle">{t('board.title')}</span>
              {sections.running.length > 0 && (
                <span className="dsv-boardBadge">
                  <span className="dsv-dot" data-status="running" aria-hidden="true" />
                  {sections.running.length}
                </span>
              )}
              {sections.pending.length > 0 && (
                <span className="dsv-boardBadge">
                  <span className="dsv-dot" data-status="pending" aria-hidden="true" />
                  {sections.pending.length}
                </span>
              )}
              {sections.done.length > 0 && (
                <span className="dsv-boardBadge">
                  <span className="dsv-dot" data-status="done" aria-hidden="true" />
                  {sections.done.length}
                </span>
              )}
            </button>

            {!collapsed && (
              <>
                <div className="dsv-boardBody">
                  {total === 0 ? (
                    <div className="dsv-boardEmpty">{t('board.empty')}</div>
                  ) : (
                    <>
                      <BoardGroup
                        t={t}
                        labelKey="section.pinned"
                        rows={pinned}
                        openSession={openSession}
                        pinned
                        pinnedSet={pinnedSet}
                        togglePin={togglePin}
                      />
                      <BoardGroup
                        t={t}
                        labelKey="section.running"
                        tone="running"
                        rows={running}
                        openSession={openSession}
                        pinnedSet={pinnedSet}
                        togglePin={togglePin}
                      />
                      <BoardGroup
                        t={t}
                        labelKey="section.pending"
                        tone="pending"
                        rows={pending}
                        openSession={openSession}
                        pinnedSet={pinnedSet}
                        togglePin={togglePin}
                      />
                      <BoardGroup
                        t={t}
                        labelKey="section.done"
                        tone="done"
                        rows={done}
                        openSession={openSession}
                        pinnedSet={pinnedSet}
                        togglePin={togglePin}
                      />
                    </>
                  )}
                </div>
                <button type="button" className="dsv-boardMore" onClick={openPanel}>
                  {t('board.more')}
                  <ChevronRightIcon size={11} />
                </button>
              </>
            )}
          </div>,
          host,
        )}
    </>
  );
}
