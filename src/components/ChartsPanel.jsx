import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  BarController,
  BarElement,
  ScatterController,
  PieController,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  BarController,
  BarElement,
  ScatterController,
  PieController,
  ArcElement,
  Tooltip,
  Legend
);

Chart.defaults.font.family = "'IBM Plex Serif', 'IBM Plex Sans', serif";
Chart.defaults.color = (() => {
  try {
    const v = getComputedStyle(document.body).getPropertyValue('--ink').trim();
    return v || '#1a1f24';
  } catch {
    return '#1a1f24';
  }
})();

const DEFAULT_CONFIG = {
  title: '',
  xLabel: '',
  yLabel: '',
  xUnit: '',
  yUnit: '',
  caption: '',
  showTrendline: true,
  showGrid: true,
  showLegend: false,
  lineWidth: 2,
  pointSize: 4,
  palette: 'classic',
  showLine: true,
  showBar: true,
  showScatter: true,
  showPie: true
};

const PALETTES = {
  classic: {
    line: '#2a6f97',
    bar: '#7bb0a8',
    scatter: '#d95d39',
    trend: '#4c7f8e'
  },
  colorBlind: {
    line: '#0072B2',
    bar: '#009E73',
    scatter: '#D55E00',
    trend: '#CC79A7'
  },
  gray: {
    line: '#3f3f3f',
    bar: '#6b6b6b',
    scatter: '#1f1f1f',
    trend: '#9a9a9a'
  }
};

