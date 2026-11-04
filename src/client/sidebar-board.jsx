import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { LayoutIcon } from './icons.jsx';
import { STYLES } from './styles.js';
import { SidebarWorkspacePane } from './sidebar-workspace.jsx';
import { getPrefs, setPrefs, subscribePrefs } from './prefs.js';

const NARROW_WIDTH = 150;

function usePrefs() {
  return useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);
}

/**
 * Sidebar footer action that also hosts the session pane.
 *
 * The top-level panel menu is gone, so nothing in `sidebar.panellist` mounts
 * this plugin. The footer action is the one stable mount point: it renders the
 * mode switch and portals the full session pane after the panel nav, hiding
 * the native workspace region while the session mode is active. Keeping the
 * native browser mounted makes "switch back to native" instant and lossless.
 */
export function SidebarHost({
  wide,
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
    if (!anchor) return undefined;

    // The footer lives in the sidebar's last row, not inside the panel nav.
    // Walk up until this subtree owns the nav, then anchor the pane directly
    // after that nav and before the native workspace region.
    let root = anchor;
    let nav = null;
    while (root && !(nav = root.querySelector?.('nav'))) root = root.parentElement;
    if (!nav || !nav.parentElement) return undefined;

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

  const next = prefs.mode === 'session' ? 'native' : 'session';
  const label = prefs.mode === 'session' ? t('side.native') : t('side.sessionView');

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={wide ? 'dsv-footBtn' : 'dsv-footIcon'}
        aria-label={t(prefs.mode === 'session' ? 'side.switch.native' : 'side.switch.session')}
        title={label}
        onClick={() => setPrefs({ mode: next })}
      >
        <LayoutIcon size={16} />
        {wide && <span>{label}</span>}
      </button>
      {active &&
        createPortal(
          <div
            className="dsv-workarea"
            onClick={(event) => {
              // Portal React events still bubble through the footer row.
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
