import { createContext, useContext, useEffect, useReducer } from 'react';

const USERS_KEY = 'lab_notes_users';
const AUTH_KEY = 'lab_notes_auth_session';
const RECORDS_KEY = 'lab_notes_records_by_user';
const TEMPLATES_KEY = 'lab_notes_templates_by_user';
const DRAFTS_KEY = 'lab_notes_drafts_by_user';
const SETTINGS_KEY = 'lab_notes_settings';
const EXTENSIONS_KEY = 'lab_notes_extensions_by_user';

const DEFAULT_SETTINGS = {
  language: 'zh',
  dateFormat: 'YYYY-MM-DD',
  defaultTemplate: 'general',
  autoSave: true,
  autoSaveInterval: 10000,
  theme: 'light',
  fontSize: 'medium',
  density: 'comfortable',
  workspaceSort: 'manual',
  defaultCollapsed: false,
  chartDefaultWidth: 520,
  chartDefaultHeight: 320,
  showBlockMeta: true,
  compactMode: false,
  showTips: true,
  dataMode: 'local'
};

const readLocal = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readLocalSafe = (key, fallback, validator) => {
  const raw = readLocal(key);
  if (raw === null) return fallback;
  if (validator && !validator(raw)) {
    console.warn(`Corrupted localStorage key "${key}", resetting to fallback`);
    return fallback;
  }
  return raw;
};

const isArray = Array.isArray;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const storedSettings = readLocal(SETTINGS_KEY);

const initialState = {
  users: readLocalSafe(USERS_KEY, [], isArray),
  authSession: readLocal(AUTH_KEY),
  recordsByUser: readLocalSafe(RECORDS_KEY, {}, isPlainObject),
  templatesByUser: readLocalSafe(TEMPLATES_KEY, {}, isPlainObject),
  draftsByUser: readLocalSafe(DRAFTS_KEY, {}, isPlainObject),
  extensionsByUser: readLocalSafe(EXTENSIONS_KEY, {}, isPlainObject),
  settings: { ...DEFAULT_SETTINGS, ...(storedSettings || {}) }
};

const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_AUTH_SESSION':
      return { ...state, authSession: action.payload };
    case 'SET_RECORDS_BY_USER':
      return { ...state, recordsByUser: action.payload };
    case 'SET_TEMPLATES_BY_USER':
      return { ...state, templatesByUser: action.payload };
    case 'SET_DRAFTS_BY_USER':
      return { ...state, draftsByUser: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_EXTENSIONS_BY_USER':
      return { ...state, extensionsByUser: action.payload };
    case 'SET_USER_EXTENSIONS': {
      const { userId, extensions } = action.payload;
      return {
        ...state,
        extensionsByUser: {
          ...state.extensionsByUser,
          [userId]: extensions
        }
      };
    }
    case 'SET_USER_RECORDS': {
      const { userId, records } = action.payload;
      return {
        ...state,
        recordsByUser: {
          ...state.recordsByUser,
          [userId]: records
        }
      };
    }
    case 'SET_USER_TEMPLATES': {
      const { userId, templates } = action.payload;
      return {
        ...state,
        templatesByUser: {
          ...state.templatesByUser,
          [userId]: templates
        }
      };
    }
    case 'SET_USER_DRAFT': {
      const { userId, draft } = action.payload;
      return {
        ...state,
        draftsByUser: {
          ...state.draftsByUser,
          [userId]: draft
        }
      };
    }
    case 'UPDATE_USER': {
      const { userId, patch } = action.payload;
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === userId ? { ...user, ...patch } : user
        )
      };
    }
    default:
      return state;
  }
};

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(state.users));
  }, [state.users]);

  useEffect(() => {
    if (state.authSession) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(state.authSession));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [state.authSession]);

  useEffect(() => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(state.recordsByUser));
  }, [state.recordsByUser]);

  useEffect(() => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(state.templatesByUser));
  }, [state.templatesByUser]);

  useEffect(() => {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(state.draftsByUser));
  }, [state.draftsByUser]);

  useEffect(() => {
    localStorage.setItem(EXTENSIONS_KEY, JSON.stringify(state.extensionsByUser));
  }, [state.extensionsByUser]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }, [state.settings]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within AppStateProvider');
  }
  return context;
};
