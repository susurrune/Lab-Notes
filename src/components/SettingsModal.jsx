import { useMemo, useState } from 'react';

const intervalOptions = [
  { value: 10000, labelKey: 'interval10' },
  { value: 30000, labelKey: 'interval30' },
  { value: 60000, labelKey: 'interval60' }
];

export default function SettingsModal({
  isOpen,
  settings,
  onChange,
  onClose,
  onExportData,
  onClearData,
  storageKeys,
  t
}) {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = useMemo(
    () => [
      { id: 'general', label: t('settingsGeneral') },
      { id: 'appearance', label: t('settingsAppearance') },
      { id: 'workspace', label: t('settingsWorkspace') },
      { id: 'tips', label: t('settingsTips') },
      { id: 'data', label: t('settingsData') }
    ],
    [t]
  );

  if (!isOpen) return null;

  const updateSetting = (patch) => {
    onChange?.({ ...settings, ...patch });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card settings-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{t('settingsTitle')}</h2>
          <p>{t('settingsDesc')}</p>
        </header>
        <div className="settings-layout">
          <aside className="settings-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </aside>
          <div className="settings-body">
            {activeTab === 'general' ? (
              <div className="settings-section">
                <div className="settings-row">
                  <label className="field">
                    <span>{t('settingsLanguage')}</span>
                    <select
                      value={settings.language}
                      onChange={(event) => updateSetting({ language: event.target.value })}
                    >
                      <option value="zh">{t('langChinese')}</option>
                      <option value="en">{t('langEnglish')}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('settingsDateFormat')}</span>
                    <select
                      value={settings.dateFormat}
                      onChange={(event) => updateSetting({ dateFormat: event.target.value })}
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </label>
                </div>
                <div className="settings-row">
                  <label className="field">
                    <span>{t('settingsDefaultTemplate')}</span>
                    <select
                      value={settings.defaultTemplate}
                      onChange={(event) => updateSetting({ defaultTemplate: event.target.value })}
                    >
                      <option value="general">{t('templateGeneral')}</option>
                      <option value="chemistry">{t('templateChemistry')}</option>
                      <option value="biology">{t('templateBiology')}</option>
                      <option value="physics">{t('templatePhysics')}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('settingsAutoSaveInterval')}</span>
                    <select
                      value={settings.autoSaveInterval}
                      onChange={(event) =>
                        updateSetting({ autoSaveInterval: Number(event.target.value) })
                      }
                    >
                      {intervalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(event) => updateSetting({ autoSave: event.target.checked })}
                  />
                  {t('settingAutoSave')}
                </label>
              </div>
            ) : null}

            {activeTab === 'appearance' ? (
              <div className="settings-section">
                <div className="settings-row">
                  <label className="field">
                    <span>{t('settingsTheme')}</span>
                    <select
                      value={settings.theme}
                      onChange={(event) => updateSetting({ theme: event.target.value })}
                    >
                      <option value="light">{t('themeLight')}</option>
                      <option value="dark">{t('themeDark')}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('settingsFontSize')}</span>
                    <select
                      value={settings.fontSize}
                      onChange={(event) => updateSetting({ fontSize: event.target.value })}
                    >
                      <option value="small">{t('fontSmall')}</option>
                      <option value="medium">{t('fontMedium')}</option>
                      <option value="large">{t('fontLarge')}</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>{t('settingsDensity')}</span>
                  <select
                    value={settings.density}
                    onChange={(event) => updateSetting({ density: event.target.value })}
                  >
                    <option value="comfortable">{t('densityComfortable')}</option>
                    <option value="compact">{t('densityCompact')}</option>
                  </select>
                </label>
              </div>
            ) : null}

            {activeTab === 'workspace' ? (
              <div className="settings-section">
                <div className="settings-row">
                  <label className="field">
                    <span>{t('settingsWorkspaceSort')}</span>
                    <select
                      value={settings.workspaceSort}
                      onChange={(event) => updateSetting({ workspaceSort: event.target.value })}
                    >
                      <option value="manual">{t('sortManual')}</option>
                      <option value="created">{t('sortCreated')}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('settingsChartDefaultSize')}</span>
                    <div className="inline-inputs">
                      <input
                        type="number"
                        min="240"
                        value={settings.chartDefaultWidth}
                        onChange={(event) =>
                          updateSetting({ chartDefaultWidth: Number(event.target.value) })
                        }
                      />
                      <span className="inline-separator">x</span>
                      <input
                        type="number"
                        min="200"
                        value={settings.chartDefaultHeight}
                        onChange={(event) =>
                          updateSetting({ chartDefaultHeight: Number(event.target.value) })
                        }
                      />
                    </div>
                  </label>
                </div>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={settings.defaultCollapsed}
                    onChange={(event) => updateSetting({ defaultCollapsed: event.target.checked })}
                  />
                  {t('settingsDefaultCollapsed')}
                </label>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={settings.showBlockMeta}
                    onChange={(event) => updateSetting({ showBlockMeta: event.target.checked })}
                  />
                  {t('settingsShowBlockMeta')}
                </label>
              </div>
            ) : null}

            {activeTab === 'tips' ? (
              <div className="settings-section">
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={settings.showTips}
                    onChange={(event) => updateSetting({ showTips: event.target.checked })}
                  />
                  {t('settingsShowTips')}
                </label>
                <div className="settings-callout">
                  <div className="callout-title">{t('tipsTitle')}</div>
                  <ul className="help-list">
                    <li>{t('tipsAddBlock')}</li>
                    <li>{t('tipsDrag')}</li>
                    <li>{t('tipsExtensions')}</li>
                    <li>{t('tipsExport')}</li>
                  </ul>
                </div>
                <div className="settings-callout">
                  <div className="callout-title">{t('shortcutsTitle')}</div>
                  <div className="shortcut-grid">
                    <div>
                      <span className="shortcut-key">Ctrl</span> +{' '}
                      <span className="shortcut-key">S</span>
                    </div>
                    <span>{t('shortcutSave')}</span>
                    <div>
                      <span className="shortcut-key">Ctrl</span> +{' '}
                      <span className="shortcut-key">/</span>
                    </div>
                    <span>{t('shortcutSearch')}</span>
                  </div>
                </div>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => updateSetting({ showTips: true })}
                >
                  {t('tipsReset')}
                </button>
              </div>
            ) : null}

            {activeTab === 'data' ? (
              <div className="settings-section">
                <label className="field">
                  <span>{t('dataMode')}</span>
                  <select
                    value={settings.dataMode || 'api'}
                    onChange={(event) => updateSetting({ dataMode: event.target.value })}
                  >
                    <option value="api">{t('dataModeApi')}</option>
                    <option value="local">{t('dataModeLocal')}</option>
                  </select>
                </label>
                <div className="form-note">{t('dataModeHint')}</div>
                <div className="settings-callout">
                  <div className="callout-title">{t('dataPrivacyTitle')}</div>
                  <p className="callout-text">{t('dataPrivacyDesc')}</p>
                  <div className="key-list">
                    {storageKeys.map((key) => (
                      <span key={key} className="key-pill">
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="settings-row">
                  <button className="btn ghost" type="button" onClick={onExportData}>
                    {t('dataExport')}
                  </button>
                  <button className="btn danger" type="button" onClick={onClearData}>
                    {t('dataClear')}
                  </button>
                </div>
                <div className="form-note">{t('dataClearNote')}</div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" type="button" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
