export default function ExtensionsModal({
  isOpen,
  extensions,
  enabledExtensions,
  onEnable,
  onDisable,
  onClose,
  t
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card extensions-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{t('extensionsTitle')}</h2>
          <p>{t('extensionsDesc')}</p>
        </header>
        <div className="modal-body">
          <div className="extensions-list">
            {extensions.map((extension) => {
              const isEnabled = enabledExtensions.includes(extension.id);
              return (
                <div key={extension.id} className="extension-item">
                  <div>
                    <div className="extension-title">{t(extension.titleKey)}</div>
                    <div className="extension-desc">{t(extension.descKey)}</div>
                  </div>
                  <div className="extension-actions">
                    {isEnabled ? (
                      <span className="status-pill">{t('extensionsEnabled')}</span>
                    ) : null}
                    <button
                      className={`btn ${isEnabled ? 'ghost' : 'primary'}`}
                      type="button"
                      onClick={() =>
                        isEnabled ? onDisable?.(extension.id) : onEnable?.(extension.id)
                      }
                    >
                      {isEnabled ? t('extensionsRemove') : t('extensionsAdd')}
                    </button>
                  </div>
                </div>
              );
            })}
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
