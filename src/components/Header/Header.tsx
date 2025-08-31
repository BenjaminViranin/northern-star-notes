import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
} from 'react-native';
import { useTheme, useThemeMode } from '../../hooks/useTheme';
import { SyncIndicator } from '../SyncIndicator/SyncIndicator';
import { useSync } from '../../hooks/useSync';
import { commonStyles } from '../../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSync?: boolean;
  showThemeToggle?: boolean;
  showSettings?: boolean;
  onSettingsPress?: () => void;
  leftAction?: {
    icon: string;
    onPress: () => void;
  };
  rightActions?: Array<{
    icon: string;
    onPress: () => void;
  }>;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  showSync = true,
  showThemeToggle = true,
  showSettings = true,
  onSettingsPress,
  leftAction,
  rightActions = [],
}) => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeMode();
  const { forceSync } = useSync();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const handleSyncPress = () => {
    forceSync();
  };

  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      setSettingsModalVisible(true);
    }
  };

  const renderSearchBar = () => {
    if (!showSearch || !isSearchVisible) return null;

    return (
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            commonStyles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search notes..."
          placeholderTextColor={theme.colors.textSecondary}
          autoFocus
        />
        <TouchableOpacity
          style={[styles.searchCloseButton, { backgroundColor: theme.colors.border }]}
          onPress={() => {
            setIsSearchVisible(false);
            onSearchChange?.('');
          }}
        >
          <Text style={[styles.searchCloseText, { color: theme.colors.text }]}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSettingsModal = () => (
    <Modal visible={settingsModalVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Settings
          </Text>
          
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
            onPress={toggleTheme}
          >
            <Text style={[styles.settingText, { color: theme.colors.text }]}>
              Theme
            </Text>
            <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>
              {isDark ? 'Dark' : 'Light'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
            onPress={handleSyncPress}
          >
            <Text style={[styles.settingText, { color: theme.colors.text }]}>
              Force Sync
            </Text>
            <Text style={[styles.settingValue, { color: theme.colors.primary }]}>
              Sync Now
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setSettingsModalVisible(false)}
          >
            <Text style={[styles.modalButtonText, { color: 'white' }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.mainHeader}>
        <View style={styles.leftSection}>
          {leftAction && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
              onPress={leftAction.onPress}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.text }]}>
                {leftAction.icon}
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.rightSection}>
          {showSearch && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setIsSearchVisible(!isSearchVisible)}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.text }]}>
                🔍
              </Text>
            </TouchableOpacity>
          )}
          
          {rightActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
              onPress={action.onPress}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.text }]}>
                {action.icon}
              </Text>
            </TouchableOpacity>
          ))}
          
          {showSync && (
            <SyncIndicator onPress={handleSyncPress} />
          )}
          
          {showThemeToggle && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
              onPress={toggleTheme}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.text }]}>
                {isDark ? '☀️' : '🌙'}
              </Text>
            </TouchableOpacity>
          )}
          
          {showSettings && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
              onPress={handleSettingsPress}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.text }]}>
                ⚙️
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {renderSearchBar()}
      {renderSettingsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 44, // Status bar height
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    marginRight: 8,
  },
  searchCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCloseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Header;
