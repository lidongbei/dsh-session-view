/** Shared modal dialogs for the sidebar pane and the focus-mode manager. */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function Dialog({ title, children, onClose, footer }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return createPortal(
    <div className="dsv-dialogOverlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dsv-dialog" role="dialog" aria-modal="true" aria-labelledby="dsv-side-dialog-title">
        <div className="dsv-dialogHead">
          <h2 id="dsv-side-dialog-title">{title}</h2>
        </div>
        <div className="dsv-dialogBody">{children}</div>
        <div className="dsv-dialogFoot">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

export function PromptDialog({ t, title, label, initial = '', busy, browse, onSubmit, onClose }) {
  const [value, setValue] = useState(initial);
  const [picked, setPicked] = useState('');
  const effective = picked || value;
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dsv-btn" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button
            type="button"
            className="dsv-btn"
            data-tone="primary"
            disabled={busy || !effective.trim()}
            onClick={() => onSubmit(effective.trim())}
          >
            {t('dialog.save')}
          </button>
        </>
      }
    >
      <label className="dsv-sideField">
        <span>{label}</span>
        <span className="dsv-sidePathRow">
          <input
            autoFocus
            value={effective}
            onChange={(event) => {
              setPicked('');
              setValue(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && effective.trim()) onSubmit(effective.trim());
            }}
          />
          {browse && (
            <button
              type="button"
              className="dsv-btn"
              onClick={async () => {
                const path = await browse();
                if (path) setPicked(path);
              }}
            >
              {t('dialog.addWorkspace.browse')}
            </button>
          )}
        </span>
      </label>
      {browse && <p className="dsv-sideHint">{t('dialog.addWorkspace.hint')}</p>}
    </Dialog>
  );
}

export function ConfirmDialog({ t, title, body, confirmKey, tone = 'danger', busy, onConfirm, onClose }) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dsv-btn" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="button" className="dsv-btn" data-tone={tone} disabled={busy} onClick={onConfirm}>
            {t(confirmKey)}
          </button>
        </>
      }
    >
      <p>{body}</p>
    </Dialog>
  );
}
