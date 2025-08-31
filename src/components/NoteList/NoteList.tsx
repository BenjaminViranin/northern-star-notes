import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Note } from '../../types';
import { formatDate } from '../../utils/dataUtils';
import { commonStyles } from '../../theme';

interface NoteListProps {
  notes: Note[];
  selectedNoteId?: string | null;
  onNoteSelect: (note: Note) => void;
  onNoteDelete?: (note: Note) => void;
  onNoteCreate?: () => void;
  loading?: boolean;
  emptyMessage?: string;
}

interface NoteItemProps {
  note: Note;
  isSelected: boolean;
  onPress: () => void;
  onDelete?: () => void;
  theme: any;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  isSelected,
  onPress,
  onDelete,
  theme,
}) => {
  const handleLongPress = useCallback(() => {
    if (onDelete) {
      Alert.alert(
        'Delete Note',
        `Are you sure you want to delete "${note.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]
      );
    }
  }, [note.title, onDelete]);

  const getPreviewText = (content: any): string => {
    if (typeof content === 'string') {
      return content.substring(0, 100);
    }
    
    if (content && content.ops) {
      // Extract text from Quill Delta
      let text = '';
      for (const op of content.ops) {
        if (typeof op.insert === 'string') {
          text += op.insert;
        }
      }
      return text.substring(0, 100);
    }
    
    return note.content_plain?.substring(0, 100) || '';
  };

  return (
    <TouchableOpacity
      style={[
        styles.noteItem,
        commonStyles.card,
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
      <View style={styles.noteHeader}>
        <Text
          style={[
            styles.noteTitle,
            { color: theme.colors.text },
          ]}
          numberOfLines={1}
        >
          {note.title || 'Untitled'}
        </Text>
        <Text
          style={[
            styles.noteDate,
            { color: theme.colors.textSecondary },
          ]}
        >
          {formatDate(note.updated_at)}
        </Text>
      </View>
      
      <Text
        style={[
          styles.notePreview,
          { color: theme.colors.textSecondary },
        ]}
        numberOfLines={2}
      >
        {getPreviewText(note.content)}
      </Text>
      
      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  selectedNoteId,
  onNoteSelect,
  onNoteDelete,
  onNoteCreate,
  loading = false,
  emptyMessage = 'No notes yet',
}) => {
  const theme = useTheme();

  const renderNoteItem = useCallback(({ item }: { item: Note }) => (
    <NoteItem
      note={item}
      isSelected={item.id === selectedNoteId}
      onPress={() => onNoteSelect(item)}
      onDelete={onNoteDelete ? () => onNoteDelete(item) : undefined}
      theme={theme}
    />
  ), [selectedNoteId, onNoteSelect, onNoteDelete, theme]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: theme.colors.textSecondary }]}>
        📝
      </Text>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {emptyMessage}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Create your first note to get started
      </Text>
      {onNoteCreate && (
        <TouchableOpacity
          style={[
            styles.createButton,
            commonStyles.button,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={onNoteCreate}
        >
          <Text style={[styles.createButtonText, { color: 'white' }]}>
            Create Note
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
        Notes ({notes.length})
      </Text>
      {onNoteCreate && (
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={onNoteCreate}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingState}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading notes...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={notes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    flexGrow: 1,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  noteItem: {
    position: 'relative',
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  noteDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 32,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});

export default NoteList;
