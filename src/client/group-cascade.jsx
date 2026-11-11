import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCascadeTree } from './group-tree.js';

/**
 * Cascading "move to group" submenu: hovering an item opens the next level to
 * its right, so nested groups become third/fourth-level fly-outs.
 */
export function GroupCascade({ t, groups = [], excludeIds = [], onPick, rootLabel, onRoot }) {
  const [path, setPath] = useState([]);
  const closeTimer = useRef(null);
  const children = useMemo(() => buildCascadeTree(groups, excludeIds), [groups, excludeIds]);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  // Give the pointer time to travel diagonally across the gap into the next
  // fly-out; without the delay a slightly diagonal move lands on neither menu
  // and drops the whole chain.
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setPath([]);
    }, 220);
  };

  useEffect(() => cancelClose, []);

  const openChild = (level, group, event) => {
    if (!(children.get(group.id) ?? []).length) {
      setPath((prev) => prev.slice(0, level + 1));
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setPath((prev) => {
      const next = prev.slice(0, level + 1);
      next[level + 1] = { id: group.id, left: rect.right + 2, top: rect.top };
      return next;
    });
  };

  return (
    <div className="dsv-cascade" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <div
        className="dsv-menuCascadeItem"
        role="menuitem"
        onMouseEnter={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPath([{ left: rect.right + 2, top: rect.top }]);
        }}
      >
        <span>{t('action.moveToGroup')}</span>
        <span className="dsv-menuArrow" aria-hidden="true">▸</span>
      </div>
      {path.map((position, level) => {
        const parentId = path[level]?.id ?? null;
        const items = children.get(parentId) ?? [];
        return (
          <div key={level} className="dsv-menu dsv-submenu" style={{ left: position.left, top: position.top }}>
            {level === 0 && rootLabel && (
              <button type="button" role="menuitem" onClick={() => { setPath([]); onRoot?.(); }}>
                {rootLabel}
              </button>
            )}
            {items.map((group) => {
              const hasChildren = (children.get(group.id) ?? []).length > 0;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="menuitem"
                  className={hasChildren ? 'dsv-menuHasSub' : undefined}
                  onMouseEnter={(event) => { cancelClose(); openChild(level, group, event); }}
                  onClick={() => { setPath([]); onPick?.(group.id); }}
                >
                  <span>{group.name}</span>
                  {hasChildren && <span className="dsv-menuArrow" aria-hidden="true">▸</span>}
                </button>
              );
            })}
            {items.length === 0 && <div className="dsv-menuEmpty">{t('groups.emptyGroups')}</div>}
          </div>
        );
      })}
    </div>
  );
}
