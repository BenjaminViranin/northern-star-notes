import { initDatabase, closeDatabase } from './sqlite';
import { GroupsDAO } from './groupsDAO';
import { NotesDAO } from './notesDAO';
import { SyncQueueDAO } from './syncQueueDAO';
import { UserSettingsDAO } from './userSettingsDAO';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await initDatabase();
      this.isInitialized = true;
      console.log('DatabaseManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DatabaseManager:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.isInitialized) {
      await closeDatabase();
      this.isInitialized = false;
      console.log('DatabaseManager closed');
    }
  }

  // Groups operations
  async getAllGroups(userId: string) {
    return GroupsDAO.getAllGroups(userId);
  }

  async getGroupById(id: string) {
    return GroupsDAO.getGroupById(id);
  }

  async createGroup(name: string, color: string, userId: string) {
    return GroupsDAO.createGroup(name, color, userId);
  }

  async updateGroup(id: string, updates: { name?: string; color?: string }) {
    return GroupsDAO.updateGroup(id, updates);
  }

  async deleteGroup(id: string) {
    return GroupsDAO.deleteGroup(id);
  }

  async seedDefaultGroups(userId: string) {
    return GroupsDAO.seedDefaultGroups(userId);
  }

  async getUncategorizedGroup(userId: string) {
    return GroupsDAO.getUncategorizedGroup(userId);
  }

  // Notes operations
  async getAllNotes(userId: string) {
    return NotesDAO.getAllNotes(userId);
  }

  async getNotesByGroup(userId: string, groupId: string | null) {
    return NotesDAO.getNotesByGroup(userId, groupId);
  }

  async getNoteById(id: string) {
    return NotesDAO.getNoteById(id);
  }

  async createNote(
    title: string,
    content: any,
    contentMarkdown: string,
    contentPlain: string,
    groupId: string | null,
    userId: string
  ) {
    return NotesDAO.createNote(title, content, contentMarkdown, contentPlain, groupId, userId);
  }

  async updateNote(
    id: string,
    updates: {
      title?: string;
      content?: any;
      content_markdown?: string;
      content_plain?: string;
      group_id?: string | null;
    }
  ) {
    return NotesDAO.updateNote(id, updates);
  }

  async deleteNote(id: string) {
    return NotesDAO.deleteNote(id);
  }

  async searchNotes(userId: string, query: string) {
    return NotesDAO.searchNotes(userId, query);
  }

  async moveNotesToGroup(fromGroupId: string, toGroupId: string, userId: string) {
    return NotesDAO.moveNotesToGroup(fromGroupId, toGroupId, userId);
  }

  // Sync queue operations
  async addToSyncQueue(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: any,
    userId: string
  ) {
    return SyncQueueDAO.addToQueue(tableName, recordId, operation, data, userId);
  }

  async getPendingSyncItems(userId: string, limit?: number) {
    return SyncQueueDAO.getPendingItems(userId, limit);
  }

  async removeSyncItem(id: string) {
    return SyncQueueDAO.removeFromQueue(id);
  }

  async incrementSyncRetry(id: string, error: string) {
    return SyncQueueDAO.incrementRetryCount(id, error);
  }

  async getSyncQueueSize(userId: string) {
    return SyncQueueDAO.getQueueSize(userId);
  }

  async clearSyncQueue(userId: string) {
    return SyncQueueDAO.clearAllQueue(userId);
  }

  // User settings operations
  async getSetting(key: string) {
    return UserSettingsDAO.getSetting(key);
  }

  async setSetting(key: string, value: string) {
    return UserSettingsDAO.setSetting(key, value);
  }

  async getAllSettings() {
    return UserSettingsDAO.getAllSettings();
  }

  async getLastSelectedNoteId() {
    return UserSettingsDAO.getLastSelectedNoteId();
  }

  async setLastSelectedNoteId(noteId: string) {
    return UserSettingsDAO.setLastSelectedNoteId(noteId);
  }

  async getLastSelectedGroupId() {
    return UserSettingsDAO.getLastSelectedGroupId();
  }

  async setLastSelectedGroupId(groupId: string) {
    return UserSettingsDAO.setLastSelectedGroupId(groupId);
  }

  // Maintenance operations
  async performMaintenance() {
    try {
      await NotesDAO.cleanupOldDeletedNotes();
      await SyncQueueDAO.removeOldItems();
      console.log('Database maintenance completed');
    } catch (error) {
      console.error('Database maintenance failed:', error);
    }
  }

  // Backup operations
  async exportData(userId: string) {
    const groups = await this.getAllGroups(userId);
    const notes = await this.getAllNotes(userId);
    const settings = await this.getAllSettings();

    return {
      groups,
      notes,
      settings,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
  }

  async importData(data: any, userId: string) {
    // This would be implemented to restore from backup
    // For now, just a placeholder
    console.log('Import data functionality to be implemented');
  }
}