const withAlpha = (hex, alpha) => {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildPieColors = (count, palette) => {
  const base = [palette.line, palette.bar, palette.scatter, palette.trend, '#8c7cc7'];
  return Array.from({ length: count }, (_, index) => withAlpha(base[index % base.length], 0.8));
};

const buildSeries = (rawData) => {
  const headers = rawData.headers;
  if (headers.length < 2) return null;

  const xValues = rawData.rows.map((row) => Number.parseFloat(row[0]));
  const yValues = rawData.rows.map((row) => Number.parseFloat(row[1]));

  const cleanPairs = xValues
    .map((x, index) => ({ x, y: yValues[index] }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  return {
    labels: cleanPairs.map((point) => point.x),
    points: cleanPairs,
    xLabel: headers[0],
    yLabel: headers[1]
  };
};

const computeRegression = (points) => {
  if (!points || points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((acc, point) => acc + point.x, 0);
  const sumY = points.reduce((acc, point) => acc + point.y, 0);
  const sumXX = points.reduce((acc, point) => acc + point.x * point.x, 0);
  const sumXY = points.reduce((acc, point) => acc + point.x * point.y, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssTot = points.reduce((acc, point) => acc + (point.y - meanY) ** 2, 0);
  const ssRes = points.reduce(
    (acc, point) => acc + (point.y - (slope * point.x + intercept)) ** 2,
    0
  );
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2, n };
};

const buildTrendline = (points, regression) => {
  if (!regression || points.length < 2) return [];
  const xs = points.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return [
    { x: minX, y: regression.slope * minX + regression.intercept },
    { x: maxX, y: regression.slope * maxX + regression.intercept }
  ];
};

const useChart = (ref, config, chartRef) => {
  useEffect(() => {
    if (!ref.current) return undefined;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, config);
    return () => chartRef.current?.destroy();
  }, [ref, config, chartRef]);
};

const formatMetric = (value) => {
  if (!Number.isFinite(value)) return '--';
  return Number(value).toFixed(3);
};

export default function ChartsPanel({ rawData, stats, analysisConfig, onConfigChange, t }) {
  const [configOpen, setConfigOpen] = useState(true);
  const [activeChart, setActiveChart] = useState('line');
  const lineRef = useRef(null);
  const barRef = useRef(null);
  const scatterRef = useRef(null);
  const pieRef = useRef(null);
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const scatterChartRef = useRef(null);
  const pieChartRef = useRef(null);

  const series = useMemo(() => buildSeries(rawData), [rawData]);
  const config = { ...DEFAULT_CONFIG, ...(analysisConfig || {}) };
  const palette = PALETTES[config.palette] || PALETTES.classic;
  const regression = useMemo(
    () => (series ? computeRegression(series.points) : null),
    [series]
  );
  const trendline = useMemo(
    () => (series ? buildTrendline(series.points, regression) : []),
    [series, regression]
  );

  const xBaseLabel = config.xLabel || series?.xLabel || '';
  const yBaseLabel = config.yLabel || series?.yLabel || '';
  const xLabel = config.xUnit ? `${xBaseLabel} (${config.xUnit})` : xBaseLabel;
  const yLabel = config.yUnit ? `${yBaseLabel} (${config.yUnit})` : yBaseLabel;
  const figureTitle = config.title?.trim();
  const lineWidth = Number(config.lineWidth) || 2;
  const pointSize = Number(config.pointSize) || 4;

  const baseOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: 2,
      plugins: {
        legend: { display: config.showLegend },
        tooltip: {
          callbacks: {
            label: (context) => {
              const { raw, parsed } = context;
              const value = raw?.y ?? parsed?.y ?? raw;
              return `${context.dataset.label}: ${formatMetric(Number(value))}`;
            }
          }
        },
        title: {
          display: Boolean(figureTitle),
          text: figureTitle || '',
          font: {
            size: 13,
            weight: '600'
          }
        }
      }
    }),
    [config.showLegend, figureTitle]
  );

  const lineConfig = useMemo(() => {
    if (!series) {
      return { type: 'line', data: { datasets: [] }, options: baseOptions };
    }
    const defaultTitle = `${series.yLabel} vs ${series.xLabel}`;
    const titleText = figureTitle ? `${figureTitle} · ${t('line')}` : defaultTitle;
    const datasets = [
      {
        label: defaultTitle,
        data: series.points,
        parsing: false,
        borderColor: palette.line,
        backgroundColor: withAlpha(palette.line, 0.16),
        borderWidth: lineWidth,
        pointRadius: pointSize,
        pointBackgroundColor: palette.line,
        pointBorderColor: palette.line,
        tension: 0.25
      }
    ];
    if (config.showTrendline && trendline.length) {
      datasets.push({
        label: t('trendline'),
        data: trendline,
        parsing: false,
        borderColor: palette.trend,
        borderDash: [6, 4],
        borderWidth: Math.max(1, lineWidth - 1),
        pointRadius: 0
      });
    }
    return {
      type: 'line',
      data: { datasets },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: { ...baseOptions.plugins.title, display: Boolean(titleText), text: titleText }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: Boolean(xLabel), text: xLabel },
            grid: { display: config.showGrid, color: (typeof document !== 'undefined' ? (getComputedStyle(document.body).getPropertyValue('--grid').trim() || 'rgba(18, 24, 29, 0.08)') : 'rgba(18, 24, 29, 0.08)') }
          },
          y: {
            title: { display: Boolean(yLabel), text: yLabel },
            grid: { display: config.showGrid, color: (typeof document !== 'undefined' ? (getComputedStyle(document.body).getPropertyValue('--grid').trim() || 'rgba(18, 24, 29, 0.08)') : 'rgba(18, 24, 29, 0.08)') }
          }
        }
      }
    };
  }, [
    baseOptions,
    config.showGrid,
    config.showTrendline,
    figureTitle,
    lineWidth,
    palette.line,
    palette.trend,
    pointSize,
    series,
    t,
    trendline,
    xLabel,
    yLabel
  ]);

  const barConfig = useMemo(() => {
    if (!series) {
      return { type: 'bar', data: { labels: [], datasets: [] }, options: baseOptions };
    }
    const defaultTitle = `${series.yLabel} vs ${series.xLabel}`;
    const titleText = figureTitle ? `${figureTitle} · ${t('bar')}` : defaultTitle;
    const yValues = series.points.map((point) => point.y);
    const mean =
      yValues.length > 0
        ? yValues.reduce((acc, value) => acc + value, 0) / yValues.length
        : 0;
    const datasets = [
      {
        label: series.yLabel,
        data: yValues,
        backgroundColor: withAlpha(palette.bar, 0.7),
        borderColor: palette.bar,
        borderWidth: 1
      }
    ];
    if (config.showTrendline && yValues.length) {
      datasets.push({
        type: 'line',
        label: t('meanLine'),
        data: yValues.map(() => mean),
        borderColor: palette.trend,
        borderWidth: Math.max(1, lineWidth - 1),
        pointRadius: 0
      });
    }
    return {
      type: 'bar',
      data: { labels: series.labels, datasets },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: { ...baseOptions.plugins.title, display: Boolean(titleText), text: titleText }
        },
        scales: {
          x: {
            title: { display: Boolean(xLabel), text: xLabel },
            grid: { display: false }
          },
          y: {
            title: { display: Boolean(yLabel), text: yLabel },
            grid: { display: config.showGrid, color: (typeof document !== 'undefined' ? (getComputedStyle(document.body).getPropertyValue('--grid').trim() || 'rgba(18, 24, 29, 0.08)') : 'rgba(18, 24, 29, 0.08)') }
          }
        }
      }
    };
  }, [
    baseOptions,
    config.showGrid,
    config.showTrendline,
    figureTitle,
    lineWidth,
    palette.bar,
    palette.trend,
    series,
    t,
    xLabel,
    yLabel
  ]);

  const scatterConfig = useMemo(() => {
    if (!series) {
      return { type: 'scatter', data: { datasets: [] }, options: baseOptions };
    }
    const defaultTitle = `${series.yLabel} vs ${series.xLabel}`;
    const titleText = figureTitle ? `${figureTitle} · ${t('scatter')}` : defaultTitle;
    const datasets = [
      {
        label: defaultTitle,
        data: series.points,
        parsing: false,
        backgroundColor: palette.scatter,
        pointRadius: pointSize,
        pointHoverRadius: pointSize + 1
      }
    ];
    if (config.showTrendline && trendline.length) {
      datasets.push({
        type: 'line',
        label: t('trendline'),
        data: trendline,
        parsing: false,
        borderColor: palette.trend,
        borderDash: [6, 4],
        borderWidth: Math.max(1, lineWidth - 1),
        pointRadius: 0
      });
    }
    return {
      type: 'scatter',
      data: { datasets },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: { ...baseOptions.plugins.title, display: Boolean(titleText), text: titleText }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: Boolean(xLabel), text: xLabel },
            grid: { display: config.showGrid, color: (typeof document !== 'undefined' ? (getComputedStyle(document.body).getPropertyValue('--grid').trim() || 'rgba(18, 24, 29, 0.08)') : 'rgba(18, 24, 29, 0.08)') }
          },
          y: {
            title: { display: Boolean(yLabel), text: yLabel },
            grid: { display: config.showGrid, color: (typeof document !== 'undefined' ? (getComputedStyle(document.body).getPropertyValue('--grid').trim() || 'rgba(18, 24, 29, 0.08)') : 'rgba(18, 24, 29, 0.08)') }
          }
        }
      }
    };
  }, [
    baseOptions,
    config.showGrid,
    config.showTrendline,
    figureTitle,
    lineWidth,
    palette.scatter,
    palette.trend,
    pointSize,
    series,
    t,
    trendline,
    xLabel,
    yLabel
  ]);

  useChart(lineRef, lineConfig, lineChartRef);
  useChart(barRef, barConfig, barChartRef);
  useChart(scatterRef, scatterConfig, scatterChartRef);
  const pieConfig = useMemo(() => {
    if (!series) {
      return { type: 'pie', data: { labels: [], datasets: [] }, options: baseOptions };
    }
    const titleText = figureTitle ? `${figureTitle} · ${t('pie')}` : series?.yLabel || t('pie');
    const yValues = series.points.map((point) => point.y);
    const colors = buildPieColors(yValues.length, palette);
    return {
      type: 'pie',
      data: {
        labels: series.labels,
        datasets: [
          {
            data: yValues,
            backgroundColor: colors,
            borderColor: colors.map((color) => color.replace('0.8', '1')),
            borderWidth: 1
          }
        ]
      },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: { ...baseOptions.plugins.title, display: Boolean(titleText), text: titleText }
        }
      }
    };
  }, [baseOptions, figureTitle, palette, series, t]);
  useChart(pieRef, pieConfig, pieChartRef);

  const exportChart = (chartRef, name) => {
    if (!chartRef.current) return;
    const url = chartRef.current.toBase64Image('image/png', 1);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name || 'chart'}.png`;
    link.click();
  };

  return (
    <section className="panel" id="analysis-section">
      <header className="panel-header">
        <div className="panel-header-row">
          <div>
            <h2>{t('analysisTitle')}</h2>
            <p>{t('analysisDesc')}</p>
          </div>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setConfigOpen((prev) => !prev)}
          >
            {configOpen ? t('collapseConfig') : t('openConfig')}
          </button>
        </div>
        <div className="panel-hint">{t('resizeHint')}</div>
      </header>
      <div className="panel-body">
        {configOpen ? (
          <div className="analysis-controls">
          <div className="analysis-grid">
            <label className="field">
              <span>{t('figureTitle')}</span>
              <input
                type="text"
                value={config.title}
                onChange={(event) => onConfigChange?.({ ...config, title: event.target.value })}
                placeholder={t('figureTitle')}
              />
            </label>
            <label className="field">
              <span>{t('xAxisLabel')}</span>
              <input
                type="text"
                value={config.xLabel}
                onChange={(event) => onConfigChange?.({ ...config, xLabel: event.target.value })}
                placeholder={series?.xLabel || t('xAxisLabel')}
              />
            </label>
            <label className="field">
              <span>{t('xAxisUnit')}</span>
              <input
                type="text"
                value={config.xUnit}
                onChange={(event) => onConfigChange?.({ ...config, xUnit: event.target.value })}
                placeholder="unit"
              />
            </label>
            <label className="field">
              <span>{t('yAxisLabel')}</span>
              <input
                type="text"
                value={config.yLabel}
                onChange={(event) => onConfigChange?.({ ...config, yLabel: event.target.value })}
                placeholder={series?.yLabel || t('yAxisLabel')}
              />
            </label>
            <label className="field">
              <span>{t('yAxisUnit')}</span>
              <input
                type="text"
                value={config.yUnit}
                onChange={(event) => onConfigChange?.({ ...config, yUnit: event.target.value })}
                placeholder="unit"
              />
            </label>
            <label className="field">
              <span>{t('palette')}</span>
              <select
                value={config.palette}
                onChange={(event) => onConfigChange?.({ ...config, palette: event.target.value })}
              >
                <option value="classic">{t('paletteClassic')}</option>
                <option value="colorBlind">{t('paletteColorBlind')}</option>
                <option value="gray">{t('paletteGray')}</option>
              </select>
            </label>
          </div>
          <div className="analysis-grid">
            <label className="field">
              <span>{t('chartCaption')}</span>
              <textarea
                rows="2"
                value={config.caption}
                onChange={(event) => onConfigChange?.({ ...config, caption: event.target.value })}
                placeholder={t('chartCaption')}
              />
            </label>
          </div>
          <div className="analysis-toggles">
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={config.showTrendline}
                onChange={(event) => onConfigChange?.({ ...config, showTrendline: event.target.checked })}
              />
              {t('showTrendline')}
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={config.showGrid}
                onChange={(event) => onConfigChange?.({ ...config, showGrid: event.target.checked })}
              />
              {t('showGrid')}
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={config.showLegend}
                onChange={(event) => onConfigChange?.({ ...config, showLegend: event.target.checked })}
              />
              {t('showLegend')}
            </label>
            <label className="analysis-slider">
              <span>{t('lineWidth')}</span>
              <input
                type="range"
                min="1"
                max="4"
                value={lineWidth}
                onChange={(event) => onConfigChange?.({ ...config, lineWidth: event.target.value })}
              />
            </label>
            <label className="analysis-slider">
              <span>{t('pointSize')}</span>
              <input
                type="range"
                min="2"
                max="6"
                value={pointSize}
                onChange={(event) => onConfigChange?.({ ...config, pointSize: event.target.value })}
              />
            </label>
          </div>
          <div className="analysis-types">
            <span className="analysis-label">{t('chartTypes')}</span>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={config.showLine}
                onChange={(event) => onConfigChange?.({ ...config, showLine: event.target.checked })}
              />
              {t('line')}
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={config.showBar}
                onChange={(event) => onConfigChange?.({ ...config, showBar: event.target.checked })}
              />
              {t('bar')}
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={config.showScatter}
                onChange={(event) =>
                  onConfigChange?.({ ...config, showScatter: event.target.checked })
                }
              />
              {t('scatter')}
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={config.showPie}
                onChange={(event) => onConfigChange?.({ ...config, showPie: event.target.checked })}
              />
              {t('pie')}
            </label>
          </div>
        </div>
        ) : null}

        <div className="analysis-summary">
          <div className="summary-card">
            <div className="summary-title">{t('analysisSummaryTitle')}</div>
            {regression ? (
              <div className="summary-grid">
                <div className="summary-row">
                  <span>{t('regressionSlope')}</span>
                  <span>{formatMetric(regression.slope)}</span>
                </div>
                <div className="summary-row">
                  <span>{t('regressionIntercept')}</span>
                  <span>{formatMetric(regression.intercept)}</span>
                </div>
                <div className="summary-row">
                  <span>{t('regressionR2')}</span>
                  <span>{formatMetric(regression.r2)}</span>
                </div>
                <div className="summary-row">
                  <span>{t('statsCount')}</span>
                  <span>{regression.n}</span>
                </div>
              </div>
            ) : (
              <span className="stat-empty">{t('regressionNone')}</span>
            )}
          </div>
        </div>

        <div className="stats-grid">
          {stats.map((entry) => (
            <div key={entry.column?.id || entry.header} className="stat-card">
              <div className="stat-title">{entry.column?.name || entry.header}</div>
              {entry.stats ? (
                <div className="stat-values">
                  <span>
                    {t('statsAvg')}: {formatMetric(entry.stats.average)}
                  </span>
                  <span>
                    {t('statsMedian')}: {formatMetric(entry.stats.median)}
                  </span>
                  <span>
                    {t('statsStd')}: {formatMetric(entry.stats.std)}
                  </span>
                  <span>
                    {t('statsMax')}: {formatMetric(entry.stats.max)}
                  </span>
                  <span>
                    {t('statsMin')}: {formatMetric(entry.stats.min)}
                  </span>
                  <span>
                    {t('statsCount')}: {entry.stats.count}
                  </span>
                </div>
              ) : (
                <span className="stat-empty">{t('nonNumeric')}</span>
              )}
            </div>
          ))}
        </div>

        <div className="chart-grid">
          {config.showLine ? (
            <div
              className={`chart-card resizable ${activeChart === 'line' ? 'active' : ''}`}
              onClick={() => {
                setActiveChart('line');
                setConfigOpen(true);
              }}
            >
            <div className="chart-toolbar">
              <h3>{t('line')}</h3>
              <button
                className="btn ghost"
                type="button"
                onClick={() => exportChart(lineChartRef, 'line-chart')}
              >
                {t('exportChart')}
              </button>
            </div>
            <div className="chart-frame">
              <canvas ref={lineRef} />
            </div>
          </div>
          ) : null}
          {config.showBar ? (
            <div
              className={`chart-card resizable ${activeChart === 'bar' ? 'active' : ''}`}
              onClick={() => {
                setActiveChart('bar');
                setConfigOpen(true);
              }}
            >
            <div className="chart-toolbar">
              <h3>{t('bar')}</h3>
              <button
                className="btn ghost"
                type="button"
                onClick={() => exportChart(barChartRef, 'bar-chart')}
              >
                {t('exportChart')}
              </button>
            </div>
            <div className="chart-frame">
              <canvas ref={barRef} />
            </div>
          </div>
          ) : null}
          {config.showScatter ? (
            <div
              className={`chart-card resizable ${activeChart === 'scatter' ? 'active' : ''}`}
              onClick={() => {
                setActiveChart('scatter');
                setConfigOpen(true);
              }}
            >
            <div className="chart-toolbar">
              <h3>{t('scatter')}</h3>
              <button
                className="btn ghost"
                type="button"
                onClick={() => exportChart(scatterChartRef, 'scatter-chart')}
              >
                {t('exportChart')}
              </button>
            </div>
            <div className="chart-frame">
              <canvas ref={scatterRef} />
            </div>
          </div>
          ) : null}
          {config.showPie ? (
            <div
              className={`chart-card resizable ${activeChart === 'pie' ? 'active' : ''}`}
              onClick={() => {
                setActiveChart('pie');
                setConfigOpen(true);
              }}
            >
              <div className="chart-toolbar">
                <h3>{t('pie')}</h3>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => exportChart(pieChartRef, 'pie-chart')}
                >
                  {t('exportChart')}
                </button>
              </div>
              <div className="chart-frame">
                <canvas ref={pieRef} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
