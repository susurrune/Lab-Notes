import { useState } from 'react';
import * as XLSX from 'xlsx';

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  result.push(current.trim());
  return result;
};

const guessType = (label) => {
  const lower = label.toLowerCase();
  if (lower.includes('date')) return 'date';
  if (lower.includes('temp') || lower.includes('ph') || lower.includes('concentration')) return 'number';
  if (lower.includes('file') || lower.includes('image')) return 'file';
  return 'text';
};

export default function TemplateImport({ onTemplateImported, t }) {
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  const buildFields = (headers) =>
    headers.map((header, index) => ({
      id: `import-${index}-${header}`,
      label: header || `Field ${index + 1}`,
      type: guessType(header || ''),
      options: []
    }));

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatus(t('importStatusReading'));

    const ext = file.name.split('.').pop().toLowerCase();

    try {
      if (ext === 'csv') {
        const text = await file.text();
        const [headerLine] = text.split(/\r?\n/);
        const headers = parseCsvLine(headerLine);
        onTemplateImported({
          fields: buildFields(headers),
          label: file.name.replace(/\.[^.]+$/, ''),
          source: ext
        });
        setStatus(t('importStatusCsv'));
        return;
      }

      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headers = (rows[0] || []).map((item) => String(item).trim());
        onTemplateImported({
          fields: buildFields(headers),
          label: file.name.replace(/\.[^.]+$/, ''),
          source: ext
        });
        setStatus(t('importStatusExcel'));
        return;
      }

      setStatus(t('importStatusUnsupported'));
    } catch (error) {
      setStatus(t('importStatusFailed'));
    } finally {
      setProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('templateImportTitle')}</h2>
        <p>{t('templateImportDesc')}</p>
      </header>
      <div className="panel-body">
        <label className="field">
          <span>{t('templateFile')}</span>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} disabled={processing} />
        </label>
        <div className="status">{status}</div>
      </div>
    </section>
  );
}
