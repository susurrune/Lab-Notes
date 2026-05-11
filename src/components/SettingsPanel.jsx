export default function SettingsPanel({ settings, onChange, sectionId, t }) {
  const updateSettings = (patch) => onChange({ ...settings, ...patch });

  return (
    <section className="panel" id={sectionId}>
      <header className="panel-header">
        <h2>{t('settingsTitle')}</h2>
        <p>{t('settingsDesc')}</p>
      </header>
      <div className="panel-body">
        <div className="settings-grid">
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(event) => updateSettings({ autoSave: event.target.checked })}
            />
            <span>{t('settingAutoSave')}</span>
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(event) => updateSettings({ compactMode: event.target.checked })}
            />
            <span>{t('settingCompact')}</span>
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={settings.showTips}
              onChange={(event) => updateSettings({ showTips: event.target.checked })}
            />
            <span>{t('settingTips')}</span>
          </label>
        </div>
      </div>
    </section>
  );
}
