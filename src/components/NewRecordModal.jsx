import { useEffect, useState } from 'react';

export default function NewRecordModal({
  isOpen,
  templateOptions,
  onConfirm,
  onClose,
  t
}) {
  const [mode, setMode] = useState('blank');
  const [templateType, setTemplateType] = useState(templateOptions[0]?.value || 'general');

  useEffect(() => {
    if (!isOpen) return;
    setMode('blank');
    setTemplateType(templateOptions[0]?.value || 'general');
  }, [isOpen, templateOptions]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({ mode, templateType });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header className="modal-header">
          <h2>{t('modalTitle')}</h2>
          <p>{t('modalDesc')}</p>
        </header>
        <div className="modal-body">
          <label className="radio-card">
            <input
              type="radio"
              name="note-mode"
              value="blank"
              checked={mode === 'blank'}
              onChange={() => setMode('blank')}
            />
            <div>
              <div className="radio-title">{t('blankPage')}</div>
              <div className="radio-desc">{t('blankHint')}</div>
            </div>
          </label>
          <label className="radio-card">
            <input
              type="radio"
              name="note-mode"
              value="template"
              checked={mode === 'template'}
              onChange={() => setMode('template')}
            />
            <div>
              <div className="radio-title">{t('chooseTemplate')}</div>
              <div className="radio-desc">{t('chooseTemplateHint')}</div>
            </div>
          </label>
          {mode === 'template' ? (
            <label className="field">
              <span>{t('experimentType')}</span>
              <select value={templateType} onChange={(event) => setTemplateType(event.target.value)}>
                {templateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <footer className="modal-actions">
          <button className="btn ghost" type="button" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn primary" type="button" onClick={handleConfirm}>
            {t('create')}
          </button>
        </footer>
      </div>
    </div>
  );
}
