import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSync } from '../../hooks/useSync';

interface SyncIndicatorProps {
  onPress?: () => void;
  showDetails?: boolean;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  onPress,
  showDetails = false,
}) => {
  const theme = useTheme();
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingOperations,
    syncError,
  } = useSync();

  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isSyncing) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      
      return () => spinAnimation.stop();
    }
  }, [isSyncing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStatusIcon = (): string => {
    if (!isOnline) return '📴';
    if (syncError) return '⚠️';
    if (isSyncing) return '🔄';
    if (pendingOperations > 0) return '⏳';
    return '✅';
  };

  const getStatusText = (): string => {
    if (!isOnline) return 'Offline';
    if (syncError) return 'Sync Error';
    if (isSyncing) return 'Syncing...';
    if (pendingOperations > 0) return `${pendingOperations} pending`;
    if (lastSyncTime) {
      const now = new Date();
      const diffMs = now.getTime() - lastSyncTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just synced';
      if (diffMinutes < 60) return `Synced ${diffMinutes}m ago`;
      return `Synced ${Math.floor(diffMinutes / 60)}h ago`;
    }
    return 'Ready';
  };

  const getStatusColor = (): string => {
    if (!isOnline) return theme.colors.textSecondary;
    if (syncError) return theme.colors.error;
    if (isSyncing) return theme.colors.primary;
    if (pendingOperations > 0) return theme.colors.warning;
    return theme.colors.success;
  };

  const content = (
    <View style={[styles.container, { backgroundColor: theme.colors.glass }]}>
      <View style={styles.iconContainer}>
        {isSyncing ? (
          <Animated.Text
            style={[
              styles.icon,
              { color: getStatusColor(), transform: [{ rotate: spin }] }
            ]}
          >
            🔄
          </Animated.Text>
        ) : (
          <Text style={[styles.icon, { color: getStatusColor() }]}>
            {getStatusIcon()}
          </Text>
        )}
      </View>
      
      {showDetails && (
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          
          {syncError && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {syncError}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 20,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    marginRight: 8,
  },
  icon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default SyncIndicator;
