const DEFAULT_WIDTHS = {
  index: 90,
  numeric: 160,
  category: 180
};

const MIN_WIDTHS = {
  index: 72,
  numeric: 140,
  category: 160
};

export const MAX_TABLES = 3;

export const clampWidth = (type, width) => {
  const min = MIN_WIDTHS[type] || 120;
  const safe = Number.isFinite(width) ? width : DEFAULT_WIDTHS[type] || 160;
  return Math.max(min, safe);
};

export const createColumn = ({
  id,
  name,
  type,
  unit = '',
  visible = true,
  width
}) => ({
  id: id || crypto.randomUUID(),
  name: name || 'Column',
  type: type || 'numeric',
  unit,
  visible,
  width: clampWidth(type, width)
});

export const getIndexColumn = (columns = []) =>
  columns.find((column) => column.type === 'index') || null;

export const getNumericColumns = (columns = []) =>
  columns.filter((column) => column.type === 'numeric');

export const getCategoryColumns = (columns = []) =>
  columns.filter((column) => column.type === 'category');

const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const inferColumnType = (values = []) => {
  if (!values.length) return 'category';
  const numericCount = values.reduce((acc, value) => (parseNumber(value) !== null ? acc + 1 : acc), 0);
  const ratio = numericCount / values.length;
  return ratio >= 0.7 ? 'numeric' : 'category';
};

const isSequentialIndex = (values = []) => {
  if (!values.length) return false;
  const parsed = values.map((value) => parseNumber(value));
  if (parsed.some((value) => value === null)) return false;
  const start = parsed[0];
  if (start !== 0 && start !== 1) return false;
  return parsed.every((value, index) => value === start + index);
};

export const createTable = ({
  name = 'Raw Data',
  columnCount = 2,
  rows = []
} = {}) => {
  const columns = [
    createColumn({ name: 'Index', type: 'index' }),
    ...Array.from({ length: Math.max(columnCount, 1) }).map((_, index) =>
      createColumn({ name: `Measure ${index + 1}`, type: 'numeric' })
    )
  ];
  const normalizedRows = rows.length
    ? rows
    : Array.from({ length: 3 }).map((_, rowIndex) =>
        columns.map((column) =>
          column.type === 'index' ? String(rowIndex + 1) : ''
        )
      );

  return {
    id: crypto.randomUUID(),
    name,
    columns,
    rows: normalizedRows
  };
};

export const normalizeTable = (table) => {
  if (!table) return null;
  const columns = (table.columns || []).map((column, index) => {
    const type = column.type || (index === 0 ? 'index' : 'numeric');
    return createColumn({
      id: column.id,
      name: column.name || column.header || column.title || `Column ${index + 1}`,
      type,
      unit: column.unit || '',
      visible: column.visible !== false,
      width: column.width
    });
  });

  let normalizedColumns = columns;
  const indexColumn = getIndexColumn(normalizedColumns);
  if (!indexColumn) {
    normalizedColumns = [createColumn({ name: 'Index', type: 'index' }), ...normalizedColumns];
  }

  const rows = (table.rows || []).map((row) => {
    const nextRow = [...row];
    while (nextRow.length < normalizedColumns.length) {
      nextRow.push('');
    }
    return nextRow.slice(0, normalizedColumns.length);
  });

  const indexColIndex = normalizedColumns.findIndex((column) => column.type === 'index');
  const syncedRows = rows.map((row, rowIndex) => {
    const nextRow = [...row];
    nextRow[indexColIndex] = String(rowIndex + 1);
    return nextRow;
  });

  return {
    id: table.id || crypto.randomUUID(),
    name: table.name || 'Raw Data',
    columns: normalizedColumns.map((column) => ({
      ...column,
      width: clampWidth(column.type, column.width)
    })),
    rows: syncedRows
  };
};

export const migrateRawDataToTable = (rawData, name = 'Raw Data') => {
  const headers = rawData?.headers || [];
  const rows = rawData?.rows || [];
  if (!headers.length) {
    return createTable({ name });
  }

  const firstColValues = rows.map((row) => row[0]);
  const hasIndexColumn = rawData?.meta?.autoIndex || isSequentialIndex(firstColValues);
  const inferredColumns = headers.map((header, index) => {
    const values = rows.map((row) => row[index]);
    const type = index === 0 && hasIndexColumn ? 'index' : inferColumnType(values);
    return createColumn({ name: header || `Column ${index + 1}`, type });
  });

  let columns = inferredColumns;
  let nextRows = rows.map((row) => [...row]);

  if (!hasIndexColumn) {
    const indexColumn = createColumn({ name: 'Index', type: 'index' });
    columns = [indexColumn, ...inferredColumns];
    nextRows = rows.map((row, rowIndex) => [String(rowIndex + 1), ...row]);
  }

  return normalizeTable({
    id: rawData?.id,
    name,
    columns,
    rows: nextRows
  });
};
