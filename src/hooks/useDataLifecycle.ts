import { useState, useEffect, useCallback } from 'react';
import { BackupService } from '../services/BackupService';
import { CleanupService } from '../services/CleanupService';
import { supabase } from '../config/supabase';

export interface DataLifecycleState {
  isBackupInProgress: boolean;
  isCleanupInProgress: boolean;
  lastBackupDate: string | null;
  nextCleanupDate: Date | null;
  backupError: string | null;
  cleanupError: string | null;
}

export const useDataLifecycle = () => {
  const [state, setState] = useState<DataLifecycleState>({
    isBackupInProgress: false,
    isCleanupInProgress: false,
    lastBackupDate: null,
    nextCleanupDate: null,
    backupError: null,
    cleanupError: null,
  });

  const backupService = BackupService.getInstance();
  const cleanupService = CleanupService.getInstance();

  useEffect(() => {
    // Start periodic cleanup when component mounts
    const startCleanup = async () => {
      try {
        await cleanupService.startPeriodicCleanup();
        
        // Get cleanup stats
        const stats = await cleanupService.getCleanupStats();
        setState(prev => ({
          ...prev,
          nextCleanupDate: stats.nextCleanupDate,
        }));
      } catch (error) {
        console.error('Failed to start periodic cleanup:', error);
      }
    };

    startCleanup();

    return () => {
      cleanupService.stopPeriodicCleanup();
    };
  }, []);

  const createBackup = useCallback(async (): Promise<string | null> => {
    setState(prev => ({ ...prev, isBackupInProgress: true, backupError: null }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const filePath = await backupService.exportBackupToFile(user.id);
      
      setState(prev => ({
        ...prev,
        isBackupInProgress: false,
        lastBackupDate: new Date().toISOString(),
      }));

      return filePath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backup failed';
      setState(prev => ({
        ...prev,
        isBackupInProgress: false,
        backupError: errorMessage,
      }));
      return null;
    }
  }, [backupService]);

  const restoreBackup = useCallback(async (filePath: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isBackupInProgress: true, backupError: null }));

    try {
      await backupService.importBackupFromFile(filePath);
      
      setState(prev => ({
        ...prev,
        isBackupInProgress: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restore failed';
      setState(prev => ({
        ...prev,
        isBackupInProgress: false,
        backupError: errorMessage,
      }));
      return false;
    }
  }, [backupService]);

  const runCleanup = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isCleanupInProgress: true, cleanupError: null }));

    try {
      await cleanupService.forceCleanupNow();
      
      // Update next cleanup date
      const stats = await cleanupService.getCleanupStats();
      setState(prev => ({
        ...prev,
        isCleanupInProgress: false,
        nextCleanupDate: stats.nextCleanupDate,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
      setState(prev => ({
        ...prev,
        isCleanupInProgress: false,
        cleanupError: errorMessage,
      }));
      return false;
    }
  }, [cleanupService]);

  const softDeleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    try {
      await cleanupService.softDeleteNote(noteId);
      return true;
    } catch (error) {
      console.error('Failed to soft delete note:', error);
      return false;
    }
  }, [cleanupService]);

  const softDeleteGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      await cleanupService.softDeleteGroup(groupId);
      return true;
    } catch (error) {
      console.error('Failed to soft delete group:', error);
      return false;
    }
  }, [cleanupService]);

  const restoreDeletedNote = useCallback(async (noteId: string): Promise<boolean> => {
    try {
      await cleanupService.restoreDeletedNote(noteId);
      return true;
    } catch (error) {
      console.error('Failed to restore note:', error);
      return false;
    }
  }, [cleanupService]);

  const getBackupInfo = useCallback(async () => {
    try {
      return await backupService.getBackupInfo();
    } catch (error) {
      console.error('Failed to get backup info:', error);
      return null;
    }
  }, [backupService]);

  const getCleanupStats = useCallback(async () => {
    try {
      return await cleanupService.getCleanupStats();
    } catch (error) {
      console.error('Failed to get cleanup stats:', error);
      return null;
    }
  }, [cleanupService]);

  const listBackupFiles = useCallback(async (): Promise<string[]> => {
    try {
      return await backupService.listBackupFiles();
    } catch (error) {
      console.error('Failed to list backup files:', error);
      return [];
    }
  }, [backupService]);

  const deleteBackupFile = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      await backupService.deleteBackupFile(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete backup file:', error);
      return false;
    }
  }, [backupService]);

  const getDeletedNotes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      return await cleanupService.getDeletedNotes(user.id);
    } catch (error) {
      console.error('Failed to get deleted notes:', error);
      return [];
    }
  }, [cleanupService]);

  const getDeletedGroups = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      return await cleanupService.getDeletedGroups(user.id);
    } catch (error) {
      console.error('Failed to get deleted groups:', error);
      return [];
    }
  }, [cleanupService]);

  const clearError = useCallback((type: 'backup' | 'cleanup') => {
    setState(prev => ({
      ...prev,
      [type === 'backup' ? 'backupError' : 'cleanupError']: null,
    }));
  }, []);

  return {
    ...state,
    createBackup,
    restoreBackup,
    runCleanup,
    softDeleteNote,
    softDeleteGroup,
    restoreDeletedNote,
    getBackupInfo,
    getCleanupStats,
    listBackupFiles,
    deleteBackupFile,
    getDeletedNotes,
    getDeletedGroups,
    clearError,
  };
};
