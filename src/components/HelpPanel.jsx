export default function HelpPanel({ sectionId, t }) {
  return (
    <section className="panel" id={sectionId}>
      <header className="panel-header">
        <h2>{t('helpTitle')}</h2>
        <p>{t('helpDesc')}</p>
      </header>
      <div className="panel-body">
        <ul className="help-list">
          <li>{t('helpItemDrag')}</li>
          <li>{t('helpItemChart')}</li>
          <li>{t('helpItemProfile')}</li>
        </ul>
      </div>
    </section>
  );
}
