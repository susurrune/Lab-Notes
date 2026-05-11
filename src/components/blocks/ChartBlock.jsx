import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../services/apiClient.js';
import { DATA_MODE } from '../../services/recordsRepository.js';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  ScatterController,
  Tooltip,
  Legend
} from 'chart.js';
import { BoxAndWiskers, BoxPlotController } from '@sgratzl/chartjs-chart-boxplot';
import { computeBoxPlot } from '../../utils/analysis.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  ScatterController,
  BoxPlotController,
  BoxAndWiskers,
  Tooltip,
  Legend
);

const MAX_SERIES = 3;

const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = () => setMatches(media.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

const buildGroups = (rows, groupIndex) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = row[groupIndex] ?? 'Ungrouped';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
};

const getSeriesColors = () => {
  const style = getComputedStyle(document.body);
  return [
    { border: style.getPropertyValue('--chart-series-0').trim(), background: style.getPropertyValue('--chart-series-0-bg').trim() },
    { border: style.getPropertyValue('--chart-series-1').trim(), background: style.getPropertyValue('--chart-series-1-bg').trim() },
    { border: style.getPropertyValue('--chart-series-2').trim(), background: style.getPropertyValue('--chart-series-2-bg').trim() }
  ];
};

export default function ChartBlock({ datasetId, dataMode, tables, block, onChange, t }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 720px)');
  const [remotePayload, setRemotePayload] = useState(null);
  const [remoteStatus, setRemoteStatus] = useState('idle');
  const [themeVer, setThemeVer] = useState(0);
  const typeRef = useRef(resolvedType);
  const tRef = useRef(t);
  const onChangeRef = useRef(onChange);
  const rafRef = useRef(null);

  useEffect(() => {
    tRef.current = t;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === 'data-theme')) {
        setThemeVer((v) => v + 1);
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const tableId = block?.data?.tableId;
  const table = useMemo(
    () => tables?.find((item) => item.id === tableId) || tables?.[0] || null,
    [tableId, tables]
  );

  const columns = useMemo(() => table?.columns || [], [table?.columns]);
  const rows = useMemo(() => table?.rows || [], [table?.rows]);
  const indexColumn = columns.find((column) => column.type === 'index') || columns[0] || null;
  const numericColumns = columns.filter((column) => column.type === 'numeric');
  const categoryColumns = columns.filter((column) => column.type === 'category');

  const chartType = block.data?.chartType || 'line';
  const resolvedType =
    chartType === 'groupedBar'
      ? 'bar'
      : chartType === 'multiLine'
        ? 'line'
        : chartType === 'boxPlot'
          ? 'boxplot'
          : chartType;

  const xColumnOptions = indexColumn ? [indexColumn, ...numericColumns] : numericColumns;
  const fallbackX = xColumnOptions[0]?.id || '';
  const xColumnId = xColumnOptions.some((column) => column.id === block.data?.xColumnId)
    ? block.data.xColumnId
    : fallbackX;

  const legacyYIndex =
    Number.isInteger(block.data?.yIndex) && columns[block.data.yIndex]
      ? columns[block.data.yIndex].id
      : null;
  const initialY = block.data?.yColumnIds?.length
    ? block.data.yColumnIds
    : legacyYIndex
      ? [legacyYIndex]
      : numericColumns.map((column) => column.id).slice(0, 1);
  const normalizedY = initialY
    .filter((id) => numericColumns.some((column) => column.id === id))
    .slice(0, MAX_SERIES);
  const yColumnIds = normalizedY.length ? normalizedY : numericColumns.map((col) => col.id).slice(0, 1);

  const groupByColumnId = categoryColumns.some(
    (column) => column.id === block.data?.groupByColumnId
  )
    ? block.data.groupByColumnId
    : '';

  useEffect(() => {
    if (!table) return;
    const nextData = {
      tableId: table.id,
      chartType,
      xColumnId,
      yColumnIds,
      groupByColumnId
    };
    const changed =
      block.data?.tableId !== nextData.tableId ||
      block.data?.chartType !== nextData.chartType ||
      block.data?.xColumnId !== nextData.xColumnId ||
      block.data?.groupByColumnId !== nextData.groupByColumnId ||
      (block.data?.yColumnIds || []).join('|') !== nextData.yColumnIds.join('|');
    if (changed) {
      onChangeRef.current?.({ data: { ...block.data, ...nextData } });
    }
  }, [chartType, groupByColumnId, table, xColumnId, yColumnIds]);

  useEffect(() => {
    let cancelled = false;
    if (!table || dataMode !== DATA_MODE.api || !datasetId) {
      setRemotePayload(null);
      setRemoteStatus('idle');
      return undefined;
    }

    const apiChartType =
      chartType === 'groupedBar'
        ? 'bar'
        : chartType === 'multiLine'
          ? 'line'
          : chartType === 'boxPlot'
            ? 'boxPlot'
            : chartType;

    setRemoteStatus('loading');
    apiRequest(`/api/v1/datasets/${datasetId}/charts/prepare`, {
      method: 'POST',
      body: {
        chartConfig: {
          chartType: apiChartType,
          tableId: table.id,
          xKey: xColumnId,
          yKeys: yColumnIds,
          groupBy: groupByColumnId || ''
        },
        filters: []
      }
    })
      .then((response) => {
        if (cancelled) return;
        setRemotePayload(response.data || null);
        setRemoteStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setRemotePayload(null);
        setRemoteStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [chartType, dataMode, datasetId, groupByColumnId, table, xColumnId, yColumnIds]);

  const handleRetryRemote = useCallback(() => {
    setRemoteStatus('loading');
    const apiChartType =
      chartType === 'groupedBar'
        ? 'bar'
        : chartType === 'multiLine'
          ? 'line'
          : chartType === 'boxPlot'
            ? 'boxPlot'
            : chartType;

    apiRequest(`/api/v1/datasets/${datasetId}/charts/prepare`, {
      method: 'POST',
      body: {
        chartConfig: {
          chartType: apiChartType,
          tableId: table.id,
          xKey: xColumnId,
          yKeys: yColumnIds,
          groupBy: groupByColumnId || ''
        },
        filters: []
      }
    })
      .then((response) => {
        setRemotePayload(response.data || null);
        setRemoteStatus('ready');
      })
      .catch(() => {
        setRemotePayload(null);
        setRemoteStatus('error');
      });
  }, [chartType, datasetId, groupByColumnId, table, xColumnId, yColumnIds]);

  useEffect(() => {
    if (!canvasRef.current || !columns.length || rows.length === 0) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const tt = tRef.current;
    const seriesColors = getSeriesColors();
    const useRemote = dataMode === DATA_MODE.api && remoteStatus === 'ready' && remotePayload;
    const xIndex = columns.findIndex((column) => column.id === xColumnId);
    const groupIndex = columns.findIndex((column) => column.id === groupByColumnId);

    let labels;
    let datasets = [];
    let useLinear = false;

    if (useRemote) {
      labels = remotePayload.x?.values || [];
      datasets = (remotePayload.series || []).map((series, seriesIndex) => {
        const color = seriesColors[seriesIndex % seriesColors.length];
        const data = series.data || [];
        const first = data[0];
        const isPointData = first && typeof first === 'object' && 'x' in first && 'y' in first;
        if (isPointData) useLinear = true;
        return {
          label: series.name || `${tt('series')} ${seriesIndex + 1}`,
          data,
          parsing: !isPointData,
          borderColor: color.border,
          backgroundColor: color.background,
          pointRadius: 3,
          showLine: resolvedType !== 'scatter'
        };
      });
    } else {
      labels = rows.map((row, index) =>
        xIndex === -1 || columns[xIndex]?.type === 'index'
          ? String(index + 1)
          : String(row[xIndex] ?? '')
      );

      const useGroupedSeries =
        groupByColumnId &&
        groupIndex !== -1 &&
        ['line', 'multiLine', 'scatter'].includes(chartType);

      if (chartType === 'boxPlot') {
        if (groupByColumnId && groupIndex !== -1) {
          const groups = buildGroups(rows, groupIndex);
          labels = Array.from(groups.keys());
          datasets = yColumnIds.map((columnId, seriesIndex) => {
            const color = seriesColors[seriesIndex % seriesColors.length];
            const columnIndex = columns.findIndex((column) => column.id === columnId);
            return {
              label: columns[columnIndex]?.name || `${tt('series')} ${seriesIndex + 1}`,
              data: labels.map((group) => {
                const groupRows = groups.get(group) || [];
                const values = groupRows.map((row) => row[columnIndex]);
                return computeBoxPlot(values) || [];
              }),
              borderColor: color.border,
              backgroundColor: color.background
            };
          });
        } else {
          labels = yColumnIds.map(
            (columnId) => columns.find((column) => column.id === columnId)?.name || tt('chartData')
          );
          datasets = [
            {
              label: tt('chartData'),
              data: yColumnIds.map((columnId) => {
                const columnIndex = columns.findIndex((column) => column.id === columnId);
                const values = rows.map((row) => row[columnIndex]);
                return computeBoxPlot(values) || [];
              }),
              borderColor: seriesColors[0].border,
              backgroundColor: seriesColors[0].background
            }
          ];
        }
      } else if (groupByColumnId && groupIndex !== -1 && ['bar', 'groupedBar'].includes(chartType)) {
        const groups = buildGroups(rows, groupIndex);
        labels = Array.from(groups.keys());
        datasets = yColumnIds.map((columnId, seriesIndex) => {
          const columnIndex = columns.findIndex((column) => column.id === columnId);
          const color = seriesColors[seriesIndex % seriesColors.length];
          return {
            label: columns[columnIndex]?.name || `${tt('series')} ${seriesIndex + 1}`,
            data: labels.map((group) => {
              const groupRows = groups.get(group) || [];
              const values = groupRows.map((row) => parseNumber(row[columnIndex])).filter(Boolean);
              if (!values.length) return 0;
              return values.reduce((acc, value) => acc + value, 0) / values.length;
            }),
            borderColor: color.border,
            backgroundColor: color.background
          };
        });
      } else if (useGroupedSeries) {
        const groups = buildGroups(rows, groupIndex);
        const targetColumnId = yColumnIds[0];
        const targetColumnIndex = columns.findIndex((column) => column.id === targetColumnId);
        datasets = Array.from(groups.entries()).map(([group, groupRows], seriesIndex) => {
          const color = seriesColors[seriesIndex % seriesColors.length];
          const points = groupRows
            .map((row, index) => {
              const xVal =
                xIndex === -1 || columns[xIndex]?.type === 'index'
                  ? index + 1
                  : parseNumber(row[xIndex]);
              const yVal = parseNumber(row[targetColumnIndex]);
              if (xVal === null || yVal === null) return null;
              return { x: xVal, y: yVal };
            })
            .filter(Boolean);
          return {
            label: group,
            data: points,
            parsing: false,
            borderColor: color.border,
            backgroundColor: color.background,
            pointRadius: 3,
            showLine: chartType !== 'scatter'
          };
        });
        useLinear = true;
      } else {
        datasets = yColumnIds.map((columnId, seriesIndex) => {
          const columnIndex = columns.findIndex((column) => column.id === columnId);
          const color = seriesColors[seriesIndex % seriesColors.length];

          if (chartType === 'scatter') {
            const points = rows
              .map((row, index) => {
                const xVal =
                  xIndex === -1 || columns[xIndex]?.type === 'index'
                    ? index + 1
                    : parseNumber(row[xIndex]);
                const yVal = parseNumber(row[columnIndex]);
                if (xVal === null || yVal === null) return null;
                return { x: xVal, y: yVal };
              })
              .filter(Boolean);
            useLinear = true;
            return {
              label: columns[columnIndex]?.name || `${tt('series')} ${seriesIndex + 1}`,
              data: points,
              parsing: false,
              borderColor: color.border,
              backgroundColor: color.background,
              pointRadius: 3
            };
          }

          return {
            label: columns[columnIndex]?.name || `${tt('series')} ${seriesIndex + 1}`,
            data: rows.map((row) => parseNumber(row[columnIndex]) ?? null),
            borderColor: color.border,
            backgroundColor: color.background,
            pointRadius: 3,
            fill: false,
            tension: 0.25
          };
        });
      }
    }

    const nextType = resolvedType;
    const currentChart = chartRef.current;

    const applyUpdate = () => {
      rafRef.current = null;
      if (!canvasRef.current) return;

      const typeChanged = typeRef.current !== nextType;
      typeRef.current = nextType;

      if (currentChart && currentChart.canvas === canvasRef.current) {
        if (typeChanged) {
          currentChart.destroy();
          chartRef.current = new Chart(canvasRef.current, {
            type: nextType,
            data: { labels, datasets },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: { legend: { display: true } },
              scales: useLinear
                ? { x: { type: 'linear' }, y: { type: 'linear' } }
                : undefined
            }
          });
          return;
        }
        currentChart.data.labels = labels;
        currentChart.data.datasets = datasets;
        if (useLinear) {
          currentChart.options.scales = { x: { type: 'linear' }, y: { type: 'linear' } };
        }
        currentChart.update('none');
      } else {
        if (currentChart) currentChart.destroy();
        chartRef.current = new Chart(canvasRef.current, {
          type: nextType,
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: true } },
            scales: useLinear
              ? { x: { type: 'linear' }, y: { type: 'linear' } }
              : undefined
          }
        });
      }
    };

    rafRef.current = requestAnimationFrame(applyUpdate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [chartType, resolvedType, columns, dataMode, groupByColumnId, remotePayload, remoteStatus, rows, xColumnId, yColumnIds, themeVer]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  const handleResizeStop = () => {
    if (!containerRef.current) return;
    const { offsetWidth, offsetHeight } = containerRef.current;
    if (block.layout?.width !== offsetWidth || block.layout?.height !== offsetHeight) {
      onChange?.({ layout: { ...block.layout, width: offsetWidth, height: offsetHeight } });
    }
  };

  const setPresetSize = (width, height) => {
    onChange?.({ layout: { ...block.layout, width, height } });
  };

  const handleAddSeries = () => {
    if (yColumnIds.length >= MAX_SERIES) return;
    const next = numericColumns.find((column) => !yColumnIds.includes(column.id));
    if (!next) return;
    onChange?.({ data: { ...block.data, yColumnIds: [...yColumnIds, next.id] } });
  };

  const handleRemoveSeries = (targetId) => {
    if (yColumnIds.length <= 1) return;
    const next = yColumnIds.filter((id) => id !== targetId);
    onChange?.({ data: { ...block.data, yColumnIds: next } });
  };

  const showGroupSeriesHint =
    groupByColumnId &&
    categoryColumns.some((column) => column.id === groupByColumnId) &&
    ['line', 'multiLine', 'scatter'].includes(chartType) &&
    yColumnIds.length > 1;

  if (!table) {
    return (
      <div className="block-content">
        <div className="empty-hint">{t('tableMissing')}</div>
      </div>
    );
  }

  const sizes = [
    { id: 'sm', width: 280, height: 220, label: t('sizeSmall') },
    { id: 'md', width: 360, height: 260, label: t('sizeMedium') },
    { id: 'lg', width: 440, height: 320, label: t('sizeLarge') }
  ];

  const isRemoteLoading = dataMode === DATA_MODE.api && remoteStatus === 'loading';
  const isRemoteError = dataMode === DATA_MODE.api && remoteStatus === 'error';
  const isEmpty = rows.length === 0;

  return (
    <div className="block-content">
      <div className="chart-controls">
        <label className="field">
          <span>{t('chartTable')}</span>
          <select
            value={tableId || table.id}
            onChange={(event) =>
              onChange?.({ data: { ...block.data, tableId: event.target.value } })
            }
          >
            {tables.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('chartType')}</span>
          <select
            value={chartType}
            onChange={(event) =>
              onChange?.({ data: { ...block.data, chartType: event.target.value } })
            }
          >
            <option value="line">{t('line')}</option>
            <option value="multiLine">{t('multiLine')}</option>
            <option value="bar">{t('bar')}</option>
            <option value="groupedBar">{t('groupedBar')}</option>
            <option value="scatter">{t('scatter')}</option>
            <option value="boxPlot">{t('boxPlot')}</option>
          </select>
        </label>
        <label className="field">
          <span>{t('xAxis')}</span>
          <select
            value={xColumnId}
            onChange={(event) =>
              onChange?.({ data: { ...block.data, xColumnId: event.target.value } })
            }
          >
            {xColumnOptions.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('chartGroupBy')}</span>
          <select
            value={groupByColumnId || ''}
            onChange={(event) =>
              onChange?.({ data: { ...block.data, groupByColumnId: event.target.value } })
            }
          >
            <option value="">{t('analysisGroupNone')}</option>
            {categoryColumns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chart-series">
        <div className="series-header">
          <span className="analysis-label">{t('chartSeries')}</span>
          <span className="series-hint">{t('chartSeriesHint')}</span>
        </div>
        {yColumnIds.map((columnId) => {
          const column = numericColumns.find((item) => item.id === columnId);
          return (
            <div key={columnId} className="series-row">
              <label className="field">
                <span>{column?.name || t('series')}</span>
                <select
                  value={columnId}
                  onChange={(event) => {
                    const next = yColumnIds.map((id) =>
                      id === columnId ? event.target.value : id
                    );
                    onChange?.({ data: { ...block.data, yColumnIds: next } });
                  }}
                >
                  {numericColumns.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="series-actions">
                <button
                  className="icon-btn ghost"
                  type="button"
                  onClick={() => handleRemoveSeries(columnId)}
                  disabled={yColumnIds.length <= 1}
                >
                  x
                </button>
              </div>
            </div>
          );
        })}
        <button
          className="btn ghost"
          type="button"
          onClick={handleAddSeries}
          disabled={yColumnIds.length >= MAX_SERIES || numericColumns.length <= yColumnIds.length}
        >
          {t('addSeries')}
        </button>
        {showGroupSeriesHint ? (
          <div className="form-note">{t('chartGroupHint')}</div>
        ) : null}
      </div>

      {isMobile ? (
        <div className="size-presets">
          {sizes.map((size) => (
            <button
              key={size.id}
              className="btn ghost"
              type="button"
              onClick={() => setPresetSize(size.width, size.height)}
            >
              {size.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="form-note">{t('resizeHint')}</div>
      )}

      <div className="chart-container">
        <div
          className={`chart-resize ${isMobile ? 'locked' : ''}`}
          ref={containerRef}
          style={{
            width: block.layout?.width ? `${block.layout.width}px` : undefined,
            height: block.layout?.height ? `${block.layout.height}px` : undefined
          }}
          onPointerUp={handleResizeStop}
        >
          <canvas ref={canvasRef} />
        </div>

        {isEmpty && (
          <div className="chart-status chart-empty">
            <span>{t('chartNoData')}</span>
          </div>
        )}
        {!isEmpty && isRemoteLoading && (
          <div className="chart-status">
            <div className="spinner" />
            <span>{t('chartLoading')}</span>
          </div>
        )}
        {!isEmpty && isRemoteError && (
          <div className="chart-status chart-error">
            <span>{t('chartError')}</span>
            <button className="btn ghost" type="button" onClick={handleRetryRemote}>
              {t('chartRetry')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
