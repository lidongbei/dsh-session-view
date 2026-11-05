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
    // Start directly below the panel nav. If dsh-ssh renders its remote panel
    // inside the native region, the effect below moves the host under it.
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
    if (!host) return undefined;
    host.hidden = false;
    if (!region) return undefined;

    // The native region is not a pure workspace list: dsh-ssh prepends its
    // remote panel as `.dsh-ssh-sidebar`. Hiding the whole region would take
    // that panel away, so keep it visible and hide only the native browser
    // nodes; our pane then sits right below the SSH panel.
    const HIDDEN = 'data-dsv-native-hidden';

    const restoreRegion = () => {
      for (const node of region.querySelectorAll(`[${HIDDEN}]`)) {
        node.style.display = node.getAttribute(HIDDEN) ?? '';
        node.removeAttribute(HIDDEN);
      }
      region.style.display = '';
      region.style.flex = '';
      region.style.overflow = '';
      region.style.minHeight = '';
      region.style.height = '';
    };

    const apply = () => {
      const nav = region.parentElement?.querySelector('nav') ?? region.previousElementSibling;
      if (!active) {
        restoreRegion();
        host.classList.remove('dsv-boardHost--inline');
        if (nav) nav.insertAdjacentElement('afterend', host);
        host.style.flex = '0 0 auto';
        host.style.height = 'auto';
        return;
      }

      const ssh = region.querySelector(':scope > .dsh-ssh-sidebar');
      if (ssh) {
        if (host.parentElement !== region || host.previousElementSibling !== ssh) {
          region.insertBefore(host, ssh.nextSibling);
        }
        host.classList.add('dsv-boardHost--inline');
        for (const node of region.children) {
          if (node === ssh || node === host || node.hasAttribute(HIDDEN)) continue;
          node.setAttribute(HIDDEN, node.style.display);
          node.style.display = 'none';
        }
        region.style.display = '';
        region.style.flex = '1 1 auto';
        region.style.overflow = 'visible';
        region.style.minHeight = '0';
        region.style.height = 'auto';
        host.style.flex = '1 1 auto';
        host.style.height = 'auto';
        return;
      }

      restoreRegion();
      host.classList.remove('dsv-boardHost--inline');
      if (nav) nav.insertAdjacentElement('afterend', host);
      region.style.display = 'none';
      host.style.flex = '1 1 auto';
      host.style.height = 'auto';
    };

    apply();
    let observer;
    if (typeof MutationObserver === 'function') {
      observer = new MutationObserver(apply);
      observer.observe(region, { childList: true });
    }
    return () => {
      observer?.disconnect();
      restoreRegion();
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
