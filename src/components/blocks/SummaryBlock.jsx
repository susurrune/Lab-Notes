import { useEffect, useState } from 'react';

const priorityOptions = (t) => [
  { value: 'high', label: t('priorityHigh') },
  { value: 'medium', label: t('priorityMedium') },
  { value: 'low', label: t('priorityLow') }
];

export default function SummaryBlock({
  draft,
  onChange,
  onSave,
  onDelete,
  canDelete,
  t
}) {
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setTagInput('');
  }, [draft.id]);

  const addTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    const tags = Array.from(new Set([...(draft.tags || []), next]));
    onChange({ ...draft, tags });
    setTagInput('');
  };

  if (!draft) return null;

  return (
    <div className="block-content">
      <div className="block-actions">
        <button className="btn ghost" type="button" onClick={onSave}>
          {t('saveRecord')}
        </button>
        <button className="btn danger" type="button" onClick={onDelete} disabled={!canDelete}>
          {t('deleteRecord')}
        </button>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>{t('experimentName')}</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder={t('experimentName')}
          />
        </label>
        <label className="field">
          <span>{t('date')}</span>
          <input
            type="date"
            value={draft.date}
            onChange={(event) => onChange({ ...draft, date: event.target.value })}
          />
        </label>
        <label className="field">
          <span>{t('researcher')}</span>
          <input
            type="text"
            value={draft.person}
            onChange={(event) => onChange({ ...draft, person: event.target.value })}
            placeholder={t('researcher')}
          />
        </label>
        <label className="field">
          <span>{t('priority')}</span>
          <select
            value={draft.priority}
            onChange={(event) => onChange({ ...draft, priority: event.target.value })}
          >
            {priorityOptions(t).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span>{t('objective')}</span>
          <textarea
            rows="2"
            value={draft.purpose}
            onChange={(event) => onChange({ ...draft, purpose: event.target.value })}
            placeholder={t('objective')}
          />
        </label>
      </div>

      <div className="tag-section">
        <div className="tag-header">
          <span>{t('tags')}</span>
          <div className="tag-input">
            <input
              type="text"
              value={tagInput}
              placeholder={t('addTagPlaceholder')}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addTag();
              }}
            />
            <button className="btn ghost" type="button" onClick={addTag}>
              {t('addTag')}
            </button>
          </div>
        </div>
        <div className="tag-list">
          {(draft.tags || []).map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag-chip"
              onClick={() => onChange({ ...draft, tags: (draft.tags || []).filter((item) => item !== tag) })}
              title={tag}
            >
              {tag}
              <span>x</span>
            </button>
          ))}
        </div>
      </div>

      <label className="field span-2">
        <span>{t('remarks')}</span>
        <textarea
          rows="3"
          value={draft.remarks}
          onChange={(event) => onChange({ ...draft, remarks: event.target.value })}
          placeholder={t('remarks')}
        />
      </label>
    </div>
  );
}
