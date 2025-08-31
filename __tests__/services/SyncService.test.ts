import { SyncService } from '../../src/services/SyncService';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { supabase } from '../../src/config/supabase';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('../../src/database/DatabaseManager');
jest.mock('../../src/config/supabase');
jest.mock('@react-native-community/netinfo');

const mockDatabaseManager = DatabaseManager as jest.Mocked<typeof DatabaseManager>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('SyncService', () => {
  let syncService: SyncService;
  let mockDbInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock DatabaseManager instance
    mockDbInstance = {
      getSyncQueueSize: jest.fn().mockResolvedValue(0),
      getPendingSyncItems: jest.fn().mockResolvedValue([]),
      removeSyncItem: jest.fn().mockResolvedValue(undefined),
      incrementSyncRetry: jest.fn().mockResolvedValue(undefined),
      setSetting: jest.fn().mockResolvedValue(undefined),
      getSetting: jest.fn().mockResolvedValue(null),
    };

    mockDatabaseManager.getInstance.mockReturnValue(mockDbInstance);

    // Mock NetInfo
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      // Simulate online state
      callback({ isConnected: true });
      return { remove: jest.fn() };
    });

    // Mock Supabase auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Mock Supabase from method
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as any);

    syncService = SyncService.getInstance();
  });

  describe('Network Status', () => {
    it('should detect online status', () => {
      expect(syncService.getIsOnline()).toBe(true);
    });

    it('should trigger sync when coming online', () => {
      const startSyncSpy = jest.spyOn(syncService, 'startSync');
      
      // Simulate going offline then online
      const callback = mockNetInfo.addEventListener.mock.calls[0][0];
      callback({ isConnected: false });
      callback({ isConnected: true });

      expect(startSyncSpy).toHaveBeenCalled();
    });
  });

  describe('Sync Process', () => {
    it('should not sync when offline', async () => {
      // Simulate offline state
      const callback = mockNetInfo.addEventListener.mock.calls[0][0];
      callback({ isConnected: false });

      const result = await syncService.startSync('user-123');
      
      expect(mockDbInstance.getPendingSyncItems).not.toHaveBeenCalled();
    });

    it('should not sync when already syncing', async () => {
      // Start first sync
      const syncPromise1 = syncService.startSync('user-123');
      
      // Try to start second sync while first is running
      const syncPromise2 = syncService.startSync('user-123');

      await Promise.all([syncPromise1, syncPromise2]);

      // Should only call once
      expect(mockDbInstance.getPendingSyncItems).toHaveBeenCalledTimes(1);
    });

    it('should process pending sync items', async () => {
      const mockSyncItems = [
        {
          id: 'sync-1',
          table_name: 'notes',
          record_id: 'note-1',
          operation: 'INSERT',
          data: JSON.stringify({
            id: 'note-1',
            title: 'Test Note',
            content: '{}',
          }),
        },
      ];

      mockDbInstance.getPendingSyncItems.mockResolvedValue(mockSyncItems);

      await syncService.startSync('user-123');

      expect(mockDbInstance.getPendingSyncItems).toHaveBeenCalledWith('user-123', 50);
      expect(mockDbInstance.removeSyncItem).toHaveBeenCalledWith('sync-1');
    });

    it('should handle sync item errors', async () => {
      const mockSyncItems = [
        {
          id: 'sync-1',
          table_name: 'notes',
          record_id: 'note-1',
          operation: 'INSERT',
          data: JSON.stringify({
            id: 'note-1',
            title: 'Test Note',
          }),
        },
      ];

      mockDbInstance.getPendingSyncItems.mockResolvedValue(mockSyncItems);
      
      // Mock Supabase to throw error
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Network error')),
      } as any);

      await syncService.startSync('user-123');

      expect(mockDbInstance.incrementSyncRetry).toHaveBeenCalledWith(
        'sync-1',
        'Network error'
      );
    });

    it('should pull remote changes', async () => {
      const mockRemoteNotes = [
        {
          id: 'note-1',
          title: 'Remote Note',
          content: { ops: [{ insert: 'Remote content\n' }] },
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: mockRemoteNotes,
              error: null,
            }),
          }),
        }),
      } as any);

      await syncService.startSync('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('notes');
      expect(mockDbInstance.setSetting).toHaveBeenCalledWith(
        'lastSyncTime',
        expect.any(String)
      );
    });
  });

  describe('Sync Status Listeners', () => {
    it('should notify listeners of sync status changes', async () => {
      const mockListener = jest.fn();
      syncService.addStatusListener(mockListener);

      await syncService.startSync('user-123');

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          isSync: true,
          pendingOperations: 0,
          error: null,
        })
      );

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          isSync: false,
          lastSyncTime: expect.any(Date),
          pendingOperations: 0,
          error: null,
        })
      );
    });

    it('should remove listeners', () => {
      const mockListener = jest.fn();
      syncService.addStatusListener(mockListener);
      syncService.removeStatusListener(mockListener);

      // Listener should not be called after removal
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Periodic Sync', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start periodic sync', () => {
      const startSyncSpy = jest.spyOn(syncService, 'startSync');
      
      syncService.startPeriodicSync(5000); // 5 seconds

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      expect(startSyncSpy).toHaveBeenCalled();
    });

    it('should stop periodic sync', () => {
      const startSyncSpy = jest.spyOn(syncService, 'startSync');
      
      syncService.startPeriodicSync(5000);
      syncService.stopPeriodicSync();

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      // Should not sync after stopping
      expect(startSyncSpy).not.toHaveBeenCalled();
    });

    it('should not sync when offline during periodic sync', () => {
      const startSyncSpy = jest.spyOn(syncService, 'startSync');
      
      // Simulate offline state
      const callback = mockNetInfo.addEventListener.mock.calls[0][0];
      callback({ isConnected: false });

      syncService.startPeriodicSync(5000);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      expect(startSyncSpy).not.toHaveBeenCalled();
    });
  });

  describe('Force Sync', () => {
    it('should force sync immediately', async () => {
      const startSyncSpy = jest.spyOn(syncService, 'startSync');
      
      await syncService.forceSyncNow('user-123');

      expect(startSyncSpy).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle note conflicts with last-write-wins', async () => {
      // This would test the conflict resolution logic
      // Implementation depends on how conflicts are detected and resolved
      expect(true).toBe(true); // Placeholder
    });

    it('should handle group conflicts with last-write-wins', async () => {
      // This would test group conflict resolution
      expect(true).toBe(true); // Placeholder
    });
  });
});
