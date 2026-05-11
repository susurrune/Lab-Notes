const buildItem = () => ({
  id: crypto.randomUUID(),
  text: '',
  done: false
});

export default function ChecklistBlock({ items, onChange, t }) {
  const handleToggle = (id) => {
    onChange(
      (items || []).map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleTextChange = (id, value) => {
    onChange((items || []).map((item) => (item.id === id ? { ...item, text: value } : item)));
  };

  const handleRemove = (id) => {
    onChange((items || []).filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    onChange([...(items || []), buildItem()]);
  };

  return (
    <div className="block-content">
      <div className="block-actions">
        <button className="btn ghost" type="button" onClick={handleAdd}>
          {t('addStep')}
        </button>
      </div>
      <div className="checklist">
        {(items || []).length === 0 ? (
          <div className="empty-hint">{t('noChecklist')}</div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="checklist-item">
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => handleToggle(item.id)}
                />
                <span>{`${t('step')} ${index + 1}`}</span>
              </label>
              <input
                type="text"
                value={item.text}
                onChange={(event) => handleTextChange(item.id, event.target.value)}
                placeholder={t('step')}
              />
              <button
                className="icon-btn ghost"
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={t('removeStep', { index: index + 1 })}
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
