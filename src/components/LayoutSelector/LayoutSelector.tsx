import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { WindowLayout } from '../../types';
import { FEATURES } from '../../constants';

interface LayoutSelectorProps {
  visible: boolean;
  currentLayout: WindowLayout;
  onLayoutSelect: (layout: WindowLayout) => void;
  onClose: () => void;
  maxPanes?: number;
}

interface LayoutOption {
  type: WindowLayout['type'];
  name: string;
  description: string;
  icon: string;
  panes: number;
}

const layoutOptions: LayoutOption[] = [
  {
    type: 'single',
    name: 'Single Pane',
    description: 'Focus on one note at a time',
    icon: '▢',
    panes: 1,
  },
  {
    type: 'split-2',
    name: 'Split View',
    description: 'Two notes side by side',
    icon: '▢▢',
    panes: 2,
  },
  {
    type: 'split-3',
    name: 'Triple View',
    description: 'Three notes in columns',
    icon: '▢▢▢',
    panes: 3,
  },
  {
    type: 'split-4',
    name: 'Quad View',
    description: 'Four notes in columns',
    icon: '▢▢▢▢',
    panes: 4,
  },
];

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  visible,
  currentLayout,
  onLayoutSelect,
  onClose,
  maxPanes = 4,
}) => {
  const theme = useTheme();

  // Only show on Windows
  if (!FEATURES.splitView || Platform.OS !== 'windows') {
    return null;
  }

  const createLayout = (type: WindowLayout['type'], paneCount: number): WindowLayout => {
    const paneWidth = 100 / paneCount;
    const panes = Array.from({ length: paneCount }, (_, index) => ({
      id: `pane-${index}`,
      noteId: null,
      width: paneWidth,
      isActive: index === 0,
    }));

    return {
      type,
      panes,
    };
  };

  const handleLayoutSelect = (option: LayoutOption) => {
    const newLayout = createLayout(option.type, option.panes);
    onLayoutSelect(newLayout);
    onClose();
  };

  const renderLayoutOption = (option: LayoutOption) => {
    const isSelected = currentLayout.type === option.type;
    const isDisabled = option.panes > maxPanes;

    return (
      <TouchableOpacity
        key={option.type}
        style={[
          styles.layoutOption,
          {
            backgroundColor: isSelected 
              ? theme.colors.primary + '20'
              : theme.colors.surface,
            borderColor: isSelected 
              ? theme.colors.primary 
              : theme.colors.border,
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !isDisabled && handleLayoutSelect(option)}
        disabled={isDisabled}
      >
        <View style={styles.layoutIcon}>
          <Text style={[
            styles.iconText,
            { color: isSelected ? theme.colors.primary : theme.colors.text }
          ]}>
            {option.icon}
          </Text>
        </View>
        
        <View style={styles.layoutInfo}>
          <Text style={[
            styles.layoutName,
            { color: theme.colors.text }
          ]}>
            {option.name}
          </Text>
          <Text style={[
            styles.layoutDescription,
            { color: theme.colors.textSecondary }
          ]}>
            {option.description}
          </Text>
          {isDisabled && (
            <Text style={[
              styles.disabledText,
              { color: theme.colors.error }
            ]}>
              Screen too small
            </Text>
          )}
        </View>
        
        {isSelected && (
          <View style={[
            styles.selectedIndicator,
            { backgroundColor: theme.colors.primary }
          ]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { backgroundColor: theme.colors.surface }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={[
              styles.modalTitle,
              { color: theme.colors.text }
            ]}>
              Choose Layout
            </Text>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: theme.colors.border }
              ]}
              onPress={onClose}
            >
              <Text style={[
                styles.closeButtonText,
                { color: theme.colors.text }
              ]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.layoutGrid}>
            {layoutOptions.map(renderLayoutOption)}
          </View>
          
          <View style={styles.modalFooter}>
            <Text style={[
              styles.footerText,
              { color: theme.colors.textSecondary }
            ]}>
              Split view allows you to edit multiple notes simultaneously
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
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
  layoutGrid: {
    gap: 12,
  },
  layoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  layoutIcon: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 18,
    fontWeight: '600',
  },
  layoutInfo: {
    flex: 1,
  },
  layoutName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  layoutDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  disabledText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LayoutSelector;
