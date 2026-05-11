const renderField = (field, value, onChange) => {
  if (field.type === 'select') {
    return (
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">{field.selectLabel || 'Select'}</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'file') {
    return (
      <input
        type="file"
        onChange={(event) => onChange(event.target.files?.[0]?.name || '')}
      />
    );
  }

  return (
    <input
      type={field.type}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export default function TemplateBuilder({
  templateType,
  templateFields,
  templateValues,
  templateOptions,
  lang,
  onTemplateChange,
  onValueChange,
  t
}) {
  const handleValueChange = (fieldId, value) => {
    onValueChange({ ...templateValues, [fieldId]: value });
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('templateGenerator')}</h2>
        <p>{t('templateGeneratorDesc')}</p>
      </header>
      <div className="panel-body">
        <div className="field">
          <span>{t('experimentType')}</span>
          <select
            value={templateType}
            onChange={(event) => onTemplateChange(event.target.value)}
          >
            {templateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-grid compact">
          {templateFields.length === 0 ? (
            <div className="empty-hint">{t('blankHint')}</div>
          ) : (
            templateFields.map((field) => (
              <label key={field.id} className="field">
                <span>{field.labels?.[lang] || field.label}</span>
                {renderField(
                  { ...field, selectLabel: t('select') },
                  templateValues[field.id],
                  (value) => handleValueChange(field.id, value)
                )}
              </label>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
