import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface SaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  isDirty: boolean;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  isSaving,
  lastSaved,
  saveError,
  isDirty,
}) => {
  const theme = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isSaving) {
      // Fade in when saving
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out after save completes
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isSaving, fadeAnim]);

  const getStatusText = (): string => {
    if (saveError) {
      return 'Save failed';
    }
    
    if (isSaving) {
      return 'Saving...';
    }
    
    if (isDirty) {
      return 'Unsaved changes';
    }
    
    if (lastSaved) {
      const now = new Date();
      const diffMs = now.getTime() - lastSaved.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      
      if (diffSeconds < 60) {
        return 'Saved just now';
      } else if (diffMinutes < 60) {
        return `Saved ${diffMinutes}m ago`;
      } else {
        return `Saved at ${lastSaved.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      }
    }
    
    return '';
  };

  const getStatusColor = (): string => {
    if (saveError) {
      return theme.colors.error;
    }
    
    if (isSaving) {
      return theme.colors.primary;
    }
    
    if (isDirty) {
      return theme.colors.warning;
    }
    
    return theme.colors.success;
  };

  const getStatusIcon = (): string => {
    if (saveError) {
      return '⚠️';
    }
    
    if (isSaving) {
      return '💾';
    }
    
    if (isDirty) {
      return '●';
    }
    
    return '✓';
  };

  const statusText = getStatusText();
  
  if (!statusText) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.icon, { color: getStatusColor() }]}>
          {getStatusIcon()}
        </Text>
        <Text style={[styles.text, { color: getStatusColor() }]}>
          {statusText}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  icon: {
    fontSize: 12,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SaveIndicator;
