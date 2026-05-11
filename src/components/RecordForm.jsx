import { useEffect, useState } from 'react';
import DataTable from './DataTable.jsx';

const priorityOptions = (t) => [
  { value: 'high', label: t('priorityHigh') },
  { value: 'medium', label: t('priorityMedium') },
  { value: 'low', label: t('priorityLow') }
];

export default function RecordForm({
  draft,
  onChange,
  onExportCsv,
  onExportPdf,
  onExportWord,
  onSave,
  onDelete,
  canDelete,
  t
}) {
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setTagInput('');
  }, [draft.id]);
  const updateSteps = (value, index) => {
    const next = [...(draft.steps || [])];
    next[index] = value;
    onChange({ steps: next });
  };

  const addStep = () => {
    onChange({ steps: [...draft.steps, ''] });
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div className="panel-header-row">
          <div>
            <h2>{t('experimentRecord')}</h2>
            <p>{t('experimentRecordDesc')}</p>
          </div>
          <div className="record-actions">
            <button className="btn ghost" type="button" onClick={onSave}>
              {t('saveRecord')}
            </button>
            <button
              className="btn danger"
              type="button"
              onClick={onDelete}
              disabled={!canDelete}
            >
              {t('deleteRecord')}
            </button>
          </div>
        </div>
      </header>
      <div className="panel-body">
        <div className="form-grid">
          <label className="field">
            <span>{t('experimentName')}</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder={t('experimentName')}
            />
          </label>
          <label className="field">
            <span>{t('date')}</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => onChange({ date: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{t('researcher')}</span>
            <input
              type="text"
              value={draft.person}
              onChange={(event) => onChange({ person: event.target.value })}
              placeholder={t('researcher')}
            />
          </label>
          <label className="field">
            <span>{t('priority')}</span>
            <select
              value={draft.priority}
              onChange={(event) => onChange({ priority: event.target.value })}
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
              onChange={(event) => onChange({ purpose: event.target.value })}
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
                  const next = tagInput.trim();
                  if (!next) return;
                  const tags = Array.from(new Set([...(draft.tags || []), next]));
                  onChange({ tags });
                  setTagInput('');
                }}
              />
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  const next = tagInput.trim();
                  if (!next) return;
                  const tags = Array.from(new Set([...(draft.tags || []), next]));
                  onChange({ tags });
                  setTagInput('');
                }}
              >
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
                onClick={() => onChange({ tags: draft.tags.filter((item) => item !== tag) })}
                title={tag}
              >
                {tag}
                <span>×</span>
              </button>
            ))}
          </div>
        </div>

        <div className="block">
          <div className="block-header">
            <h3>{t('steps')}</h3>
            <button className="btn ghost" type="button" onClick={addStep}>
              {t('addStep')}
            </button>
          </div>
          <div className="step-list">
            {(draft.steps || []).map((step, index) => (
              <textarea
                key={`${draft.id}-step-${index}`}
                rows="2"
                value={step}
                onChange={(event) => updateSteps(event.target.value, index)}
                placeholder={`${t('step')} ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="block">
          <div className="block-header">
            <h3>{t('rawData')}</h3>
            <p>{t('rawDataDesc')}</p>
            <div className="block-actions">
              <button className="btn ghost" type="button" onClick={onExportCsv}>
                {t('exportCsv')}
              </button>
              <button className="btn ghost" type="button" onClick={onExportPdf}>
                {t('exportPdf')}
              </button>
              <button className="btn ghost" type="button" onClick={onExportWord}>
                {t('exportWord')}
              </button>
            </div>
          </div>
          <DataTable
            value={draft.rawData}
            onChange={(rawData) => onChange({ rawData })}
            t={t}
          />
        </div>

        <label className="field span-2">
          <span>{t('remarks')}</span>
          <textarea
            rows="3"
            value={draft.remarks}
            onChange={(event) => onChange({ remarks: event.target.value })}
            placeholder={t('remarks')}
          />
        </label>


      </div>
    </section>
  );
}
