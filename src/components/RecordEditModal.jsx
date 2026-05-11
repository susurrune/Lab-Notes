import { useLayoutEffect, useState } from 'react';

const PRIORITY_OPTIONS = [
  { value: 'high', key: 'priorityHigh' },
  { value: 'medium', key: 'priorityMedium' },
  { value: 'low', key: 'priorityLow' }
];

export default function RecordEditModal({ isOpen, record, onClose, onSave, onDelete, t }) {
  const [draft, setDraft] = useState(record ?? {});
  const [tagInput, setTagInput] = useState('');
  const [changed, setChanged] = useState(false);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setDraft(record ?? {});
    setTagInput('');
    setChanged(false);
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setChanged(true);
  };

  const handleAddTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    const tags = Array.from(new Set([...(draft?.tags || []), next]));
    setDraft((prev) => ({ ...prev, tags }));
    setTagInput('');
    setChanged(true);
  };

  const handleRemoveTag = (tag) => {
    setDraft((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((item) => item !== tag)
    }));
    setChanged(true);
  };

  const handleSave = () => {
    if (!draft?.id) return;
    onSave?.(draft);
    onClose();
  };

  const handleDelete = () => {
    if (!draft?.id) return;
    onDelete?.(draft.id);
    onClose();
  };

  const handleBackdropClick = () => {
    if (changed && !window.confirm(t('discardChangesConfirm') || 'Discard unsaved changes?')) return;
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{t('editRecordTitle')}</h2>
          <p>{t('editRecordDesc')}</p>
        </header>
        <div className="modal-body">
          <div className="form-grid">
            <label className="field">
              <span>{t('experimentName')}</span>
              <input
                type="text"
                value={draft?.name || ''}
                onChange={(event) => handleChange('name', event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('date')}</span>
              <input
                type="date"
                value={draft?.date || ''}
                onChange={(event) => handleChange('date', event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('researcher')}</span>
              <input
                type="text"
                value={draft?.person || ''}
                onChange={(event) => handleChange('person', event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('priority')}</span>
              <select
                value={draft?.priority || 'medium'}
                onChange={(event) => handleChange('priority', event.target.value)}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field span-2">
              <span>{t('objective')}</span>
              <textarea
                rows="2"
                value={draft?.purpose || ''}
                onChange={(event) => handleChange('purpose', event.target.value)}
              />
            </label>
            <div className="field span-2">
              <span>{t('tags')}</span>
              <div className="tag-input-row">
                <input
                  type="text"
                  value={tagInput}
                  placeholder={t('addTagPlaceholder')}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    handleAddTag();
                  }}
                />
                <button className="btn ghost" type="button" onClick={handleAddTag}>
                  {t('addTag')}
                </button>
              </div>
              {Array.isArray(draft?.tags) && draft.tags.length > 0 ? (
                <div className="tag-list">
                  {draft.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="tag-chip"
                      onClick={() => handleRemoveTag(tag)}
                      title={tag}
                    >
                      {tag}
                      <span>&times;</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <label className="field span-2">
              <span>{t('remarks')}</span>
              <textarea
                rows="3"
                value={draft?.remarks || ''}
                onChange={(event) => handleChange('remarks', event.target.value)}
                placeholder={t('remarks')}
              />
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" type="button" onClick={handleBackdropClick}>
            {t('cancel')}
          </button>
          <button className="btn danger" type="button" onClick={handleDelete}>
            {t('deleteRecord')}
          </button>
          <button className="btn primary" type="button" onClick={handleSave}>
            {t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
