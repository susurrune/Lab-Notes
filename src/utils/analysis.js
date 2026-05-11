const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNumericValues = (values = []) =>
  values.map((value) => parseNumber(value)).filter((value) => value !== null);

export const getColumnIndexMap = (columns = []) =>
  new Map(columns.map((column, index) => [column.id, index]));

export const getColumnValues = (table, columnId) => {
  const columns = table?.columns || [];
  const rows = table?.rows || [];
  const columnIndex = columns.findIndex((column) => column.id === columnId);
  if (columnIndex === -1) {
    return { values: [], numericValues: [] };
  }
  const values = rows.map((row) => row[columnIndex]);
  return { values, numericValues: toNumericValues(values) };
};

export const computeStats = (table, options = {}) => {
  const { includeIndex = false } = options;
  const columns = table?.columns || [];
  const rows = table?.rows || [];

  return columns.map((column, index) => {
    if (column.type === 'index' && !includeIndex) {
      return { column, stats: null, skipped: true };
    }
    const values = rows.map((row) => row[index]);
    const numericValues = toNumericValues(values);
    if (column.type !== 'numeric' || numericValues.length === 0) {
      return { column, stats: null, skipped: column.type !== 'numeric' };
    }

    const sum = numericValues.reduce((acc, value) => acc + value, 0);
    const average = sum / numericValues.length;
    const sorted = [...numericValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const variance =
      numericValues.reduce((acc, value) => acc + (value - average) ** 2, 0) /
      (numericValues.length > 1 ? numericValues.length - 1 : 1);

    return {
      column,
      stats: {
        average,
        median,
        std: Math.sqrt(variance),
        max: Math.max(...numericValues),
        min: Math.min(...numericValues),
        count: numericValues.length
      }
    };
  });
};

export const computeGroupedStats = (table, groupByColumnId, numericColumnIds = []) => {
  if (!groupByColumnId || numericColumnIds.length === 0) return [];
  const columns = table?.columns || [];
  const rows = table?.rows || [];
  const indexMap = getColumnIndexMap(columns);
  const groupIndex = indexMap.get(groupByColumnId);
  if (groupIndex === undefined) return [];

  const grouped = rows.reduce((acc, row) => {
    const key = row[groupIndex] ?? 'Ungrouped';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return Object.entries(grouped).map(([group, groupRows]) => {
    const statsByColumn = numericColumnIds.reduce((acc, columnId) => {
      const columnIndex = indexMap.get(columnId);
      if (columnIndex === undefined) return acc;
      const values = groupRows.map((row) => row[columnIndex]);
      const numericValues = toNumericValues(values);
      if (!numericValues.length) return acc;
      const sum = numericValues.reduce((prev, value) => prev + value, 0);
      const average = sum / numericValues.length;
      const sorted = [...numericValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      const variance =
        numericValues.reduce((prev, value) => prev + (value - average) ** 2, 0) /
        (numericValues.length > 1 ? numericValues.length - 1 : 1);
      acc[columnId] = {
        average,
        median,
        std: Math.sqrt(variance),
        max: Math.max(...numericValues),
        min: Math.min(...numericValues),
        count: numericValues.length
      };
      return acc;
    }, {});

    return { group, statsByColumn };
  });
};

export const computeBoxPlot = (values = []) => {
  const numericValues = toNumericValues(values);
  if (!numericValues.length) return null;
  const sorted = [...numericValues].sort((a, b) => a - b);
  const medianIndex = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2
      : sorted[medianIndex];
  const lowerHalf = sorted.slice(0, medianIndex);
  const upperHalf = sorted.slice(sorted.length % 2 === 0 ? medianIndex : medianIndex + 1);

  const q1Index = Math.floor(lowerHalf.length / 2);
  const q3Index = Math.floor(upperHalf.length / 2);
  const q1 =
    lowerHalf.length === 0
      ? sorted[0]
      : lowerHalf.length % 2 === 0
        ? (lowerHalf[q1Index - 1] + lowerHalf[q1Index]) / 2
        : lowerHalf[q1Index];
  const q3 =
    upperHalf.length === 0
      ? sorted[sorted.length - 1]
      : upperHalf.length % 2 === 0
        ? (upperHalf[q3Index - 1] + upperHalf[q3Index]) / 2
        : upperHalf[q3Index];

  return {
    min: sorted[0],
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1]
  };
};

export const formatMetric = (value) => {
  if (!Number.isFinite(value)) return '--';
  return Number(value).toFixed(3);
};
