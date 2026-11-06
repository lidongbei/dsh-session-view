import { useSyncExternalStore } from 'react';
import { getPrefs, resetPrefs, setPrefs, subscribePrefs } from './prefs.js';
import { STYLES } from './styles.js';

const GLOW_EFFECTS = ['marquee', 'aurora', 'pulse', 'rainbow', 'comet', 'scan', 'dash'];

function Row({ label, description, children }) {
  return (
    <div className="dsv-settingRow">
      <div className="dsv-settingText">
        <span className="dsv-settingLabel">{label}</span>
        {description ? <span className="dsv-settingDesc">{description}</span> : null}
      </div>
      <div className="dsv-settingControl">{children}</div>
    </div>
  );
}

function Toggle({ label, description, value, onChange }) {
  return (
    <label className="dsv-settingRow dsv-settingRow--toggle">
      <span className="dsv-settingText">
        <span className="dsv-settingLabel">{label}</span>
        {description ? <span className="dsv-settingDesc">{description}</span> : null}
      </span>
      <span className="dsv-settingControl">
        <input
          className="dsv-switch"
          type="checkbox"
          role="switch"
          checked={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.checked)}
        />
      </span>
    </label>
  );
}

function Group({ title, description, children }) {
  return (
    <section className="dsv-settingsGroup" aria-label={title}>
      <div className="dsv-settingsGroupHead">
        <h3 className="dsv-settingsGroupTitle">{title}</h3>
        {description ? <p className="dsv-settingsGroupHint">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

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
      <header className="dsv-settingsHeader">
        <h2 className="dsv-settingsTitle">{t('settings.nav')}</h2>
        <p className="dsv-settingsIntro">{t('settings.hint')}</p>
      </header>

      <Group title={t('settings.group.display')}>
        <Row label={t('settings.mode')} description={t('settings.desc.mode')}>
          <select
            className="dsv-select"
            value={prefs.mode}
            onChange={(event) => setPrefs({ mode: event.target.value })}
          >
            <option value="session">{t('settings.mode.session')}</option>
            <option value="native">{t('settings.mode.native')}</option>
          </select>
        </Row>
        <Toggle
          label={t('settings.showSubagents')}
          description={t('settings.desc.subagents')}
          value={prefs.showSubagents}
          onChange={(value) => setPrefs({ showSubagents: value })}
        />
        <Toggle
          label={t('settings.showIdle')}
          description={t('settings.desc.idle')}
          value={prefs.showIdle}
          onChange={(value) => setPrefs({ showIdle: value })}
        />
      </Group>

      <Group title={t('settings.group.sections')} description={t('settings.desc.sections')}>
        <Toggle
          label={t('settings.showRecent')}
          value={prefs.showRecent}
          onChange={(value) => setPrefs({ showRecent: value })}
        />
        <Toggle
          label={t('settings.showPinned')}
          value={prefs.showPinned}
          onChange={(value) => setPrefs({ showPinned: value })}
        />
        <Toggle
          label={t('settings.showActive')}
          value={prefs.showActive}
          onChange={(value) => setPrefs({ showActive: value })}
        />
        <Toggle
          label={t('settings.showWorkspaces')}
          description={t('settings.desc.workspaces')}
          value={prefs.showWorkspaces}
          onChange={(value) => setPrefs({ showWorkspaces: value })}
        />
      </Group>

      <Group title={t('settings.group.limits')} description={t('settings.desc.limits')}>
        <Row label={t('settings.activeLimit')}>
          <input
            className="dsv-input dsv-number"
            type="number"
            min="0"
            max="50"
            value={prefs.activeLimit}
            onChange={(event) => setPrefs({ activeLimit: event.target.value })}
          />
        </Row>
        <Row label={t('settings.recentLimit')}>
          <input
            className="dsv-input dsv-number"
            type="number"
            min="0"
            max="50"
            value={prefs.recentLimit}
            onChange={(event) => setPrefs({ recentLimit: event.target.value })}
          />
        </Row>
        <Row label={t('settings.workspaceLimit')}>
          <input
            className="dsv-input dsv-number"
            type="number"
            min="0"
            max="50"
            value={prefs.workspaceLimit}
            onChange={(event) => setPrefs({ workspaceLimit: event.target.value })}
          />
        </Row>
        <Row label={t('settings.sort')} description={t('settings.desc.sort')}>
          <select
            className="dsv-select"
            value={prefs.sort}
            onChange={(event) => setPrefs({ sort: event.target.value })}
          >
            <option value="updated">{t('settings.sort.updated')}</option>
            <option value="manual">{t('settings.sort.manual')}</option>
          </select>
        </Row>
        <Toggle
          label={t('settings.nest')}
          description={t('settings.desc.nest')}
          value={prefs.nestWorkspaces}
          onChange={(value) => setPrefs({ nestWorkspaces: value })}
        />
      </Group>

      <Group title={t('settings.group.behavior')}>
        <Row label={t('settings.archived')} description={t('settings.desc.archived')}>
          <select
            className="dsv-select"
            value={prefs.archivedFilter}
            onChange={(event) => setPrefs({ archivedFilter: event.target.value })}
          >
            <option value="hide">{t('settings.archived.hide')}</option>
            <option value="show">{t('settings.archived.show')}</option>
            <option value="only">{t('settings.archived.only')}</option>
          </select>
        </Row>
        <Toggle
          label={t('settings.focusEnabled')}
          description={t('settings.desc.focusEnabled')}
          value={prefs.focusEnabled !== false}
          onChange={(value) => setPrefs({ focusEnabled: value })}
        />
        <Toggle
          label={t('settings.showTimes')}
          description={t('settings.desc.times')}
          value={prefs.showTimes}
          onChange={(value) => setPrefs({ showTimes: value })}
        />
        <Toggle
          label={t('settings.compact')}
          description={t('settings.desc.compact')}
          value={prefs.compact}
          onChange={(value) => setPrefs({ compact: value })}
        />
      </Group>

      <Group title={t('settings.group.glow')} description={t('settings.glow.hint')}>
        {['running', 'pending', 'done'].map((status) => {
          const key = status === 'running' ? 'glowRunning' : status === 'pending' ? 'glowPending' : 'glowDone';
          const effect = prefs[key] || 'off';
          const enabled = effect !== 'off';
          return (
            <div className="dsv-glowCard" key={status}>
              <div className="dsv-glowCardHead">
                <span className="dsv-glowCardTitle">{t(`settings.glow.${status}`)}</span>
                <input
                  className="dsv-switch"
                  type="checkbox"
                  role="switch"
                  checked={enabled}
                  aria-label={t(`settings.glow.${status}`)}
                  onChange={(event) => setPrefs({ [key]: event.target.checked ? 'marquee' : 'off' })}
                />
              </div>
              <div className="dsv-glowPreview" data-status={status}>
                <span className="dsv-dot" data-status={status} />
                <span className="dsv-glowPreviewTitle">{t('settings.glow.sample')}</span>
                <span className="dsv-glowPreviewTime">{t('settings.glow.now')}</span>
                {enabled ? (
                  <span
                    className={`dsv-sideGlow dsv-sideGlow--${effect}`}
                    data-status={status}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <div className="dsv-glowChoices" role="group" aria-label={t('settings.glow.style')}>
                {GLOW_EFFECTS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="dsv-glowChoice"
                    aria-pressed={effect === option}
                    onClick={() => setPrefs({ [key]: option })}
                  >
                    {t(`settings.glow.${option}`)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </Group>

      <footer className="dsv-settingsFooter">
        <button type="button" className="dsv-btn" onClick={() => resetPrefs()}>
          {t('settings.reset')}
        </button>
        <span className="dsv-settingsFooterHint">{t('settings.resetHint')}</span>
        <span className="dsv-settingsShortcuts">{t('settings.shortcuts')}</span>
      </footer>
    </section>
  );
}
