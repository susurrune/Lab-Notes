import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clampWidth, createColumn } from '../data/tables.js';

const ensureRowLength = (columns, rows) =>
  rows.map((row) => {
    const next = [...row];
    while (next.length < columns.length) {
      next.push('');
    }
    return next.slice(0, columns.length);
  });

const getIndexColumnIndex = (columns) =>
  Math.max(
    0,
    columns.findIndex((column) => column.type === 'index')
  );

export default function DataTable({ table, onChange, t }) {
  const [resizing, setResizing] = useState(null);
  const columnsRef = useRef(table.columns);
  const rowsRef = useRef(table.rows);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const columns = useMemo(() => table.columns || [], [table.columns]);
  const rows = useMemo(
    () => ensureRowLength(columns, table.rows || []),
    [columns, table.rows]
  );
  const indexColumnIndex = useMemo(() => getIndexColumnIndex(columns), [columns]);

  useEffect(() => {
    columnsRef.current = columns;
    rowsRef.current = rows;
  }, [columns, rows]);

  useEffect(() => {
    if (!columns.length) return;
    const widthChanged = columns.some(
      (column) => column.width !== clampWidth(column.type, column.width)
    );
    const indexMismatch = rows.some(
      (row, rowIndex) => row[indexColumnIndex] !== String(rowIndex + 1)
    );
    if (!widthChanged && !indexMismatch) return;
    const nextColumns = columns.map((column) => ({
      ...column,
      width: clampWidth(column.type, column.width)
    }));
    const nextRows = rows.map((row, rowIndex) => {
      const next = [...row];
      next[indexColumnIndex] = String(rowIndex + 1);
      return next;
    });
    onChangeRef.current({ ...table, columns: nextColumns, rows: nextRows });
  }, [columns, indexColumnIndex, rows, table]);

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (event) => {
      const { index, startX, startWidth } = resizing;
      const nextWidth = clampWidth(
        columnsRef.current[index]?.type,
        startWidth + event.clientX - startX
      );
      const nextColumns = columnsRef.current.map((column, columnIndex) =>
        columnIndex === index ? { ...column, width: nextWidth } : column
      );
      onChangeRef.current({ ...table, columns: nextColumns, rows: rowsRef.current });
    };

    const handleUp = () => setResizing(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [resizing, table]);

  const updateColumn = useCallback(
    (index, patch) => {
      const nextColumns = columns.map((column, columnIndex) =>
        columnIndex === index ? { ...column, ...patch } : column
      );
      onChangeRef.current({ ...table, columns: nextColumns, rows });
    },
    [columns, rows, table]
  );

  const updateCell = useCallback(
    (rowIndex, colIndex, nextValue) => {
      if (colIndex === indexColumnIndex) return;
      const nextRows = rows.map((row, rIndex) => {
        if (rIndex !== rowIndex) return row;
        const nextRow = [...row];
        nextRow[colIndex] = nextValue;
        return nextRow;
      });
      onChangeRef.current({ ...table, rows: nextRows });
    },
    [indexColumnIndex, rows, table]
  );

  const addRow = useCallback(() => {
    const nextRows = [
      ...rows,
      columns.map((column, colIndex) =>
        colIndex === indexColumnIndex ? String(rows.length + 1) : ''
      )
    ];
    onChangeRef.current({ ...table, rows: nextRows });
  }, [columns, indexColumnIndex, rows, table]);

  const removeRow = useCallback(
    (rowIndex) => {
      if (rows.length <= 1) return;
      const nextRows = rows.filter((_, index) => index !== rowIndex);
      onChangeRef.current({ ...table, rows: nextRows });
    },
    [rows, table]
  );

  const addColumn = useCallback(
    (type) => {
      const name =
        type === 'category'
          ? `${t('categoryColumn')} ${columns.length}`
          : `${t('numericColumn')} ${columns.length}`;
      const nextColumns = [
        ...columns,
        createColumn({ name, type, width: clampWidth(type) })
      ];
      const nextRows = rows.map((row) => [...row, '']);
      onChangeRef.current({ ...table, columns: nextColumns, rows: nextRows });
    },
    [columns, rows, t, table]
  );

  const removeColumn = useCallback(
    (colIndex) => {
      if (colIndex === indexColumnIndex) return;
      if (columns.length <= 2) return;
      const nextColumns = columns.filter((_, index) => index !== colIndex);
      const nextRows = rows.map((row) =>
        row.filter((_, index) => index !== colIndex)
      );
      onChangeRef.current({ ...table, columns: nextColumns, rows: nextRows });
    },
    [columns, indexColumnIndex, rows, table]
  );

  return (
    <div className="data-table">
      <div className="table-actions">
        <div className="table-meta">
          <span>
            {t('dataRows')} {rows.length}
          </span>
          <span>
            {t('dataColumns')} {columns.length}
          </span>
        </div>
        <div className="table-buttons">
          <button className="btn ghost" type="button" onClick={addRow}>
            {t('addRow')}
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => addColumn('numeric')}
          >
            {t('addNumericColumn')}
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => addColumn('category')}
          >
            {t('addCategoryColumn')}
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-grid">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.id}
                  className={
                    index === indexColumnIndex ? 'sticky-col sticky-head' : undefined
                  }
                  style={{ width: column.width }}
                >
                  <div className="th-content">
                    {column.type === 'index' ? (
                      <span className="index-cell">{t('indexColumn')}</span>
                    ) : (
                      <input
                        type="text"
                        value={column.name}
                        onChange={(event) =>
                          updateColumn(index, { name: event.target.value })
                        }
                        title={column.name}
                      />
                    )}
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => removeColumn(index)}
                      disabled={column.type === 'index' || columns.length <= 2}
                      aria-label={t('deleteColumn')}
                      title={t('deleteColumn')}
                    >
                      x
                    </button>
                  </div>
                  <div className="th-meta">
                    <span className="th-label">{t('columnType')}</span>
                    <select
                      value={column.type}
                      onChange={(event) =>
                        updateColumn(index, {
                          type: event.target.value,
                          width: clampWidth(event.target.value, column.width)
                        })
                      }
                      disabled={column.type === 'index'}
                    >
                      {column.type === 'index' ? (
                        <option value="index">{t('columnTypeIndex')}</option>
                      ) : (
                        <>
                          <option value="numeric">{t('columnTypeNumeric')}</option>
                          <option value="category">
                            {t('columnTypeCategory')}
                          </option>
                        </>
                      )}
                    </select>
                    <span className="th-label">{t('columnUnit')}</span>
                    <input
                      type="text"
                      value={column.unit || ''}
                      onChange={(event) =>
                        updateColumn(index, { unit: event.target.value })
                      }
                      placeholder="-"
                      disabled={column.type === 'index'}
                    />
                  </div>
                  <div
                    className="col-resizer"
                    role="separator"
                    aria-label={t('resizeColumn')}
                    aria-valuenow={column.width}
                    tabIndex={0}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setResizing({
                        index,
                        startX: event.clientX,
                        startWidth: column.width || clampWidth(column.type)
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        const nextWidth = clampWidth(
                          column.type,
                          (column.width || clampWidth(column.type)) + 10
                        );
                        updateColumn(index, { width: nextWidth });
                      } else if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        const nextWidth = clampWidth(
                          column.type,
                          (column.width || clampWidth(column.type)) - 10
                        );
                        updateColumn(index, { width: nextWidth });
                      }
                    }}
                  />
                </th>
              ))}
              <th className="action-col" aria-label={t('rowActions')} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={
                      colIndex === indexColumnIndex ? 'sticky-col' : undefined
                    }
                    style={{ width: columns[colIndex]?.width }}
                  >
                    {colIndex === indexColumnIndex ? (
                      <span className="index-cell">{cell}</span>
                    ) : (
                      <input
                        type="text"
                        value={cell}
                        onChange={(event) =>
                          updateCell(rowIndex, colIndex, event.target.value)
                        }
                        title={cell}
                      />
                    )}
                  </td>
                ))}
                <td className="action-col">
                  <button
                    className="icon-btn danger"
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    disabled={rows.length <= 1}
                    aria-label={t('deleteRow')}
                    title={t('deleteRow')}
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
