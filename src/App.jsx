import { useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import WorkspaceBlocks from './components/WorkspaceBlocks.jsx';
import AutoSaveNotice from './components/AutoSaveNotice.jsx';
import NewRecordModal from './components/NewRecordModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';
import RecordEditModal from './components/RecordEditModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ExtensionsModal from './components/ExtensionsModal.jsx';
import { useAppDispatch, useAppState } from './context/AppState.jsx';
import { baseTemplates } from './data/templates.js';
import { blankRecord, sampleRecords } from './data/sampleData.js';
import { translate } from './data/i18n.js';
import { marketplaceTemplates } from './data/marketplace.js';
import { extensionsCatalog } from './data/extensions.js';
import { blockCatalog, buildBlock, insertBlockByOrder, sortBlocksByOrder } from './data/blocks.js';
import { createTable, migrateRawDataToTable, normalizeTable, MAX_TABLES } from './data/tables.js';
import {
  DATA_MODE,
  loadRecords,
  saveLocalRecords,
  syncRecords
} from './services/recordsRepository.js';

const LEGACY_RECORDS_KEY = 'lab_notes_records';
const GUEST_ID = 'guest';
const STORAGE_KEYS = [
  'lab_notes_users',
  'lab_notes_auth_session',
  'lab_notes_records_by_user',
  'lab_notes_templates_by_user',
  'lab_notes_drafts_by_user',
  'lab_notes_extensions_by_user',
  'lab_notes_settings'
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readLocal = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const cloneRecords = (records) => JSON.parse(JSON.stringify(records || []));

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHistoryEntry = (record, action, t) => ({
  id: crypto.randomUUID(),
  time: new Date().toLocaleString(),
  action,
  summary: record.name || t('untitled')
});

const getPrimaryTable = (record, t) => {
  if (record?.tables?.length) {
    return record.tables[0];
  }
  if (record?.rawData) {
    return migrateRawDataToTable(record.rawData, t('tableDefaultName'));
  }
  return createTable({ name: t('tableDefaultName') });
};

const buildRecordHtml = (record, t) => {
  const priorityLabelMap = {
    high: t('priorityHigh'),
    medium: t('priorityMedium'),
    low: t('priorityLow')
  };
  const table = getPrimaryTable(record, t);
  const visibleColumns = table.columns.filter((column) => column.visible !== false);
  const columnIndexes = visibleColumns.map((column) => table.columns.indexOf(column));
  const rows = table.rows
    .map(
      (row) =>
        `<tr>${columnIndexes
          .map((index) => `<td>${escapeHtml(row[index])}</td>`)
          .join('')}</tr>`
    )
    .join('');
  const headers = visibleColumns
    .map((column) => `<th>${escapeHtml(column.name)}</th>`)
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #1a1f24; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 8px; }
      .meta { margin-bottom: 16px; font-size: 12px; color: #4c5b63; }
      table { border-collapse: collapse; width: 100%; margin-top: 12px; }
      th, td { border: 1px solid #d9dee2; padding: 6px 8px; font-size: 12px; }
      th { background: #f4f6f8; text-align: left; }
      .section { margin-top: 18px; }
      .tag { display: inline-block; padding: 2px 6px; border: 1px solid #d0d6db; margin-right: 6px; border-radius: 10px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(record.name || t('untitled'))}</h1>
    <div class="meta">
      ${t('date')}: ${escapeHtml(record.date)} |
      ${t('researcher')}: ${escapeHtml(record.person || t('unassigned'))} |
      ${t('priority')}: ${escapeHtml(priorityLabelMap[record.priority] || record.priority)}
    </div>
    <div class="section">
      <strong>${t('objective')}:</strong>
      <div>${escapeHtml(record.purpose)}</div>
    </div>
    <div class="section">
      <strong>${t('tags')}:</strong>
      <div>${(record.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    </div>
    <div class="section">
      <strong>${t('steps')}:</strong>
      <ol>${record.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    </div>
    <div class="section">
      <strong>${t('rawData')}:</strong>
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="section">
      <strong>${t('remarks')}:</strong>
      <div>${escapeHtml(record.remarks)}</div>
    </div>
  </body>
</html>`;
};

export default function App() {
  const {
    users,
    authSession,
    recordsByUser,
    templatesByUser,
    draftsByUser,
    settings,
    extensionsByUser
  } = useAppState();
  const dispatch = useAppDispatch();
  const [records, setRecords] = useState(() => sampleRecords);
  const [selectedId, setSelectedId] = useState(() => sampleRecords[0]?.id ?? null);
  const [draft, setDraft] = useState(() => blankRecord());
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [authDialog, setAuthDialog] = useState({ isOpen: false, mode: 'login', notice: '' });

  const prevUserIdRef = useRef(null);
  const prevRecordIdsRef = useRef(new Set());
  const lang = settings.language || 'zh';
  const t = useMemo(() => (key) => translate(lang, key), [lang]);
  const dataMode = settings.dataMode || DATA_MODE.api;

  useEffect(() => {
    document.body.dataset.theme = settings.theme || 'light';
  }, [settings.theme]);

  const setUsers = (updater) => {
    const next = typeof updater === 'function' ? updater(users) : updater;
    dispatch({ type: 'SET_USERS', payload: next });
  };

  const setAuthSession = (value) => {
    dispatch({ type: 'SET_AUTH_SESSION', payload: value });
  };

  const setSettings = (updater) => {
    const next = typeof updater === 'function' ? updater(settings) : updater;
    dispatch({ type: 'SET_SETTINGS', payload: next });
  };

  const setUserRecords = (userId, recordsForUser) => {
    dispatch({
      type: 'SET_USER_RECORDS',
      payload: { userId, records: recordsForUser }
    });
  };

  const setUserTemplates = (userId, templates) => {
    dispatch({
      type: 'SET_USER_TEMPLATES',
      payload: { userId, templates }
    });
  };

  const setUserDraft = (userId, draftValue) => {
    dispatch({
      type: 'SET_USER_DRAFT',
      payload: { userId, draft: draftValue }
    });
  };

  const setUserExtensions = (userId, extensions) => {
    dispatch({
      type: 'SET_USER_EXTENSIONS',
      payload: { userId, extensions }
    });
  };

  const updateUser = (userId, patch) => {
    dispatch({ type: 'UPDATE_USER', payload: { userId, patch } });
  };

  const currentUser = useMemo(() => {
    if (!authSession?.userId) return null;
    return users.find((user) => user.id === authSession.userId) || null;
  }, [authSession, users]);

  const currentUserId = currentUser?.id || GUEST_ID;
  const enabledExtensions = extensionsByUser[currentUserId] || [];

  const customTemplates = useMemo(
    () => (currentUser ? templatesByUser[currentUser.id] || [] : []),
    [templatesByUser, currentUser]
  );

  const blockTemplates = useMemo(() => {
    return blockCatalog.reduce((acc, item) => {
      acc[item.type] = buildBlock({ type: item.type, title: t(item.titleKey), settings });
      return acc;
    }, {});
  }, [settings, t]);

  const withTableId = (block, tableId) => {
    if (!['table', 'analysis', 'chart'].includes(block.type)) return block;
    if (block.data?.tableId) return block;
    return { ...block, data: { ...block.data, tableId } };
  };

  const buildDefaultBlocks = (tables) => {
    const defaultTableId = tables[0]?.id || '';
    return blockCatalog
      .filter((item) => item.core)
      .map((item) => ({
        ...withTableId(blockTemplates[item.type], defaultTableId),
        locked: item.locked ?? false
      }));
  };

  const normalizeBlock = (block, tables) => {
    const template = blockTemplates[block.type];
    if (!template) return block;
    const normalized = {
      ...block,
      title: block.title || template.title,
      collapsed: typeof block.collapsed === 'boolean' ? block.collapsed : template.collapsed,
      locked: typeof block.locked === 'boolean' ? block.locked : template.locked,
      createdAt: block.createdAt || template.createdAt,
      data: { ...template.data, ...(block.data || {}) },
      layout: { ...template.layout, ...(block.layout || {}) }
    };
    if (!tables?.length) return normalized;
    const tableId = normalized.data?.tableId;
    const exists = tables.some((table) => table.id === tableId);
    if (!exists) {
      return { ...normalized, data: { ...normalized.data, tableId: tables[0].id } };
    }
    return normalized;
  };

  const normalizeRecord = (record) => {
    const tables = Array.isArray(record.tables) && record.tables.length
      ? record.tables.map((table) => normalizeTable(table)).filter(Boolean)
      : [migrateRawDataToTable(record.rawData, t('tableDefaultName'))];
    if (!Array.isArray(record.blocks) || record.blocks.length === 0) {
      const nextBlocks = buildDefaultBlocks(tables);
      return { ...record, tables, blocks: nextBlocks, blocksSorted: true };
    }
    const normalized = record.blocks.map((block) => normalizeBlock(block, tables));
    const nextBlocks = record.blocksSorted ? normalized : sortBlocksByOrder(normalized);
    return { ...record, tables, blocks: nextBlocks, blocksSorted: true };
  };

  useEffect(() => {
    if (authSession?.userId && !currentUser) {
      setAuthSession(null);
    }
  }, [authSession, currentUser]);

  useEffect(() => {
    let cancelled = false;
    const key = `${currentUser?.id || 'guest'}|${dataMode}`;
    if (dataMode === DATA_MODE.api && prevUserIdRef.current === key) return;
    prevUserIdRef.current = key;

    const load = async () => {
      if (!currentUser) {
        const normalized = sampleRecords.map(normalizeRecord);
        if (cancelled) return;
        setRecords(normalized);
        setSelectedId((prev) => (normalized.some(r => r.id === prev) ? prev : normalized[0]?.id ?? null));
        setDraft((prev) => normalized.find(r => r.id === prev.id) || normalized[0] || blankRecord(t));
        return;
      }

      if (dataMode === DATA_MODE.local) {
        const storedRecords = recordsByUser[currentUser.id];
        if (!storedRecords) {
          const legacyRecords = readLocal(LEGACY_RECORDS_KEY);
          const seededRecords =
            Array.isArray(legacyRecords) && legacyRecords.length
              ? legacyRecords
              : cloneRecords(sampleRecords);
          const normalized = seededRecords.map(normalizeRecord);
          setUserRecords(currentUser.id, normalized);
          prevRecordIdsRef.current = new Set(normalized.map((record) => record.id));
          setRecords(normalized);
          setSelectedId((prev) => (normalized.some(r => r.id === prev) ? prev : normalized[0]?.id ?? null));
          setDraft((prev) => normalized.find(r => r.id === prev.id) || normalized[0] || blankRecord(t));
          return;
        }

        let needsUpdate = false;
        const normalized = storedRecords.map((record) => {
          if (!record.blocks || record.blocks.length === 0) {
            needsUpdate = true;
          }
          return normalizeRecord(record);
        });
        if (needsUpdate) {
          setUserRecords(currentUser.id, normalized);
        }
        prevRecordIdsRef.current = new Set(normalized.map((record) => record.id));
        setRecords(normalized);
        setSelectedId((prev) => (normalized.some(r => r.id === prev) ? prev : normalized[0]?.id ?? null));
        setDraft((prev) => normalized.find(r => r.id === prev.id) || normalized[0] || blankRecord(t));
        return;
      }

      const { records: loaded } = await loadRecords({
        userId: currentUser.id,
        mode: dataMode
      });
      const sourceRecords = loaded.length ? loaded : cloneRecords(sampleRecords);
      const normalized = sourceRecords.map(normalizeRecord);
      if (cancelled) return;
      setUserRecords(currentUser.id, normalized);
      prevRecordIdsRef.current = new Set(normalized.map((record) => record.id));
      setRecords(normalized);
      setSelectedId((prev) => (normalized.some(r => r.id === prev) ? prev : normalized[0]?.id ?? null));
      setDraft((prev) => normalized.find(r => r.id === prev.id) || normalized[0] || blankRecord(t));
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser, recordsByUser, blockTemplates, dataMode]);

  useEffect(() => {
    if (!selectedId) return;
    const found = records.find((record) => record.id === selectedId);
    if (found) {
      const marketTemplate = marketplaceTemplates.find(
        (template) => `market-${template.id}` === found.templateType
      );
      const customTemplate = customTemplates.find(
        (template) => `custom-${template.id}` === found.templateType
      );
      const needsTemplate =
        found.templateType !== 'blank' &&
        found.templateType !== 'imported' &&
        !marketTemplate &&
        !customTemplate;
      const templateFields =
        found.templateFields?.length > 0
          ? found.templateFields
          : marketTemplate
            ? marketTemplate.fields
            : customTemplate
              ? customTemplate.fields
              : needsTemplate
                ? (baseTemplates[found.templateType] || baseTemplates.general).fields
                : [];
      setDraft({ ...normalizeRecord(found), templateFields });
    }
  }, [records, selectedId, customTemplates]);

  useEffect(() => {
    if (!settings.autoSave) return;
    const timeout = setTimeout(() => {
      const ownerKey = currentUser?.id || GUEST_ID;
      setUserDraft(ownerKey, draft);
      setLastSavedAt(new Date().toLocaleTimeString());
    }, settings.autoSaveInterval || 10000);

    return () => clearTimeout(timeout);
  }, [draft, settings.autoSave, settings.autoSaveInterval, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setUserRecords(currentUser.id, records);
    saveLocalRecords(currentUser.id, records);

    if (dataMode !== DATA_MODE.api) return;
    const currentIds = new Set(records.map((record) => record.id));
    const removedIds = Array.from(prevRecordIdsRef.current).filter(
      (id) => !currentIds.has(id)
    );
    prevRecordIdsRef.current = currentIds;

    const timeout = setTimeout(() => {
      syncRecords({
        records,
        ownerId: currentUser.id,
        removedIds
      }).catch(() => {});
    }, 600);

    return () => clearTimeout(timeout);
  }, [records, currentUser, dataMode]);

  useEffect(() => {
    if (
      draft.templateType === 'blank' ||
      draft.templateType === 'imported' ||
      (typeof draft.templateType === 'string' && draft.templateType.startsWith('market-')) ||
      (typeof draft.templateType === 'string' && draft.templateType.startsWith('custom-'))
    ) {
      return;
    }
    if (draft.templateFields?.length) return;
    const template = baseTemplates[draft.templateType] || baseTemplates.general;
    setDraft((prev) => ({ ...prev, templateFields: template.fields }));
  }, [draft.templateType]);

  const requireAuth = () => {
    if (currentUser) return true;
    setAuthDialog({ isOpen: true, mode: 'login', notice: t('loginRequired') });
    return false;
  };

  const openAuth = (mode, notice = '') => {
    setAuthDialog({ isOpen: true, mode, notice });
  };

  const handleAuthModeChange = (mode) => {
    setAuthDialog((prev) => ({ ...prev, mode, notice: '' }));
  };

  const handleAuthClose = () => {
    setAuthDialog((prev) => ({ ...prev, isOpen: false, notice: '' }));
  };

  const handleAuthSubmit = ({ mode, displayName, email, password, confirmPassword }) => {
    const errors = {};
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      errors.email = t('emailInvalid');
    }

    if (!password || password.length < 8) {
      errors.password = t('passwordTooShort');
    }

    if (mode === 'signup') {
      if (!trimmedName) {
        errors.displayName = t('displayNameRequired');
      }
      if (confirmPassword !== password) {
        errors.confirmPassword = t('passwordMismatch');
      }
      if (users.some((user) => user.email.toLowerCase() === trimmedEmail)) {
        errors.email = t('emailExists');
      }

      if (Object.keys(errors).length) {
        return { ok: false, errors };
      }

      const newUser = {
        id: crypto.randomUUID(),
        displayName: trimmedName,
        email: trimmedEmail,
        password,
        avatar: ''
      };
      setUsers((prev) => [...prev, newUser]);
      setAuthSession({ userId: newUser.id });
      if (!recordsByUser[newUser.id]) {
        const seeded = cloneRecords(sampleRecords).map(normalizeRecord);
        setUserRecords(newUser.id, seeded);
      }
      if (!templatesByUser[newUser.id]) {
        setUserTemplates(newUser.id, []);
      }
      if (!extensionsByUser[newUser.id]) {
        setUserExtensions(newUser.id, []);
      }
      return { ok: true };
    }

    const matched = users.find((user) => user.email.toLowerCase() === trimmedEmail);
    if (!matched) {
      errors.email = t('emailNotFound');
      return { ok: false, errors };
    }
    if (matched.password !== password) {
      errors.password = t('passwordIncorrect');
      return { ok: false, errors };
    }

    setAuthSession({ userId: matched.id });
    return { ok: true };
  };

  const handleLogout = () => {
    setAuthSession(null);
    setIsProfileOpen(false);
  };

  const handleProfileUpdate = (patch) => {
    if (!currentUser) return;
    updateUser(currentUser.id, patch);
  };

  const handleReorder = (list, startIndex, endIndex) => {
    const next = [...list];
    const [removed] = next.splice(startIndex, 1);
    next.splice(endIndex, 0, removed);
    return next;
  };

  const handleReorderRecords = (sourceIndex, destinationIndex) => {
    setRecords((prev) => handleReorder(prev, sourceIndex, destinationIndex));
  };

  const handleReorderBlocks = (sourceIndex, destinationIndex) => {
    setDraft((prev) => ({
      ...prev,
      blocks: handleReorder(prev.blocks || [], sourceIndex, destinationIndex)
    }));
  };

  const handleEditRecord = (recordId) => {
    if (!requireAuth()) return;
    setEditRecordId(recordId);
    setIsEditOpen(true);
  };

  const handleSaveEditRecord = (nextRecord) => {
    if (!requireAuth() || !nextRecord?.id) return;
    const meta = {
      name: nextRecord.name,
      date: nextRecord.date,
      person: nextRecord.person,
      purpose: nextRecord.purpose,
      priority: nextRecord.priority,
      tags: nextRecord.tags,
      remarks: nextRecord.remarks
    };
    setRecords((prev) =>
      prev.map((record) => (record.id === nextRecord.id ? { ...record, ...meta } : record))
    );
    setDraft((prev) => ({ ...prev, ...meta }));
  };

  const handleDeleteById = (recordId) => {
    if (!requireAuth() || !recordId) return;
    if (!window.confirm(t('deleteConfirm'))) return;
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
    if (selectedId === recordId) {
      const nextRecords = records.filter((record) => record.id !== recordId);
      const nextSelected = nextRecords[0]?.id ?? null;
      setSelectedId(nextSelected);
      if (nextSelected) {
        setDraft(nextRecords[0]);
      } else {
        const nextDraftBase = blankRecord(t);
        const nextDraft = {
          ...nextDraftBase,
          blocks: buildDefaultBlocks(nextDraftBase.tables)
        };
        nextDraft.templateFields = baseTemplates.general.fields;
        setDraft(nextDraft);
      }
    }
  };

  const handleNew = () => {
    if (!requireAuth()) return;
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!requireAuth()) return;
    setRecords((prev) => {
      const existingIndex = prev.findIndex((record) => record.id === draft.id);
      const historyEntry = buildHistoryEntry(draft, t('saveRecord'), t);
      if (existingIndex === -1) {
        const nextRecord = { ...draft, history: [...(draft.history || []), historyEntry] };
        return [nextRecord, ...prev];
      }

      const updated = [...prev];
      const existingHistory = updated[existingIndex].history || [];
      updated[existingIndex] = {
        ...draft,
        history: [...existingHistory, historyEntry]
      };
      return updated;
    });
    setSelectedId(draft.id);
    setLastSavedAt(new Date().toLocaleTimeString());
  };

  const handleDelete = () => {
    if (!requireAuth()) return;
    if (!selectedId) return;
    if (!window.confirm(t('deleteConfirm'))) return;

    const nextRecords = records.filter((record) => record.id !== selectedId);
    const nextSelected = nextRecords[0]?.id ?? null;

    setRecords(nextRecords);
    setSelectedId(nextSelected);

    if (!nextSelected) {
      const nextDraftBase = blankRecord(t);
      const nextDraft = {
        ...nextDraftBase,
        blocks: buildDefaultBlocks(nextDraftBase.tables)
      };
      nextDraft.templateFields = baseTemplates.general.fields;
      setDraft(nextDraft);
    }
  };

  const handleExportCsv = (table) => {
    if (!table) return;
    const headers = table.columns.map((column) => column.name);
    const rows = table.rows || [];
    const escapeCell = (value) => `"${String(value ?? '').replace(/\"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${draft.name || 'lab-record'}.csv`;
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleExportWord = (table) => {
    if (!table) return;
    const html = buildRecordHtml({ ...draft, tables: [table] }, t);
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${draft.name || 'lab-record'}.doc`;
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleExportPdf = (table) => {
    if (!table) return;
    const html = buildRecordHtml({ ...draft, tables: [table] }, t);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const updateBlock = (blockId, patch) => {
    setDraft((prev) => ({
      ...prev,
      blocks: (prev.blocks || []).map((block) => {
        if (block.id !== blockId) return block;
        if (patch.id) {
          return {
            ...block,
            ...patch,
            data: { ...block.data, ...(patch.data || {}) },
            layout: { ...block.layout, ...(patch.layout || {}) }
          };
        }
        return {
          ...block,
          ...patch,
          data: patch.data ? { ...block.data, ...patch.data } : block.data,
          layout: patch.layout ? { ...block.layout, ...patch.layout } : block.layout
        };
      })
    }));
  };

  const updateTable = (tableId, nextTable) => {
    setDraft((prev) => ({
      ...prev,
      tables: (prev.tables || []).map((table) =>
        table.id === tableId ? normalizeTable(nextTable) : table
      )
    }));
  };

  const handleRemoveBlock = (blockId) => {
    if (!requireAuth()) return;
    setDraft((prev) => {
      const target = (prev.blocks || []).find((block) => block.id === blockId);
      if (!target || target.type !== 'table') {
        return {
          ...prev,
          blocks: (prev.blocks || []).filter((block) => block.id !== blockId)
        };
      }

      const tableId = target.data?.tableId;
      const linkedBlocks = (prev.blocks || []).filter(
        (block) =>
          block.id !== blockId &&
          ['analysis', 'chart'].includes(block.type) &&
          block.data?.tableId === tableId
      );
      if (linkedBlocks.length) {
        const confirmed = window.confirm(t('tableRemoveConfirm'));
        if (!confirmed) return prev;
      }

      const nextTables = (prev.tables || []).filter((table) => table.id !== tableId);
      const fallbackTableId = nextTables[0]?.id || '';
      const nextBlocks = (prev.blocks || [])
        .filter((block) => block.id !== blockId)
        .map((block) => {
          if (block.data?.tableId !== tableId) return block;
          return { ...block, data: { ...block.data, tableId: fallbackTableId } };
        });

      return {
        ...prev,
        tables: nextTables,
        blocks: nextBlocks
      };
    });
  };

  const handleAddBlock = (type) => {
    if (!requireAuth()) return;
    if (type === 'table') {
      const currentTables = draft.tables || [];
      if (currentTables.length >= MAX_TABLES) {
        window.alert(t('tableLimitReached'));
        return;
      }
      const nextName = `${t('tableDefaultName')} ${currentTables.length + 1}`;
      const nextTable = createTable({ name: nextName });
      const nextBlock = buildBlock({ type, title: t('blockTable'), settings });
      nextBlock.data = { ...nextBlock.data, tableId: nextTable.id };
      setDraft((prev) => ({
        ...prev,
        tables: [...(prev.tables || []), nextTable],
        blocks: insertBlockByOrder(prev.blocks || [], nextBlock)
      }));
      return;
    }
    const catalog = blockCatalog.find((item) => item.type === type);
    const nextBlock = buildBlock({
      type,
      title: t(catalog?.titleKey || 'block'),
      settings
    });
    if (type === 'checklist') {
      nextBlock.data.items = (draft.steps || ['']).map((text) => ({
        id: crypto.randomUUID(),
        text,
        done: false
      }));
    }
    if (catalog?.locked) nextBlock.locked = true;
    if (['analysis', 'chart'].includes(type)) {
      const tableId = draft.tables?.[0]?.id || '';
      nextBlock.data = { ...nextBlock.data, tableId };
    }
    setDraft((prev) => ({
      ...prev,
      blocks: insertBlockByOrder(prev.blocks || [], nextBlock)
    }));
  };

  const handleEnableExtension = (extensionId) => {
    if (!requireAuth()) return;
    const next = Array.from(new Set([...enabledExtensions, extensionId]));
    setUserExtensions(currentUserId, next);
    const extension = extensionsCatalog.find((item) => item.id === extensionId);
    if (extension) {
      handleAddBlock(extension.blockType);
    }
  };

  const handleDisableExtension = (extensionId) => {
    if (!requireAuth()) return;
    const next = enabledExtensions.filter((id) => id !== extensionId);
    setUserExtensions(currentUserId, next);
    const extension = extensionsCatalog.find((item) => item.id === extensionId);
    if (extension) {
      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).filter((block) => block.type !== extension.blockType)
      }));
    }
  };

  const modalTemplateOptions = useMemo(() => {
    const options = [
      ...Object.entries(baseTemplates).map(([key, template]) => ({
        value: key,
        label: template.labels?.[lang] || template.label
      })),
      ...marketplaceTemplates.map((template) => ({
        value: `market-${template.id}`,
        label: template.labels?.[lang] || template.label
      }))
    ];
    if (customTemplates.length) {
      options.push(
        ...customTemplates.map((template) => ({
          value: `custom-${template.id}`,
          label: template.label
        }))
      );
    }
    return options;
  }, [lang, customTemplates]);

  const filteredRecords = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => {
      const target = `${record.name} ${record.person} ${record.purpose}`.toLowerCase();
      return target.includes(query);
    });
  }, [filterText, records]);

  const editRecord = useMemo(
    () => records.find((record) => record.id === editRecordId) || null,
    [records, editRecordId]
  );

  const addBlockOptions = useMemo(() => {
    return blockCatalog
      .filter((item) => !item.core || item.allowMultiple)
      .map((item) => ({
        type: item.type,
        label: t(item.titleKey),
        enabled:
          item.type === 'table'
            ? (draft.tables || []).length < MAX_TABLES
            : !item.extensionId || enabledExtensions.includes(item.extensionId),
        disabledReason:
          item.type === 'table' && (draft.tables || []).length >= MAX_TABLES
            ? t('tableLimitShort')
            : t('extensionRequired')
      }));
  }, [draft.tables, enabledExtensions, t]);

  const handleModalConfirm = ({ mode, templateType }) => {
    if (!requireAuth()) return;
    const next = blankRecord(t);
    next.blocks = buildDefaultBlocks(next.tables);
    if (mode === 'template') {
      if (templateType.startsWith('market-')) {
        const market = marketplaceTemplates.find(
          (template) => `market-${template.id}` === templateType
        );
        next.templateType = templateType;
        next.templateFields = market?.fields || [];
      } else if (templateType.startsWith('custom-')) {
        const customTemplate = customTemplates.find(
          (template) => `custom-${template.id}` === templateType
        );
        next.templateType = templateType;
        next.templateFields = customTemplate?.fields || [];
      } else {
        next.templateType = templateType;
        next.templateFields = baseTemplates[templateType]?.fields || [];
      }
    } else {
      next.templateType = 'blank';
      next.templateFields = [];
    }
    const normalized = normalizeRecord(next);
    setRecords((prev) => [normalized, ...prev]);
    setDraft(normalized);
    setSelectedId(next.id);
    setIsModalOpen(false);
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      users,
      authSession,
      recordsByUser,
      templatesByUser,
      draftsByUser,
      extensionsByUser,
      settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lab-notes-export.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleClearData = () => {
    if (!window.confirm(t('dataClearConfirm'))) return;
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  return (
    <ErrorBoundary t={t}>
    <div
      className={`app-shell theme-${settings.theme} font-${settings.fontSize} density-${settings.density}`}
      id="top"
    >
      <Header
        onLogin={() => openAuth('login')}
        onSignup={() => openAuth('signup')}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        onOpenExtensions={() => setIsExtensionsOpen(true)}
        user={currentUser}
        t={t}
      />
      <Sidebar
        records={filteredRecords}
        selectedId={selectedId}
        onSelect={setSelectedId}
        filterText={filterText}
        onFilterChange={setFilterText}
        onNew={handleNew}
        onReorder={handleReorderRecords}
        onEdit={handleEditRecord}
        dragDisabled={Boolean(filterText.trim())}
        sectionId="records-section"
        t={t}
      />
      <main className="main-content">
        <WorkspaceBlocks
          blocks={draft.blocks || []}
          draft={draft}
          tables={draft.tables || []}
          dataMode={dataMode}
          onUpdateTable={updateTable}
          onUpdateDraft={updateDraft}
          onReorderBlocks={handleReorderBlocks}
          onUpdateBlock={updateBlock}
          onRemoveBlock={handleRemoveBlock}
          onAddBlock={handleAddBlock}
          addBlockOptions={addBlockOptions}
          settings={settings}
          onExportCsv={handleExportCsv}
          onExportPdf={handleExportPdf}
          onExportWord={handleExportWord}
          onSaveRecord={handleSave}
          onDeleteRecord={handleDelete}
          canDelete={Boolean(selectedId)}
          t={t}
        />
      </main>
      <AutoSaveNotice lastSavedAt={lastSavedAt} autoSaveEnabled={settings.autoSave} t={t} />
      <NewRecordModal
        isOpen={isModalOpen}
        templateOptions={modalTemplateOptions}
        onConfirm={handleModalConfirm}
        onClose={() => setIsModalOpen(false)}
        t={t}
      />
      <AuthModal
        isOpen={authDialog.isOpen}
        mode={authDialog.mode}
        notice={authDialog.notice}
        onClose={handleAuthClose}
        onSubmit={handleAuthSubmit}
        onModeChange={handleAuthModeChange}
        t={t}
      />
      <UserProfileModal
        isOpen={isProfileOpen}
        user={currentUser}
        onClose={() => setIsProfileOpen(false)}
        onUpdate={handleProfileUpdate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        t={t}
      />
      <RecordEditModal
        isOpen={isEditOpen}
        record={editRecord}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveEditRecord}
        onDelete={handleDeleteById}
        t={t}
      />
      <ExtensionsModal
        isOpen={isExtensionsOpen}
        extensions={extensionsCatalog}
        enabledExtensions={enabledExtensions}
        onEnable={handleEnableExtension}
        onDisable={handleDisableExtension}
        onClose={() => setIsExtensionsOpen(false)}
        t={t}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setIsSettingsOpen(false)}
        onExportData={handleExportData}
        onClearData={handleClearData}
        storageKeys={STORAGE_KEYS}
        t={t}
      />
    </div>
    </ErrorBoundary>
  );
}
