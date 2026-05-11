import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/apiClient.js';
import { DATA_MODE } from '../../services/recordsRepository.js';
import { computeGroupedStats, computeStats, formatMetric } from '../../utils/analysis.js';

const METRICS = ['count', 'avg', 'min', 'max'];

const STAT_LABELS = {
  count: 'statsCount',
  avg: 'statsAvg',
  median: 'statsMedian',
  std: 'statsStd',
  min: 'statsMin',
  max: 'statsMax'
};

const LOCAL_STAT_KEYS = ['count', 'average', 'median', 'std', 'min', 'max'];

const renderStatRow = (key, statsObj, t) => {
  const labelKey = STAT_LABELS[key];
  if (!labelKey) return null;
  const value = key === 'avg' ? (statsObj.avg ?? statsObj.average) : statsObj[key];
  if (value === undefined || value === null) return null;
  return (
    <span key={key}>
      {t(labelKey)}: {formatMetric(value)}
    </span>
  );
};

export default function AnalysisBlock({ datasetId, dataMode, tables, block, onChange, t }) {
  const [remoteResult, setRemoteResult] = useState([]);
  const [remoteStatus, setRemoteStatus] = useState('idle');
  const tableId = block?.data?.tableId;
  const table = useMemo(
    () => tables?.find((item) => item.id === tableId) || tables?.[0] || null,
    [tableId, tables]
  );

  const numericColumns = table?.columns?.filter((column) => column.type === 'numeric') || [];
  const categoryColumns =
    table?.columns?.filter((column) => column.type === 'category') || [];

  const groupById = block?.data?.groupByColumnId || '';
  const groupByColumn = categoryColumns.find((column) => column.id === groupById) || null;

  useEffect(() => {
    if (!table || !onChange) return;
    if (tableId !== table.id) {
      onChange({ data: { ...block.data, tableId: table.id } });
    } else if (groupById && !groupByColumn) {
      onChange({ data: { ...block.data, groupByColumnId: '' } });
    }
  }, [block.data, groupByColumn, groupById, onChange, table, tableId]);

  useEffect(() => {
    let cancelled = false;
    if (!table || dataMode !== DATA_MODE.api || !datasetId) {
      setRemoteStatus('idle');
      setRemoteResult([]);
      return undefined;
    }
    setRemoteStatus('loading');
    apiRequest(`/api/v1/datasets/${datasetId}/analysis/run`, {
      method: 'POST',
      body: {
        filters: [],
        groupBy: groupById || null,
        metrics: METRICS,
        tableId: table.id
      }
    })
      .then((response) => {
        if (cancelled) return;
        setRemoteResult(response.data?.result || []);
        setRemoteStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setRemoteStatus('error');
        setRemoteResult([]);
      });
    return () => {
      cancelled = true;
    };
  }, [dataMode, datasetId, groupById, table]);

  const handleRetryRemote = useCallback(() => {
    if (!table || !datasetId) return;
    setRemoteStatus('loading');
    apiRequest(`/api/v1/datasets/${datasetId}/analysis/run`, {
      method: 'POST',
      body: {
        filters: [],
        groupBy: groupById || null,
        metrics: METRICS,
        tableId: table.id
      }
    })
      .then((response) => {
        setRemoteResult(response.data?.result || []);
        setRemoteStatus('ready');
      })
      .catch(() => {
        setRemoteStatus('error');
        setRemoteResult([]);
      });
  }, [datasetId, groupById, table]);

  if (!table) {
    return (
      <div className="block-content">
        <div className="empty-hint">{t('tableMissing')}</div>
      </div>
    );
  }

  const useRemote = dataMode === DATA_MODE.api && remoteStatus === 'ready';
  const isRemoteLoading = dataMode === DATA_MODE.api && remoteStatus === 'loading';
  const isRemoteError = dataMode === DATA_MODE.api && remoteStatus === 'error';

  const stats = useRemote ? [] : computeStats(table);
  const groupedStats = useRemote
    ? []
    : groupByColumn
      ? computeGroupedStats(
          table,
          groupByColumn.id,
          numericColumns.map((column) => column.id)
        )
      : [];

  const remoteSummary = useMemo(() => {
    if (!useRemote) return [];
    const summary = [];
    numericColumns.forEach((column) => {
      const row = remoteResult.find(
        (entry) => entry.columnKey === column.id && !entry.group
      );
      summary.push({ column, stats: row || null });
    });
    return summary;
  }, [numericColumns, remoteResult, useRemote]);

  const remoteGrouped = useMemo(() => {
    if (!useRemote || !groupById) return [];
    const groups = new Map();
    remoteResult.forEach((entry) => {
      if (!entry.group) return;
      if (!groups.has(entry.group)) {
        groups.set(entry.group, {});
      }
      groups.get(entry.group)[entry.columnKey] = entry;
    });
    return Array.from(groups.entries()).map(([group, statsByColumn]) => ({
      group,
      statsByColumn
    }));
  }, [groupById, remoteResult, useRemote]);

  return (
    <div className="block-content">
      <div className="analysis-controls">
        <div className="analysis-source">
          <span className="analysis-label">{t('analysisTable')}</span>
          <span className="analysis-meta">{table.name}</span>
          <span className="analysis-meta">{table.id}</span>
        </div>
        <div className="analysis-columns">
          <span className="analysis-label">{t('analysisColumns')}</span>
          <div className="chip-list">
            {numericColumns.length ? (
              numericColumns.map((column) => (
                <span key={column.id} className="key-pill">
                  {column.name}
                </span>
              ))
            ) : (
              <span className="stat-empty">{t('analysisNoNumeric')}</span>
            )}
          </div>
        </div>
        <label className="field">
          <span>{t('analysisGroupBy')}</span>
          <select
            value={groupById || ''}
            onChange={(event) =>
              onChange?.({
                data: { ...block.data, groupByColumnId: event.target.value }
              })
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
        <div className="analysis-meta">
          {t('dataRows')} {table.rows.length} / {t('dataColumns')} {table.columns.length}
        </div>
      </div>

      {isRemoteLoading && (
        <div className="analysis-status">
          <div className="spinner" />
          <span>{t('analysisLoading')}</span>
        </div>
      )}

      {isRemoteError && (
        <div className="analysis-status analysis-error">
          <span>{t('analysisError')}</span>
          <button className="btn ghost" type="button" onClick={handleRetryRemote}>
            {t('analysisRetry')}
          </button>
        </div>
      )}

      <div className="analysis-summary">
        {numericColumns.length === 0 ? (
          <div className="stat-empty">{t('analysisNoNumeric')}</div>
        ) : useRemote ? (
          remoteSummary.map((entry) => (
            <div key={entry.column.id} className="stat-card">
              <div className="stat-title">{entry.column.name}</div>
              <div className="stat-values">
                {METRICS.map((key) => renderStatRow(key, entry.stats, t))}
                {renderStatRow('median', entry.stats, t)}
                {renderStatRow('std', entry.stats, t)}
              </div>
            </div>
          ))
        ) : (
          stats
            .filter((entry) => entry.stats)
            .map((entry) => (
              <div key={entry.column.id} className="stat-card">
                <div className="stat-title">{entry.column.name}</div>
                <div className="stat-values">
                  {LOCAL_STAT_KEYS.map((key) => renderStatRow(key, entry.stats, t))}
                </div>
              </div>
            ))
        )}
        {numericColumns.length > 0 && !useRemote && !isRemoteLoading && stats.some((entry) => !entry.stats) ? (
          <div className="stat-empty">{t('analysisNonNumeric')}</div>
        ) : null}
      </div>

      {groupByColumn && (useRemote ? remoteGrouped.length : groupedStats.length) ? (
        <div className="analysis-grouped">
          <div className="analysis-grouped-title">
            {t('analysisGroupedTitle')} {groupByColumn.name}
          </div>
          <div className="analysis-grouped-grid">
            {(useRemote ? remoteGrouped : groupedStats).map((group) => (
              <div key={group.group} className="summary-card">
                <div className="summary-title">{group.group}</div>
                <div className="summary-grid">
                  {numericColumns.map((column) => {
                    const groupStats = group.statsByColumn[column.id];
                    if (!groupStats) return null;
                    return (
                      <div key={column.id} className="summary-row">
                        <span>{column.name}</span>
                        <span>
                          {formatMetric(groupStats.avg ?? groupStats.average)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
