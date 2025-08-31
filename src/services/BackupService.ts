import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { DatabaseManager } from '../database/DatabaseManager';
import { supabase } from '../config/supabase';
import { BackupData, Group, Note, AppSettings } from '../types';
import { exportToJSON, importFromJSON } from '../utils/dataUtils';

export class BackupService {
  private static instance: BackupService;
  private dbManager: DatabaseManager;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  async createBackup(userId: string): Promise<BackupData> {
    try {
      // Get all user data
      const groups = await this.dbManager.getAllGroups(userId);
      const notes = await this.dbManager.getAllNotes(userId);
      const settings = await this.dbManager.getAllSettings();

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const backupData: BackupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
        },
        groups: groups.map(group => ({
          id: group.id,
          name: group.name,
          color: group.color,
          user_id: group.user_id,
          created_at: group.created_at,
          updated_at: group.updated_at,
          version: group.version,
          is_deleted: group.is_deleted === 1,
        })),
        notes: notes.map(note => ({
          id: note.id,
          title: note.title,
          content: JSON.parse(note.content),
          content_markdown: note.content_markdown,
          content_plain: note.content_plain,
          group_id: note.group_id,
          user_id: note.user_id,
          created_at: note.created_at,
          updated_at: note.updated_at,
          version: note.version,
          is_deleted: note.is_deleted === 1,
          deleted_at: note.deleted_at,
        })),
        settings: this.convertSettingsToAppSettings(settings),
      };

      return backupData;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  async exportBackupToFile(userId: string, filename?: string): Promise<string> {
    try {
      const backupData = await this.createBackup(userId);
      const jsonData = exportToJSON(backupData);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `northern-star-backup-${timestamp}.json`;
      const finalFilename = filename || defaultFilename;

      let filePath: string;

      if (Platform.OS === 'android') {
        // Android: Save to Downloads folder
        filePath = `${RNFS.DownloadDirectoryPath}/${finalFilename}`;
      } else if (Platform.OS === 'windows') {
        // Windows: Save to Documents folder
        filePath = `${RNFS.DocumentDirectoryPath}/${finalFilename}`;
      } else {
        // iOS/other: Save to Documents folder
        filePath = `${RNFS.DocumentDirectoryPath}/${finalFilename}`;
      }

      await RNFS.writeFile(filePath, jsonData, 'utf8');
      
      console.log(`Backup exported to: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Failed to export backup:', error);
      throw error;
    }
  }

  async importBackupFromFile(filePath: string): Promise<void> {
    try {
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('Backup file not found');
      }

      const jsonData = await RNFS.readFile(filePath, 'utf8');
      const backupData: BackupData = importFromJSON(jsonData);

      await this.restoreFromBackup(backupData);
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupData: BackupData): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate backup data
      if (!this.validateBackupData(backupData)) {
        throw new Error('Invalid backup data format');
      }

      // Clear existing data (optional - could be a user choice)
      // await this.clearUserData(user.id);

      // Restore groups
      for (const group of backupData.groups) {
        if (!group.is_deleted) {
          await this.dbManager.createGroup(group.name, group.color, user.id);
        }
      }

      // Restore notes
      for (const note of backupData.notes) {
        if (!note.is_deleted) {
          await this.dbManager.createNote(
            note.title,
            note.content,
            note.content_markdown,
            note.content_plain,
            note.group_id,
            user.id
          );
        }
      }

      // Restore settings
      for (const [key, value] of Object.entries(backupData.settings)) {
        await this.dbManager.setSetting(key, String(value));
      }

      console.log('Backup restored successfully');
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  }

  private validateBackupData(data: any): data is BackupData {
    return (
      data &&
      typeof data.version === 'string' &&
      typeof data.exportDate === 'string' &&
      data.user &&
      Array.isArray(data.groups) &&
      Array.isArray(data.notes) &&
      typeof data.settings === 'object'
    );
  }

  private convertSettingsToAppSettings(settings: Record<string, string>): AppSettings {
    return {
      theme: (settings.theme as 'light' | 'dark') || 'dark',
      autoSave: settings.autoSaveEnabled !== 'false',
      autoSaveDelay: parseInt(settings.autoSaveDelay || '300', 10),
      offlineMode: settings.offlineMode === 'true',
      syncOnStartup: settings.syncOnStartup !== 'false',
      windowLayout: settings.windowLayout ? JSON.parse(settings.windowLayout) : {
        type: 'single',
        panes: [{ id: 'main', noteId: null, width: 100, isActive: true }],
      },
      lastSelectedNoteId: settings.lastSelectedNoteId || null,
      lastSelectedGroupId: settings.lastSelectedGroupId || null,
    };
  }

  async clearUserData(userId: string): Promise<void> {
    try {
      // Get all user's notes and groups
      const notes = await this.dbManager.getAllNotes(userId);
      const groups = await this.dbManager.getAllGroups(userId);

      // Delete all notes
      for (const note of notes) {
        await this.dbManager.deleteNote(note.id);
      }

      // Delete all groups (except default ones)
      const defaultGroupNames = ['Work', 'Personal', 'Ideas', 'Tasks', 'Uncategorized'];
      for (const group of groups) {
        if (!defaultGroupNames.includes(group.name)) {
          await this.dbManager.deleteGroup(group.id);
        }
      }

      // Clear sync queue
      await this.dbManager.clearSyncQueue(userId);

      console.log('User data cleared');
    } catch (error) {
      console.error('Failed to clear user data:', error);
      throw error;
    }
  }

  async getBackupInfo(): Promise<{
    lastBackupDate: string | null;
    backupSize: number;
    itemCounts: {
      groups: number;
      notes: number;
    };
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const groups = await this.dbManager.getAllGroups(user.id);
      const notes = await this.dbManager.getAllNotes(user.id);
      const lastBackupDate = await this.dbManager.getSetting('lastBackupDate');

      // Estimate backup size (rough calculation)
      const backupData = await this.createBackup(user.id);
      const jsonData = exportToJSON(backupData);
      const backupSize = new Blob([jsonData]).size;

      return {
        lastBackupDate,
        backupSize,
        itemCounts: {
          groups: groups.length,
          notes: notes.length,
        },
      };
    } catch (error) {
      console.error('Failed to get backup info:', error);
      throw error;
    }
  }

  async scheduleAutoBackup(intervalHours: number = 24): Promise<void> {
    // This would implement automatic backup scheduling
    // For now, just a placeholder
    console.log(`Auto backup scheduled every ${intervalHours} hours`);
  }

  async listBackupFiles(): Promise<string[]> {
    try {
      let backupDir: string;

      if (Platform.OS === 'android') {
        backupDir = RNFS.DownloadDirectoryPath;
      } else {
        backupDir = RNFS.DocumentDirectoryPath;
      }

      const files = await RNFS.readDir(backupDir);
      const backupFiles = files
        .filter(file => file.name.startsWith('northern-star-backup-') && file.name.endsWith('.json'))
        .map(file => file.path)
        .sort()
        .reverse(); // Most recent first

      return backupFiles;
    } catch (error) {
      console.error('Failed to list backup files:', error);
      return [];
    }
  }

  async deleteBackupFile(filePath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
        console.log(`Backup file deleted: ${filePath}`);
      }
    } catch (error) {
      console.error('Failed to delete backup file:', error);
      throw error;
    }
  }
}
