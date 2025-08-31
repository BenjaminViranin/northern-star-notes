import React, { useCallback, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Group } from '../../types';
import { commonStyles, defaultGroupColors } from '../../theme';

interface GroupListProps {
  groups: Group[];
  selectedGroupId?: string | null;
  onGroupSelect: (group: Group | null) => void; // null for "All Notes"
  onGroupCreate?: (name: string, color: string) => void;
  onGroupUpdate?: (group: Group, updates: { name?: string; color?: string }) => void;
  onGroupDelete?: (group: Group) => void;
  loading?: boolean;
}

interface GroupItemProps {
  group: Group;
  isSelected: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  theme: any;
}

const GroupItem: React.FC<GroupItemProps> = ({
  group,
  isSelected,
  onPress,
  onEdit,
  onDelete,
  theme,
}) => {
  const handleLongPress = useCallback(() => {
    Alert.alert(
      group.name,
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: onEdit },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  }, [group.name, onEdit, onDelete]);

  return (
    <TouchableOpacity
      style={[
        styles.groupItem,
        {
          backgroundColor: isSelected
            ? theme.colors.primary + '20'
            : theme.colors.surface,
          borderColor: isSelected
            ? theme.colors.primary
            : theme.colors.border,
        },
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.colorIndicator,
          { backgroundColor: group.color },
        ]}
      />
      <Text
        style={[
          styles.groupName,
          { color: theme.colors.text },
        ]}
        numberOfLines={1}
      >
        {group.name}
      </Text>
      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

const GroupEditModal: React.FC<{
  visible: boolean;
  group?: Group;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  theme: any;
}> = ({ visible, group, onSave, onCancel, theme }) => {
  const [name, setName] = useState(group?.name || '');
  const [selectedColor, setSelectedColor] = useState(group?.color || defaultGroupColors[0]);

  React.useEffect(() => {
    if (group) {
      setName(group.name);
      setSelectedColor(group.color);
    } else {
      setName('');
      setSelectedColor(defaultGroupColors[0]);
    }
  }, [group]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), selectedColor);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {group ? 'Edit Group' : 'Create Group'}
          </Text>
          
          <TextInput
            style={[
              styles.nameInput,
              commonStyles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Group name"
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus
          />
          
          <Text style={[styles.colorLabel, { color: theme.colors.text }]}>
            Color
          </Text>
          
          <View style={styles.colorGrid}>
            {defaultGroupColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.border },
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={[styles.modalButtonText, { color: 'white' }]}>
                {group ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  selectedGroupId,
  onGroupSelect,
  onGroupCreate,
  onGroupUpdate,
  onGroupDelete,
  loading = false,
}) => {
  const theme = useTheme();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>();

  const handleGroupEdit = useCallback((group: Group) => {
    setEditingGroup(group);
    setEditModalVisible(true);
  }, []);

  const handleGroupDelete = useCallback((group: Group) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? All notes in this group will be moved to Uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onGroupDelete?.(group) },
      ]
    );
  }, [onGroupDelete]);

  const handleCreateGroup = useCallback(() => {
    setEditingGroup(undefined);
    setEditModalVisible(true);
  }, []);

  const handleModalSave = useCallback((name: string, color: string) => {
    if (editingGroup) {
      onGroupUpdate?.(editingGroup, { name, color });
    } else {
      onGroupCreate?.(name, color);
    }
    setEditModalVisible(false);
  }, [editingGroup, onGroupCreate, onGroupUpdate]);

  const renderGroupItem = useCallback(({ item }: { item: Group }) => (
    <GroupItem
      group={item}
      isSelected={item.id === selectedGroupId}
      onPress={() => onGroupSelect(item)}
      onEdit={() => handleGroupEdit(item)}
      onDelete={() => handleGroupDelete(item)}
      theme={theme}
    />
  ), [selectedGroupId, onGroupSelect, handleGroupEdit, handleGroupDelete, theme]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
        Groups
      </Text>
      {onGroupCreate && (
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleCreateGroup}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAllNotesItem = () => (
    <TouchableOpacity
      style={[
        styles.groupItem,
        {
          backgroundColor: selectedGroupId === null
            ? theme.colors.primary + '20'
            : theme.colors.surface,
          borderColor: selectedGroupId === null
            ? theme.colors.primary
            : theme.colors.border,
        },
      ]}
      onPress={() => onGroupSelect(null)}
    >
      <View
        style={[
          styles.colorIndicator,
          { backgroundColor: theme.colors.textSecondary },
        ]}
      />
      <Text
        style={[
          styles.groupName,
          { color: theme.colors.text },
        ]}
      >
        All Notes
      </Text>
      {selectedGroupId === null && (
        <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingState}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading groups...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <View>
            {renderHeader()}
            {renderAllNotesItem()}
            <View style={styles.separator} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      
      <GroupEditModal
        visible={editModalVisible}
        group={editingGroup}
        onSave={handleModalSave}
        onCancel={() => setEditModalVisible(false)}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  groupName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  separator: {
    height: 8,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
  nameInput: {
    marginBottom: 16,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupList;
