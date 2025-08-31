import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { BackupService } from '../../services/BackupService';
import { CleanupService } from '../../services/CleanupService';
import { supabase } from '../../config/supabase';
import { commonStyles } from '../../theme';
import { formatDate } from '../../utils/dataUtils';

interface BackupManagerProps {
  visible: boolean;
  onClose: () => void;
}

interface BackupInfo {
  lastBackupDate: string | null;
  backupSize: number;
  itemCounts: {
    groups: number;
    notes: number;
  };
}

interface CleanupStats {
  deletedNotesCount: number;
  deletedGroupsCount: number;
  oldSyncOperationsCount: number;
  nextCleanupDate: Date;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [cleanupStats, setCleanupStats] = useState<CleanupStats | null>(null);
  const [backupFiles, setBackupFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const backupService = BackupService.getInstance();
  const cleanupService = CleanupService.getInstance();

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [info, stats, files] = await Promise.all([
        backupService.getBackupInfo(),
        cleanupService.getCleanupStats(),
        backupService.listBackupFiles(),
      ]);

      setBackupInfo(info);
      setCleanupStats(stats);
      setBackupFiles(files);
    } catch (error) {
      console.error('Failed to load backup data:', error);
      Alert.alert('Error', 'Failed to load backup information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const filePath = await backupService.exportBackupToFile(user.id);
      
      Alert.alert(
        'Backup Created',
        `Backup saved to: ${filePath}`,
        [{ text: 'OK', onPress: loadData }]
      );
    } catch (error) {
      console.error('Failed to create backup:', error);
      Alert.alert('Error', 'Failed to create backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = (filePath: string) => {
    Alert.alert(
      'Restore Backup',
      'This will replace all current data with the backup data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => performRestore(filePath),
        },
      ]
    );
  };

  const performRestore = async (filePath: string) => {
    try {
      setIsLoading(true);
      
      await backupService.importBackupFromFile(filePath);
      
      Alert.alert(
        'Backup Restored',
        'Your data has been restored from the backup.',
        [{ text: 'OK', onPress: () => { loadData(); onClose(); } }]
      );
    } catch (error) {
      console.error('Failed to restore backup:', error);
      Alert.alert('Error', 'Failed to restore backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = (filePath: string) => {
    Alert.alert(
      'Delete Backup',
      'Are you sure you want to delete this backup file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDeleteBackup(filePath),
        },
      ]
    );
  };

  const performDeleteBackup = async (filePath: string) => {
    try {
      await backupService.deleteBackupFile(filePath);
      loadData();
    } catch (error) {
      console.error('Failed to delete backup:', error);
      Alert.alert('Error', 'Failed to delete backup file');
    }
  };

  const handleRunCleanup = async () => {
    try {
      setIsLoading(true);
      
      await cleanupService.forceCleanupNow();
      
      Alert.alert(
        'Cleanup Complete',
        'Old deleted items have been permanently removed.',
        [{ text: 'OK', onPress: loadData }]
      );
    } catch (error) {
      console.error('Failed to run cleanup:', error);
      Alert.alert('Error', 'Failed to run cleanup');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileName = (filePath: string): string => {
    return filePath.split('/').pop() || filePath;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Backup & Cleanup
          </Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: theme.colors.text }]}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Backup Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Backup
            </Text>
            
            {backupInfo && (
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Last Backup
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {backupInfo.lastBackupDate 
                      ? formatDate(backupInfo.lastBackupDate)
                      : 'Never'
                    }
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Data Size
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {formatFileSize(backupInfo.backupSize)}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Notes
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {backupInfo.itemCounts.notes}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Groups
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {backupInfo.itemCounts.groups}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.actionButton,
                commonStyles.button,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleCreateBackup}
              disabled={isLoading}
            >
              <Text style={[styles.actionButtonText, { color: 'white' }]}>
                Create Backup
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cleanup Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Cleanup
            </Text>
            
            {cleanupStats && (
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Deleted Notes
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {cleanupStats.deletedNotesCount}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Deleted Groups
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {cleanupStats.deletedGroupsCount}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Old Sync Data
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {cleanupStats.oldSyncOperationsCount}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Next Cleanup
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {formatDate(cleanupStats.nextCleanupDate.toISOString())}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.actionButton,
                commonStyles.button,
                { backgroundColor: theme.colors.warning },
              ]}
              onPress={handleRunCleanup}
              disabled={isLoading}
            >
              <Text style={[styles.actionButtonText, { color: 'white' }]}>
                Run Cleanup Now
              </Text>
            </TouchableOpacity>
          </View>

          {/* Backup Files Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Backup Files
            </Text>
            
            {backupFiles.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No backup files found
              </Text>
            ) : (
              backupFiles.map((filePath, index) => (
                <View
                  key={index}
                  style={[styles.fileItem, { borderBottomColor: theme.colors.border }]}
                >
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: theme.colors.text }]}>
                      {getFileName(filePath)}
                    </Text>
                  </View>
                  
                  <View style={styles.fileActions}>
                    <TouchableOpacity
                      style={[styles.fileAction, { backgroundColor: theme.colors.primary }]}
                      onPress={() => handleRestoreBackup(filePath)}
                    >
                      <Text style={styles.fileActionText}>Restore</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.fileAction, { backgroundColor: theme.colors.error }]}
                      onPress={() => handleDeleteBackup(filePath)}
                    >
                      <Text style={styles.fileActionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 24,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileActions: {
    flexDirection: 'row',
  },
  fileAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  fileActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BackupManager;
