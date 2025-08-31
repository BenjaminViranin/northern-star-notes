// Core data models for the note-taking app

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  is_deleted: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: QuillDelta; // Rich text content as Quill Delta
  content_markdown: string; // Derived markdown
  content_plain: string; // Plain text for search
  group_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  is_deleted: boolean;
  deleted_at: string | null;
}

// Quill Delta format for rich text content
export interface QuillDelta {
  ops: QuillOp[];
}

export interface QuillOp {
  insert?: string | object;
  delete?: number;
  retain?: number;
  attributes?: QuillAttributes;
}

export interface QuillAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  'code-block'?: boolean;
  list?: 'ordered' | 'bullet' | 'check';
  header?: 1 | 2 | 3 | 4 | 5 | 6;
  color?: string;
  background?: string;
  font?: string;
  size?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  indent?: number;
  link?: string;
}

// Sync-related types
export interface SyncOperation {
  id: string;
  table_name: 'notes' | 'groups';
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  user_id: string;
  created_at: string;
  processed: boolean;
}

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  user_id: string;
  created_at: string;
  retry_count: number;
  last_error: string | null;
}

// App state types
export interface AppState {
  user: User | null;
  groups: Group[];
  notes: Note[];
  selectedGroupId: string | null;
  selectedNoteId: string | null;
  isLoading: boolean;
  isOnline: boolean;
  syncStatus: SyncStatus;
  searchQuery: string;
  filteredNotes: Note[];
}

export interface SyncStatus {
  isSync: boolean;
  lastSyncTime: string | null;
  pendingOperations: number;
  error: string | null;
}

// UI-related types
export interface WindowLayout {
  type: 'single' | 'split-2' | 'split-3' | 'split-4';
  panes: WindowPane[];
}

export interface WindowPane {
  id: string;
  noteId: string | null;
  width: number; // percentage
  isActive: boolean;
}

export interface EditorState {
  noteId: string;
  content: QuillDelta;
  isDirty: boolean;
  lastSaved: string | null;
  isSaving: boolean;
  saveError: string | null;
}

// Form types
export interface CreateNoteForm {
  title: string;
  groupId: string | null;
}

export interface CreateGroupForm {
  name: string;
  color: string;
}

export interface UpdateGroupForm {
  name?: string;
  color?: string;
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Notes: { groupId?: string };
  Editor: { noteId: string };
  Groups: undefined;
  Settings: undefined;
};

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    glass: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  typography: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    body: TextStyle;
    caption: TextStyle;
  };
}

export interface TextStyle {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark';
  autoSave: boolean;
  autoSaveDelay: number; // milliseconds
  offlineMode: boolean;
  syncOnStartup: boolean;
  windowLayout: WindowLayout;
  lastSelectedNoteId: string | null;
  lastSelectedGroupId: string | null;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  error: string | null;
  success: boolean;
}

// Backup types
export interface BackupData {
  version: string;
  exportDate: string;
  user: User;
  groups: Group[];
  notes: Note[];
  settings: AppSettings;
}

// Search types
export interface SearchResult {
  note: Note;
  matches: SearchMatch[];
  score: number;
}

export interface SearchMatch {
  field: 'title' | 'content';
  text: string;
  start: number;
  end: number;
}

// Conflict resolution types
export interface ConflictResolution {
  localVersion: Note | Group;
  remoteVersion: Note | Group;
  resolution: 'local' | 'remote' | 'merge';
  resolvedVersion?: Note | Group;
}

// Platform-specific types
export interface PlatformCapabilities {
  supportsMultiWindow: boolean;
  supportsFileSystem: boolean;
  supportsNotifications: boolean;
  maxWindowPanes: number;
}
