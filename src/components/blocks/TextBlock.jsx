export default function TextBlock({ value, onChange, t }) {
  return (
    <div className="block-content">
      <label className="field">
        <span>{t('textBlockLabel')}</span>
        <textarea
          rows="6"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('textBlockPlaceholder')}
        />
      </label>
    </div>
  );
}
