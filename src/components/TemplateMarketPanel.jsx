export default function TemplateMarketPanel({ templates, onApply, lang, t }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('templateMarketTitle')}</h2>
        <p>{t('templateMarketDesc')}</p>
      </header>
      <div className="panel-body">
        <div className="market-grid">
          {templates.map((template) => (
            <div key={template.id} className="market-card">
              <div className="market-head">
                <div>
                  <div className="market-title">{template.labels?.[lang] || template.label}</div>
                  <div className="market-category">
                    {t('marketCategory')}: {template.category?.[lang] || template.category}
                  </div>
                </div>
                <button className="btn ghost" type="button" onClick={() => onApply(template)}>
                  {t('applyTemplate')}
                </button>
              </div>
              <p className="market-desc">
                {template.description?.[lang] || template.description}
              </p>
              <div className="market-fields">
                {template.fields.slice(0, 3).map((field) => (
                  <span key={field.id} className="tag-chip">
                    {field.labels?.[lang] || field.label}
                  </span>
                ))}
                {template.fields.length > 3 ? (
                  <span className="tag-chip">+{template.fields.length - 3}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
