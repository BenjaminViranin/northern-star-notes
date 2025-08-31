import { AppState, AppStateStatus } from 'react-native';
import { SyncService } from './SyncService';
import { DatabaseManager } from '../database/DatabaseManager';
import { supabase } from '../config/supabase';

export class BackgroundSyncWorker {
  private static instance: BackgroundSyncWorker;
  private syncService: SyncService;
  private dbManager: DatabaseManager;
  private appStateSubscription: any;
  private realtimeSubscription: any;
  private isActive = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.syncService = SyncService.getInstance();
    this.dbManager = DatabaseManager.getInstance();
  }

  static getInstance(): BackgroundSyncWorker {
    if (!BackgroundSyncWorker.instance) {
      BackgroundSyncWorker.instance = new BackgroundSyncWorker();
    }
    return BackgroundSyncWorker.instance;
  }

  async start(userId: string): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    console.log('Starting background sync worker');

    // Start periodic sync
    this.syncService.startPeriodicSync(30000); // 30 seconds

    // Listen for app state changes
    this.setupAppStateListener();

    // Setup realtime subscriptions
    await this.setupRealtimeSubscriptions(userId);

    // Initial sync
    await this.syncService.startSync(userId);
  }

  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    console.log('Stopping background sync worker');

    // Stop periodic sync
    this.syncService.stopPeriodicSync();

    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Remove realtime subscriptions
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }

    // Clear retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (nextAppState === 'active') {
      // App became active, trigger sync
      console.log('App became active, triggering sync');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.syncService.startSync(user.id);
      }
    }
  }

  private async setupRealtimeSubscriptions(userId: string): Promise<void> {
    // Subscribe to notes changes
    const notesSubscription = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`,
        },
        this.handleRealtimeNotesChange.bind(this)
      )
      .subscribe();

    // Subscribe to groups changes
    const groupsSubscription = supabase
      .channel('groups_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
          filter: `user_id=eq.${userId}`,
        },
        this.handleRealtimeGroupsChange.bind(this)
      )
      .subscribe();

    this.realtimeSubscription = {
      unsubscribe: () => {
        notesSubscription.unsubscribe();
        groupsSubscription.unsubscribe();
      },
    };
  }

  private async handleRealtimeNotesChange(payload: any): Promise<void> {
    console.log('Realtime notes change:', payload);
    
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      switch (eventType) {
        case 'INSERT':
        case 'UPDATE':
          if (newRecord) {
            await this.handleRemoteNoteUpdate(newRecord);
          }
          break;
        case 'DELETE':
          if (oldRecord) {
            await this.handleRemoteNoteDelete(oldRecord);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling realtime notes change:', error);
      this.scheduleRetry('notes', () => this.handleRealtimeNotesChange(payload));
    }
  }

  private async handleRealtimeGroupsChange(payload: any): Promise<void> {
    console.log('Realtime groups change:', payload);
    
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      switch (eventType) {
        case 'INSERT':
        case 'UPDATE':
          if (newRecord) {
            await this.handleRemoteGroupUpdate(newRecord);
          }
          break;
        case 'DELETE':
          if (oldRecord) {
            await this.handleRemoteGroupDelete(oldRecord);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling realtime groups change:', error);
      this.scheduleRetry('groups', () => this.handleRealtimeGroupsChange(payload));
    }
  }

  private async handleRemoteNoteUpdate(remoteNote: any): Promise<void> {
    const localNote = await this.dbManager.getNoteById(remoteNote.id);
    
    if (!localNote) {
      // New note from server, add it locally
      await this.dbManager.createNote(
        remoteNote.title,
        remoteNote.content,
        remoteNote.content_markdown,
        remoteNote.content_plain,
        remoteNote.group_id,
        remoteNote.user_id
      );
    } else {
      // Check for conflicts
      const localTime = new Date(localNote.updated_at).getTime();
      const remoteTime = new Date(remoteNote.updated_at).getTime();
      
      if (remoteTime > localTime) {
        // Remote is newer, update local
        await this.dbManager.updateNote(remoteNote.id, {
          title: remoteNote.title,
          content: remoteNote.content,
          content_markdown: remoteNote.content_markdown,
          content_plain: remoteNote.content_plain,
          group_id: remoteNote.group_id,
        });
      }
    }
  }

  private async handleRemoteNoteDelete(remoteNote: any): Promise<void> {
    await this.dbManager.deleteNote(remoteNote.id);
  }

  private async handleRemoteGroupUpdate(remoteGroup: any): Promise<void> {
    const localGroup = await this.dbManager.getGroupById(remoteGroup.id);
    
    if (!localGroup) {
      // New group from server, add it locally
      await this.dbManager.createGroup(
        remoteGroup.name,
        remoteGroup.color,
        remoteGroup.user_id
      );
    } else {
      // Check for conflicts
      const localTime = new Date(localGroup.updated_at).getTime();
      const remoteTime = new Date(remoteGroup.updated_at).getTime();
      
      if (remoteTime > localTime) {
        // Remote is newer, update local
        await this.dbManager.updateGroup(remoteGroup.id, {
          name: remoteGroup.name,
          color: remoteGroup.color,
        });
      }
    }
  }

  private async handleRemoteGroupDelete(remoteGroup: any): Promise<void> {
    await this.dbManager.deleteGroup(remoteGroup.id);
  }

  private scheduleRetry(operation: string, retryFn: () => Promise<void>): void {
    // Clear existing timeout for this operation
    const existingTimeout = this.retryTimeouts.get(operation);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule retry with exponential backoff
    const retryDelay = Math.min(1000 * Math.pow(2, Math.random() * 3), 30000); // Max 30 seconds
    
    const timeout = setTimeout(async () => {
      try {
        await retryFn();
        this.retryTimeouts.delete(operation);
      } catch (error) {
        console.error(`Retry failed for ${operation}:`, error);
        // Could schedule another retry here if needed
      }
    }, retryDelay);

    this.retryTimeouts.set(operation, timeout);
  }

  async performMaintenanceSync(userId: string): Promise<void> {
    try {
      // Perform database maintenance
      await this.dbManager.performMaintenance();
      
      // Force a full sync
      await this.syncService.forceSyncNow(userId);
      
      console.log('Maintenance sync completed');
    } catch (error) {
      console.error('Maintenance sync failed:', error);
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      isOnline: this.syncService.getIsOnline(),
      isSyncing: this.syncService.getIsSyncing(),
    };
  }
}
