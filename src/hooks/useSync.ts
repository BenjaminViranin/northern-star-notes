import { useState, useEffect, useCallback } from 'react';
import { SyncService, SyncStatus } from '../services/SyncService';
import { BackgroundSyncWorker } from '../services/BackgroundSyncWorker';
import { supabase } from '../config/supabase';

export const useSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSync: false,
    lastSyncTime: null,
    pendingOperations: 0,
    error: null,
  });

  const [isOnline, setIsOnline] = useState(false);
  const syncService = SyncService.getInstance();
  const backgroundWorker = BackgroundSyncWorker.getInstance();

  useEffect(() => {
    // Add sync status listener
    const handleStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    syncService.addStatusListener(handleStatusChange);
    setIsOnline(syncService.getIsOnline());

    // Check online status periodically
    const onlineCheckInterval = setInterval(() => {
      setIsOnline(syncService.getIsOnline());
    }, 5000);

    return () => {
      syncService.removeStatusListener(handleStatusChange);
      clearInterval(onlineCheckInterval);
    };
  }, [syncService]);

  const startSync = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await syncService.startSync(user.id);
      }
    } catch (error) {
      console.error('Failed to start sync:', error);
    }
  }, [syncService]);

  const forceSync = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await syncService.forceSyncNow(user.id);
      }
    } catch (error) {
      console.error('Failed to force sync:', error);
    }
  }, [syncService]);

  const startBackgroundSync = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await backgroundWorker.start(user.id);
      }
    } catch (error) {
      console.error('Failed to start background sync:', error);
    }
  }, [backgroundWorker]);

  const stopBackgroundSync = useCallback(() => {
    backgroundWorker.stop();
  }, [backgroundWorker]);

  const performMaintenance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await backgroundWorker.performMaintenanceSync(user.id);
      }
    } catch (error) {
      console.error('Failed to perform maintenance:', error);
    }
  }, [backgroundWorker]);

  return {
    syncStatus,
    isOnline,
    startSync,
    forceSync,
    startBackgroundSync,
    stopBackgroundSync,
    performMaintenance,
    isSyncing: syncStatus.isSync,
    lastSyncTime: syncStatus.lastSyncTime,
    pendingOperations: syncStatus.pendingOperations,
    syncError: syncStatus.error,
  };
};

// Hook for managing offline queue
export const useOfflineQueue = () => {
  const [queueSize, setQueueSize] = useState(0);
  const [failedItems, setFailedItems] = useState(0);

  const updateQueueStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const syncService = SyncService.getInstance();
        // This would need to be implemented in SyncService
        // const size = await syncService.getQueueSize(user.id);
        // const failed = await syncService.getFailedItemsCount(user.id);
        // setQueueSize(size);
        // setFailedItems(failed);
      }
    } catch (error) {
      console.error('Failed to update queue status:', error);
    }
  }, []);

  useEffect(() => {
    updateQueueStatus();
    
    // Update queue status periodically
    const interval = setInterval(updateQueueStatus, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [updateQueueStatus]);

  return {
    queueSize,
    failedItems,
    updateQueueStatus,
  };
};

// Hook for conflict resolution
export const useConflictResolution = () => {
  const [conflicts, setConflicts] = useState<any[]>([]);

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge'
  ) => {
    try {
      // Implementation would depend on how conflicts are stored and managed
      console.log(`Resolving conflict ${conflictId} with ${resolution}`);
      
      // Remove resolved conflict from list
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  }, []);

  const checkForConflicts = useCallback(async () => {
    try {
      // Implementation would check for conflicts in the database
      // This is a placeholder
      const foundConflicts: any[] = [];
      setConflicts(foundConflicts);
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
    }
  }, []);

  return {
    conflicts,
    resolveConflict,
    checkForConflicts,
    hasConflicts: conflicts.length > 0,
  };
};
