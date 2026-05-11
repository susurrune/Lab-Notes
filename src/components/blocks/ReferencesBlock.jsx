import { useState } from 'react';

const buildRef = () => ({
  id: crypto.randomUUID(),
  title: '',
  url: ''
});

export default function ReferencesBlock({ items, onChange, t }) {
  const [draft, setDraft] = useState(buildRef());

  const handleAdd = () => {
    if (!draft.title.trim() || !draft.url.trim()) return;
    onChange([...(items || []), { ...draft }]);
    setDraft(buildRef());
  };

  const handleRemove = (id) => {
    onChange((items || []).filter((item) => item.id !== id));
  };

  return (
    <div className="block-content">
      <div className="form-grid">
        <label className="field">
          <span>{t('referenceTitle')}</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={t('referenceTitle')}
          />
        </label>
        <label className="field">
          <span>{t('referenceUrl')}</span>
          <input
            type="url"
            value={draft.url}
            onChange={(event) => setDraft((prev) => ({ ...prev, url: event.target.value }))}
            placeholder="https://"
          />
        </label>
      </div>
      <div className="block-actions">
        <button className="btn ghost" type="button" onClick={handleAdd}>
          {t('addReference')}
        </button>
      </div>
      <div className="reference-list">
        {(items || []).length === 0 ? (
          <div className="empty-hint">{t('noReferences')}</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="reference-item">
              <div>
                <div className="reference-title">{item.title}</div>
                <a href={item.url} target="_blank" rel="noreferrer" className="reference-link">
                  {item.url}
                </a>
              </div>
              <button
                className="icon-btn ghost"
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={t('removeReference')}
              >
                x
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
