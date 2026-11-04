import { useSyncExternalStore } from 'react';
import { getPrefs, resetPrefs, setPrefs, subscribePrefs } from './prefs.js';
import { STYLES } from './styles.js';

/**
 * Session view settings inside the system Settings panel.
 *
 * The sidebar and the management page no longer own a settings surface: every
 * preference lives here so it sits next to the rest of the application's
 * settings. `prefs.js` keeps the same localStorage key, so the sidebar reacts
 * immediately to a change made in this section.
 */
export function SessionViewSettings({ t }) {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);

  return (
    <section className="dsv-settings dsv-settingsPage" aria-label={t('settings.nav')}>
      <style>{STYLES}</style>
      <h2 className="dsv-settingsTitle">{t('settings.nav')}</h2>
      <p className="dsv-hint">{t('settings.hint')}</p>
      <p className="dsv-hint">{t('settings.shortcuts')}</p>

      <div className="dsv-settingsGrid">
        <label className="dsv-field">
          <span className="dsv-fieldLabel">{t('settings.mode')}</span>
          <select
            className="dsv-select"
            value={prefs.mode}
            onChange={(event) => setPrefs({ mode: event.target.value })}
          >
            <option value="session">{t('settings.mode.session')}</option>
            <option value="native">{t('settings.mode.native')}</option>
          </select>
        </label>

        <label className="dsv-field">
          <span className="dsv-fieldLabel">{t('settings.activeLimit')}</span>
          <input
            className="dsv-input dsv-number"
            type="number"
            min="0"
            max="50"
            value={prefs.activeLimit}
            onChange={(event) => setPrefs({ activeLimit: event.target.value })}
          />
        </label>

        <label className="dsv-field">
          <span className="dsv-fieldLabel">{t('settings.recentLimit')}</span>
          <input
            className="dsv-input dsv-number"
            type="number"
            min="0"
            max="50"
            value={prefs.recentLimit}
            onChange={(event) => setPrefs({ recentLimit: event.target.value })}
          />
        </label>

        <label className="dsv-field">
          <span className="dsv-fieldLabel">{t('settings.workspaceLimit')}</span>
          <input
            className="dsv-input dsv-number"
            type="number"
            min="0"
            max="50"
            value={prefs.workspaceLimit}
            onChange={(event) => setPrefs({ workspaceLimit: event.target.value })}
          />
        </label>

        <label className="dsv-field">
          <span className="dsv-fieldLabel">{t('settings.sort')}</span>
          <select
            className="dsv-select"
            value={prefs.sort}
            onChange={(event) => setPrefs({ sort: event.target.value })}
          >
            <option value="updated">{t('settings.sort.updated')}</option>
            <option value="manual">{t('settings.sort.manual')}</option>
          </select>
        </label>

        <label className="dsv-field">
          <span className="dsv-fieldLabel">{t('settings.archived')}</span>
          <select
            className="dsv-select"
            value={prefs.archivedFilter}
            onChange={(event) => setPrefs({ archivedFilter: event.target.value })}
          >
            <option value="hide">{t('settings.archived.hide')}</option>
            <option value="show">{t('settings.archived.show')}</option>
            <option value="only">{t('settings.archived.only')}</option>
          </select>
        </label>
      </div>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.showRecent}
          onChange={(event) => setPrefs({ showRecent: event.target.checked })}
        />
        <span>{t('settings.showRecent')}</span>
      </label>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.showPinned}
          onChange={(event) => setPrefs({ showPinned: event.target.checked })}
        />
        <span>{t('settings.showPinned')}</span>
      </label>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.showActive}
          onChange={(event) => setPrefs({ showActive: event.target.checked })}
        />
        <span>{t('settings.showActive')}</span>
      </label>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.showWorkspaces}
          onChange={(event) => setPrefs({ showWorkspaces: event.target.checked })}
        />
        <span>{t('settings.showWorkspaces')}</span>
      </label>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.showSubagents}
          onChange={(event) => setPrefs({ showSubagents: event.target.checked })}
        />
        <span>{t('settings.showSubagents')}</span>
      </label>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.showTimes}
          onChange={(event) => setPrefs({ showTimes: event.target.checked })}
        />
        <span>{t('settings.showTimes')}</span>
      </label>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.compact}
          onChange={(event) => setPrefs({ compact: event.target.checked })}
        />
        <span>{t('settings.compact')}</span>
      </label>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.showIdle}
          onChange={(event) => setPrefs({ showIdle: event.target.checked })}
        />
        <span>{t('settings.showIdle')}</span>
      </label>

      <label className="dsv-toggleRow">
        <input
          type="checkbox"
          checked={prefs.nestWorkspaces}
          onChange={(event) => setPrefs({ nestWorkspaces: event.target.checked })}
        />
        <span>{t('settings.nest')}</span>
      </label>

      <button type="button" className="dsv-btn dsv-settingsReset" onClick={() => resetPrefs()}>
        {t('settings.reset')}
      </button>
    </section>
  );
}
