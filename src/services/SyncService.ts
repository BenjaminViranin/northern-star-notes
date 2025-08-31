import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';
import { DatabaseManager } from '../database/DatabaseManager';
import { SyncQueueDAO } from '../database/syncQueueDAO';
import { GroupsDAO, LocalGroup } from '../database/groupsDAO';
import { NotesDAO, LocalNote } from '../database/notesDAO';
import { Group, Note, SyncOperation } from '../types';
import { resolveConflict } from '../utils/dataUtils';

export interface SyncStatus {
  isSync: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  error: string | null;
}

export class SyncService {
  private static instance: SyncService;
  private isOnline = false;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private dbManager: DatabaseManager;
  private listeners: ((status: SyncStatus) => void)[] = [];

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.initializeNetworkListener();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline) {
        // Just came online, trigger sync
        this.startSync();
      }
    });
  }

  addStatusListener(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
  }

  removeStatusListener(listener: (status: SyncStatus) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(listener => listener(status));
  }

  async startSync(userId?: string): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
    }

    this.isSyncing = true;
    
    try {
      this.notifyListeners({
        isSync: true,
        lastSyncTime: null,
        pendingOperations: await this.dbManager.getSyncQueueSize(userId),
        error: null,
      });

      // Step 1: Push local changes to server
      await this.pushLocalChanges(userId);

      // Step 2: Pull remote changes from server
      await this.pullRemoteChanges(userId);

      // Step 3: Clean up processed sync queue items
      await SyncQueueDAO.clearProcessedItems(userId);

      this.notifyListeners({
        isSync: false,
        lastSyncTime: new Date(),
        pendingOperations: await this.dbManager.getSyncQueueSize(userId),
        error: null,
      });

    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyListeners({
        isSync: false,
        lastSyncTime: null,
        pendingOperations: await this.dbManager.getSyncQueueSize(userId),
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushLocalChanges(userId: string): Promise<void> {
    const pendingItems = await this.dbManager.getPendingSyncItems(userId, 50);

    for (const item of pendingItems) {
      try {
        await this.processSyncItem(item);
        await this.dbManager.removeSyncItem(item.id);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        await this.dbManager.incrementSyncRetry(
          item.id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  private async processSyncItem(item: any): Promise<void> {
    const data = JSON.parse(item.data);

    switch (item.table_name) {
      case 'groups':
        await this.syncGroup(item.operation, data);
        break;
      case 'notes':
        await this.syncNote(item.operation, data);
        break;
      default:
        throw new Error(`Unknown table: ${item.table_name}`);
    }
  }

  private async syncGroup(operation: string, data: LocalGroup): Promise<void> {
    switch (operation) {
      case 'INSERT':
        await supabase.from('groups').insert({
          id: data.id,
          name: data.name,
          color: data.color,
          user_id: data.user_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
          version: data.version,
          is_deleted: data.is_deleted === 1,
        });
        break;

      case 'UPDATE':
        await supabase.from('groups').update({
          name: data.name,
          color: data.color,
          updated_at: data.updated_at,
          version: data.version,
          is_deleted: data.is_deleted === 1,
        }).eq('id', data.id);
        break;

      case 'DELETE':
        await supabase.from('groups').update({
          is_deleted: true,
          updated_at: data.updated_at,
          version: data.version,
        }).eq('id', data.id);
        break;
    }
  }

  private async syncNote(operation: string, data: LocalNote): Promise<void> {
    switch (operation) {
      case 'INSERT':
        await supabase.from('notes').insert({
          id: data.id,
          title: data.title,
          content: JSON.parse(data.content),
          content_markdown: data.content_markdown,
          content_plain: data.content_plain,
          group_id: data.group_id,
          user_id: data.user_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
          version: data.version,
          is_deleted: data.is_deleted === 1,
          deleted_at: data.deleted_at,
        });
        break;

      case 'UPDATE':
        await supabase.from('notes').update({
          title: data.title,
          content: JSON.parse(data.content),
          content_markdown: data.content_markdown,
          content_plain: data.content_plain,
          group_id: data.group_id,
          updated_at: data.updated_at,
          version: data.version,
          is_deleted: data.is_deleted === 1,
          deleted_at: data.deleted_at,
        }).eq('id', data.id);
        break;

      case 'DELETE':
        await supabase.from('notes').update({
          is_deleted: true,
          deleted_at: data.deleted_at,
          updated_at: data.updated_at,
          version: data.version,
        }).eq('id', data.id);
        break;
    }
  }

  private async pullRemoteChanges(userId: string): Promise<void> {
    // Get last sync time to only pull changes since then
    const lastSyncTime = await this.dbManager.getSetting('lastSyncTime');
    const since = lastSyncTime ? new Date(lastSyncTime) : new Date(0);

    // Pull groups
    const { data: remoteGroups } = await supabase
      .from('groups')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', since.toISOString());

    if (remoteGroups) {
      for (const remoteGroup of remoteGroups) {
        await this.handleRemoteGroup(remoteGroup);
      }
    }

    // Pull notes
    const { data: remoteNotes } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', since.toISOString());

    if (remoteNotes) {
      for (const remoteNote of remoteNotes) {
        await this.handleRemoteNote(remoteNote);
      }
    }

    // Update last sync time
    await this.dbManager.setSetting('lastSyncTime', new Date().toISOString());
  }

  private async handleRemoteGroup(remoteGroup: Group): Promise<void> {
    const localGroup = await GroupsDAO.getGroupById(remoteGroup.id);

    if (!localGroup) {
      // New group from server
      await GroupsDAO.upsertGroupFromSync({
        ...remoteGroup,
        is_deleted: remoteGroup.is_deleted ? 1 : 0,
      });
    } else {
      // Conflict resolution
      const resolved = resolveConflict(localGroup, remoteGroup, 'latest');
      
      if (resolved === remoteGroup) {
        await GroupsDAO.upsertGroupFromSync({
          ...remoteGroup,
          is_deleted: remoteGroup.is_deleted ? 1 : 0,
        });
      }
    }
  }

  private async handleRemoteNote(remoteNote: Note): Promise<void> {
    const localNote = await NotesDAO.getNoteById(remoteNote.id);

    if (!localNote) {
      // New note from server
      await NotesDAO.upsertNoteFromSync({
        ...remoteNote,
        content: JSON.stringify(remoteNote.content),
        is_deleted: remoteNote.is_deleted ? 1 : 0,
      });
    } else {
      // Conflict resolution
      const resolved = resolveConflict(localNote, remoteNote, 'latest');
      
      if (resolved === remoteNote) {
        await NotesDAO.upsertNoteFromSync({
          ...remoteNote,
          content: JSON.stringify(remoteNote.content),
          is_deleted: remoteNote.is_deleted ? 1 : 0,
        });
      }
    }
  }

  startPeriodicSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.startSync();
      }
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async forceSyncNow(userId: string): Promise<void> {
    await this.startSync(userId);
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}
