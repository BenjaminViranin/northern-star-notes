// App configuration constants

export const APP_CONFIG = {
  name: 'Northern Star Notes',
  version: '1.0.0',
  description: 'Offline-first note-taking app with rich text editing',
  author: 'Northern Star Team',
};

// Database configuration
export const DATABASE_CONFIG = {
  name: 'NorthernStarNotes.db',
  version: '1.0',
  displayName: 'Northern Star Notes Database',
  size: 200000,
};

// Sync configuration
export const SYNC_CONFIG = {
  autoSaveDelay: 300, // milliseconds
  maxRetries: 5,
  retryDelay: 1000, // milliseconds
  batchSize: 50,
  syncInterval: 30000, // 30 seconds
  offlineTimeout: 5000, // 5 seconds
};

// UI configuration
export const UI_CONFIG = {
  maxWindowPanes: 4,
  defaultWindowLayout: 'single' as const,
  searchDebounceDelay: 300,
  toastDuration: 3000,
  animationDuration: 200,
};

// Storage keys
export const STORAGE_KEYS = {
  user: 'user',
  theme: 'theme',
  settings: 'settings',
  lastSync: 'lastSync',
  offlineMode: 'offlineMode',
  windowLayout: 'windowLayout',
  lastSelectedNote: 'lastSelectedNote',
  lastSelectedGroup: 'lastSelectedGroup',
};

// Default values
export const DEFAULTS = {
  theme: 'dark' as const,
  autoSave: true,
  autoSaveDelay: 300,
  offlineMode: false,
  syncOnStartup: true,
  groupColor: '#14b8a6',
  noteTitle: 'Untitled',
  windowLayout: {
    type: 'single' as const,
    panes: [
      {
        id: 'main',
        noteId: null,
        width: 100,
        isActive: true,
      },
    ],
  },
};

// Default groups
export const DEFAULT_GROUPS = [
  { name: 'Work', color: '#3b82f6' },
  { name: 'Personal', color: '#10b981' },
  { name: 'Ideas', color: '#f59e0b' },
  { name: 'Tasks', color: '#ef4444' },
  { name: 'Uncategorized', color: '#6b7280' },
];

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // Database errors
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  
  // Sync errors
  SYNC_NETWORK_ERROR: 'SYNC_NETWORK_ERROR',
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  SYNC_TIMEOUT: 'SYNC_TIMEOUT',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_TOO_LONG: 'VALIDATION_TOO_LONG',
  
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
};

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.AUTH_USER_NOT_FOUND]: 'User not found',
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: 'Session expired. Please log in again',
  
  [ERROR_CODES.DB_CONNECTION_FAILED]: 'Failed to connect to database',
  [ERROR_CODES.DB_QUERY_FAILED]: 'Database operation failed',
  [ERROR_CODES.DB_CONSTRAINT_VIOLATION]: 'Data constraint violation',
  
  [ERROR_CODES.SYNC_NETWORK_ERROR]: 'Network error during sync',
  [ERROR_CODES.SYNC_CONFLICT]: 'Sync conflict detected',
  [ERROR_CODES.SYNC_TIMEOUT]: 'Sync operation timed out',
  
  [ERROR_CODES.VALIDATION_REQUIRED_FIELD]: 'This field is required',
  [ERROR_CODES.VALIDATION_INVALID_FORMAT]: 'Invalid format',
  [ERROR_CODES.VALIDATION_TOO_LONG]: 'Value is too long',
  
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unknown error occurred',
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection error',
  [ERROR_CODES.PERMISSION_DENIED]: 'Permission denied',
};

// Platform detection
export const PLATFORM = {
  isAndroid: require('react-native').Platform.OS === 'android',
  isIOS: require('react-native').Platform.OS === 'ios',
  isWindows: require('react-native').Platform.OS === 'windows',
  isMacOS: require('react-native').Platform.OS === 'macos',
  isWeb: require('react-native').Platform.OS === 'web',
};

// Feature flags
export const FEATURES = {
  multiWindow: PLATFORM.isWindows,
  splitView: PLATFORM.isWindows,
  fileSystem: PLATFORM.isWindows || PLATFORM.isAndroid,
  notifications: PLATFORM.isAndroid || PLATFORM.isIOS,
  backgroundSync: PLATFORM.isAndroid || PLATFORM.isIOS,
  realtime: true,
  offline: true,
  backup: true,
  search: true,
  richText: true,
  markdown: true,
};

// Keyboard shortcuts (for Windows)
export const KEYBOARD_SHORTCUTS = {
  newNote: 'Ctrl+N',
  saveNote: 'Ctrl+S',
  search: 'Ctrl+F',
  toggleSidebar: 'Ctrl+B',
  switchGroup: 'Ctrl+G',
  deleteNote: 'Delete',
  bold: 'Ctrl+B',
  italic: 'Ctrl+I',
  underline: 'Ctrl+U',
  strikethrough: 'Ctrl+Shift+X',
  code: 'Ctrl+`',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
};

// API endpoints (relative to Supabase URL)
export const API_ENDPOINTS = {
  auth: {
    signIn: '/auth/v1/token?grant_type=password',
    signUp: '/auth/v1/signup',
    signOut: '/auth/v1/logout',
    refresh: '/auth/v1/token?grant_type=refresh_token',
  },
  notes: '/rest/v1/notes',
  groups: '/rest/v1/groups',
  syncOperations: '/rest/v1/sync_operations',
};

// Validation rules
export const VALIDATION_RULES = {
  note: {
    titleMaxLength: 255,
    titleRequired: true,
  },
  group: {
    nameMaxLength: 255,
    nameRequired: true,
    colorPattern: /^#[0-9A-F]{6}$/i,
  },
  user: {
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    passwordMinLength: 8,
  },
};

// Performance thresholds
export const PERFORMANCE = {
  maxNotesInMemory: 1000,
  maxSearchResults: 100,
  debounceDelay: 300,
  animationDuration: 200,
  longPressDelay: 500,
};

// Cleanup intervals
export const CLEANUP = {
  deletedNotesRetentionDays: 30,
  syncQueueRetentionDays: 7,
  logRetentionDays: 14,
  maintenanceInterval: 24 * 60 * 60 * 1000, // 24 hours
};
