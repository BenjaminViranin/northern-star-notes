import { DatabaseManager } from '../database/DatabaseManager';
import { NotesDAO } from '../database/notesDAO';
import { SyncQueueDAO } from '../database/syncQueueDAO';
import { supabase } from '../config/supabase';
import { CLEANUP } from '../constants';

export class CleanupService {
  private static instance: CleanupService;
  private dbManager: DatabaseManager;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  async startPeriodicCleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup immediately
    await this.performCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Periodic cleanup failed:', error);
      }
    }, CLEANUP.maintenanceInterval);

    console.log('Periodic cleanup started');
  }

  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Periodic cleanup stopped');
    }
  }

  async performCleanup(): Promise<void> {
    try {
      console.log('Starting cleanup process...');

      // Clean up local database
      await this.cleanupLocalData();

      // Clean up server data (if user is authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.cleanupServerData(user.id);
      }

      console.log('Cleanup process completed');
    } catch (error) {
      console.error('Cleanup process failed:', error);
      throw error;
    }
  }

  private async cleanupLocalData(): Promise<void> {
    try {
      // Clean up old deleted notes (30+ days)
      await NotesDAO.cleanupOldDeletedNotes();

      // Clean up old sync queue items (7+ days)
      await SyncQueueDAO.removeOldItems();

      // Clean up processed sync operations
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await SyncQueueDAO.clearProcessedItems(user.id);
      }

      console.log('Local data cleanup completed');
    } catch (error) {
      console.error('Local data cleanup failed:', error);
      throw error;
    }
  }

  private async cleanupServerData(userId: string): Promise<void> {
    try {
      // Clean up old deleted notes on server
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - CLEANUP.deletedNotesRetentionDays);

      await supabase
        .from('notes')
        .delete()
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .lt('deleted_at', thirtyDaysAgo.toISOString());

      // Clean up old deleted groups on server
      await supabase
        .from('groups')
        .delete()
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .lt('updated_at', thirtyDaysAgo.toISOString());

      // Clean up old processed sync operations
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - CLEANUP.syncQueueRetentionDays);

      await supabase
        .from('sync_operations')
        .delete()
        .eq('user_id', userId)
        .eq('processed', true)
        .lt('created_at', sevenDaysAgo.toISOString());

      console.log('Server data cleanup completed');
    } catch (error) {
      console.error('Server data cleanup failed:', error);
      throw error;
    }
  }

  async softDeleteNote(noteId: string): Promise<void> {
    try {
      const note = await this.dbManager.getNoteById(noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      // Mark as deleted locally
      await this.dbManager.deleteNote(noteId);

      // Add to sync queue for server deletion
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.dbManager.addToSyncQueue(
          'notes',
          noteId,
          'DELETE',
          { id: noteId, deleted_at: new Date().toISOString() },
          user.id
        );
      }

      console.log(`Note ${noteId} soft deleted`);
    } catch (error) {
      console.error('Failed to soft delete note:', error);
      throw error;
    }
  }

  async softDeleteGroup(groupId: string): Promise<void> {
    try {
      const group = await this.dbManager.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Get uncategorized group
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const uncategorizedGroup = await this.dbManager.getUncategorizedGroup(user.id);
      if (!uncategorizedGroup) {
        throw new Error('Uncategorized group not found');
      }

      // Move all notes from this group to uncategorized
      await this.dbManager.moveNotesToGroup(groupId, uncategorizedGroup.id, user.id);

      // Mark group as deleted locally
      await this.dbManager.deleteGroup(groupId);

      // Add to sync queue for server deletion
      await this.dbManager.addToSyncQueue(
        'groups',
        groupId,
        'DELETE',
        { id: groupId },
        user.id
      );

      console.log(`Group ${groupId} soft deleted and notes moved to uncategorized`);
    } catch (error) {
      console.error('Failed to soft delete group:', error);
      throw error;
    }
  }

  async permanentlyDeleteNote(noteId: string): Promise<void> {
    try {
      // This would permanently delete a note from both local and server
      // Only use for notes that have been soft-deleted for 30+ days
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete from server
      await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      // Delete from local database (if still exists)
      const note = await this.dbManager.getNoteById(noteId);
      if (note) {
        await this.dbManager.deleteNote(noteId);
      }

      console.log(`Note ${noteId} permanently deleted`);
    } catch (error) {
      console.error('Failed to permanently delete note:', error);
      throw error;
    }
  }

  async restoreDeletedNote(noteId: string): Promise<void> {
    try {
      // This would restore a soft-deleted note
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update on server
      await supabase
        .from('notes')
        .update({
          is_deleted: false,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', user.id);

      // Update locally (if exists)
      const note = await this.dbManager.getNoteById(noteId);
      if (note) {
        await this.dbManager.updateNote(noteId, {
          // This would need to be implemented in the DAO
        });
      }

      console.log(`Note ${noteId} restored`);
    } catch (error) {
      console.error('Failed to restore note:', error);
      throw error;
    }
  }

  async getCleanupStats(): Promise<{
    deletedNotesCount: number;
    deletedGroupsCount: number;
    oldSyncOperationsCount: number;
    nextCleanupDate: Date;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Count deleted notes
      const { count: deletedNotesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_deleted', true);

      // Count deleted groups
      const { count: deletedGroupsCount } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_deleted', true);

      // Count old sync operations
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: oldSyncOperationsCount } = await supabase
        .from('sync_operations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('processed', true)
        .lt('created_at', sevenDaysAgo.toISOString());

      // Calculate next cleanup date
      const nextCleanupDate = new Date();
      nextCleanupDate.setTime(nextCleanupDate.getTime() + CLEANUP.maintenanceInterval);

      return {
        deletedNotesCount: deletedNotesCount || 0,
        deletedGroupsCount: deletedGroupsCount || 0,
        oldSyncOperationsCount: oldSyncOperationsCount || 0,
        nextCleanupDate,
      };
    } catch (error) {
      console.error('Failed to get cleanup stats:', error);
      throw error;
    }
  }

  async forceCleanupNow(): Promise<void> {
    await this.performCleanup();
  }

  async getDeletedNotes(userId: string): Promise<any[]> {
    try {
      const { data: deletedNotes } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      return deletedNotes || [];
    } catch (error) {
      console.error('Failed to get deleted notes:', error);
      return [];
    }
  }

  async getDeletedGroups(userId: string): Promise<any[]> {
    try {
      const { data: deletedGroups } = await supabase
        .from('groups')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', true)
        .order('updated_at', { ascending: false });

      return deletedGroups || [];
    } catch (error) {
      console.error('Failed to get deleted groups:', error);
      return [];
    }
  }
}
