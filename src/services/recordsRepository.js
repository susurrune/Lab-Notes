import { apiRequest, ApiError } from './apiClient.js';

export const DATA_MODE = {
  api: 'api',
  local: 'local'
};

const RECORDS_KEY = 'lab_notes_records_by_user';

const readLocal = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeLocal = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const stripPayloadMeta = (record) => {
  const next = { ...record };
  delete next.datasetVersion;
  return next;
};

const buildDatasetPayload = (record, ownerId, orderIndex) => {
  const payload = {
    ...stripPayloadMeta(record),
    order: orderIndex,
    kind: 'record'
  };
  return {
    id: record.id,
    ownerId,
    name: record.name || 'Untitled Experiment',
    payload
  };
};

const mapDatasetToRecord = (dataset) => {
  const payload = dataset.payload && typeof dataset.payload === 'object' ? dataset.payload : {};
  return {
    ...payload,
    id: dataset.id,
    name: payload.name || dataset.name,
    datasetVersion: dataset.datasetVersion != null ? dataset.datasetVersion : dataset.version
  };
};

export const loadLocalRecords = (userId) => {
  const recordsByUser = readLocal(RECORDS_KEY) || {};
  return recordsByUser[userId] || [];
};

export const saveLocalRecords = (userId, records) => {
  const recordsByUser = readLocal(RECORDS_KEY) || {};
  writeLocal(RECORDS_KEY, { ...recordsByUser, [userId]: records });
};

export const loadRecords = async ({ userId, mode }) => {
  if (mode === DATA_MODE.local) {
    return { records: loadLocalRecords(userId), source: DATA_MODE.local };
  }

  try {
    const response = await apiRequest(`/api/v1/datasets?ownerId=${encodeURIComponent(userId)}`);
    const records = (response.data || [])
      .filter((item) => item?.payload?.kind === 'record' || item?.payload?.blocks)
      .map(mapDatasetToRecord)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return { records, source: DATA_MODE.api };
  } catch (error) {
    const fallback = loadLocalRecords(userId);
    return { records: fallback, source: DATA_MODE.local, error };
  }
};

export const upsertRecord = async ({ record, ownerId, orderIndex }) => {
  const payload = buildDatasetPayload(record, ownerId, orderIndex);
  try {
    await apiRequest(`/api/v1/datasets/${record.id}`, {
      method: 'PUT',
      body: payload
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await apiRequest('/api/v1/datasets', {
        method: 'POST',
        body: payload
      });
      return;
    }
    throw error;
  }
};

export const deleteRecord = async (recordId) => {
  await apiRequest(`/api/v1/datasets/${recordId}`, { method: 'DELETE' });
};

export const syncRecords = async ({ records, ownerId, removedIds }) => {
  const tasks = records.map((record, index) =>
    upsertRecord({ record, ownerId, orderIndex: index })
  );
  const deleteTasks = (removedIds || []).map((recordId) => deleteRecord(recordId));
  const results = await Promise.allSettled([...tasks, ...deleteTasks]);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) {
    console.error(`Sync: ${failed.length} operations failed`, failed.map(f => f.reason));
  }
};
