import DataTable from '../DataTable.jsx';

export default function TableBlock({
  table,
  onChange,
  onExportCsv,
  onExportPdf,
  onExportWord,
  t
}) {
  if (!table) {
    return (
      <div className="block-content">
        <div className="empty-hint">{t('tableMissing')}</div>
      </div>
    );
  }

  const handleNameChange = (event) => {
    onChange({ ...table, name: event.target.value });
  };

  return (
    <div className="block-content">
      <div className="block-header-row">
        <div>
          <div className="block-title">{t('rawData')}</div>
          <div className="table-title-row">
            <span className="table-label">{t('tableName')}</span>
            <input
              className="table-name-input"
              type="text"
              value={table.name}
              onChange={handleNameChange}
              placeholder={t('tableNamePlaceholder')}
            />
          </div>
          <div className="table-id">ID: {table.id}</div>
        </div>
        <div className="block-actions">
          <button className="btn ghost" type="button" onClick={() => onExportCsv?.(table)}>
            {t('exportCsv')}
          </button>
          <button className="btn ghost" type="button" onClick={() => onExportPdf?.(table)}>
            {t('exportPdf')}
          </button>
          <button className="btn ghost" type="button" onClick={() => onExportWord?.(table)}>
            {t('exportWord')}
          </button>
        </div>
      </div>
      <DataTable table={table} onChange={onChange} t={t} />
    </div>
  );
}
