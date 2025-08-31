import SQLite from 'react-native-sqlite-storage';

// Enable debugging
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DATABASE_NAME = 'NorthernStarNotes.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAYNAME = 'Northern Star Notes Database';
const DATABASE_SIZE = 200000;

let database: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (database) {
    return database;
  }

  try {
    database = await SQLite.openDatabase({
      name: DATABASE_NAME,
      version: DATABASE_VERSION,
      displayName: DATABASE_DISPLAYNAME,
      size: DATABASE_SIZE,
    });

    console.log('Database opened successfully');
    await createTables();
    return database;
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
};

const createTables = async () => {
  if (!database) {
    throw new Error('Database not initialized');
  }

  // Create groups table
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#14b8a6',
      user_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      needs_sync INTEGER DEFAULT 0
    )
  `);

  // Create notes table
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT DEFAULT '{}',
      content_markdown TEXT DEFAULT '',
      content_plain TEXT DEFAULT '',
      group_id TEXT,
      user_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      needs_sync INTEGER DEFAULT 0,
      FOREIGN KEY (group_id) REFERENCES groups (id)
    )
  `);

  // Create sync_queue table for offline operations
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT,
      user_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT
    )
  `);

  // Create user_settings table
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for performance
  await database.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)
  `);
  
  await database.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_notes_group_id ON notes(group_id)
  `);
  
  await database.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)
  `);
  
  await database.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id)
  `);
  
  await database.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_table_record ON sync_queue(table_name, record_id)
  `);

  console.log('All tables created successfully');
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!database) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return database;
};

export const closeDatabase = async (): Promise<void> => {
  if (database) {
    await database.close();
    database = null;
    console.log('Database closed');
  }
};

// Utility function to execute SQL with error handling
export const executeSql = async (
  sql: string,
  params: any[] = []
): Promise<SQLite.ResultSet> => {
  const db = getDatabase();
  try {
    const [result] = await db.executeSql(sql, params);
    return result;
  } catch (error) {
    console.error('SQL execution error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
};

// Utility function to generate UUID
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Utility function to get current timestamp
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};
