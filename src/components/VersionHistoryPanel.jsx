export default function VersionHistoryPanel({ history = [], t }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('historyTitle')}</h2>
        <p>{t('historyDesc')}</p>
      </header>
      <div className="panel-body">
        {history.length === 0 ? (
          <div className="empty-hint">{t('historyEmpty')}</div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-time">{item.time}</div>
                <div className="history-meta">
                  <span className="history-action">{item.action}</span>
                  <span className="history-summary">{item.summary}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
