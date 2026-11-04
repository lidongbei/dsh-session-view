import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SessionViewIcon } from './icons.jsx';
import { STYLES } from './styles.js';
import { SidebarWorkspacePane } from './sidebar-workspace.jsx';
import { getPrefs, subscribePrefs } from './prefs.js';

const NARROW_WIDTH = 150;

function usePrefs() {
  return useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);
}

/**
 * Left-sidebar session workspace.
 *
 * The sidebar exposes `sidebar.panellist` for icon entries only, so the pane
 * cannot live in a slot next to the workspace list. Instead this component
 * anchors on the panellist icon, portals a full pane after the icon nav, and
 * hides the native `.regionArea` while the session mode is active. The native
 * browser stays mounted, so switching back is instant and lossless. When the
 * sidebar is collapsed to the icon rail, the native region is restored and
 * the pane is not rendered.
 */
export function SidebarBoardIcon({
  size = 16,
  t,
  useSessions,
  useSessionStatus,
  useWorkspaces,
  ...paneProps
}) {
  const prefs = usePrefs();
  const anchorRef = useRef(null);
  const regionRef = useRef(null);
  const [host, setHost] = useState(null);
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const nav = anchor?.closest?.('nav');
    if (!nav || !nav.parentElement) return undefined;

    // Capture the native workspace region before inserting the portal host,
    // because the host immediately becomes nav.nextElementSibling.
    const region = nav.nextElementSibling;
    regionRef.current = region;

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
      if (region) region.style.display = '';
      node.remove();
      regionRef.current = null;
      setHost(null);
    };
  }, []);

  const active = prefs.mode === 'session' && !narrow && host !== null;

  useLayoutEffect(() => {
    const region = regionRef.current;
    if (host) host.hidden = !active;
    if (!region) return undefined;
    region.style.display = active ? 'none' : '';
    return () => {
      region.style.display = '';
    };
  }, [active, host]);

  return (
    <>
      <span ref={anchorRef} className="dsv-panelIcon">
        <SessionViewIcon size={size} />
      </span>
      {active &&
        createPortal(
          <div
            className="dsv-workarea"
            onClick={(event) => {
              // The pane is portaled out of the panellist row's DOM, but React
              // events still bubble through that row. Without this stop the
              // row's select-panel handler would immediately open the panel.
              event.stopPropagation();
            }}
          >
            <style>{STYLES}</style>
            <SidebarWorkspacePane
              t={t}
              useSessions={useSessions}
              useSessionStatus={useSessionStatus}
              useWorkspaces={useWorkspaces}
              {...paneProps}
            />
          </div>,
          host,
        )}
    </>
  );
}
