import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { QuillEditor } from '../RichTextEditor/QuillEditor';
import { SaveIndicator } from '../SaveIndicator/SaveIndicator';
import { useEditorAutoSave } from '../../hooks/useAutoSave';
import { useTheme } from '../../hooks/useTheme';
import { DatabaseManager } from '../../database/DatabaseManager';
import { QuillDelta, Note } from '../../types';
import { deltaToMarkdown, deltaToPlainText, generateNoteTitle } from '../../utils/dataUtils';

interface NoteEditorProps {
  noteId: string;
  note: Note | null;
  onNoteUpdate?: (note: Note) => void;
  onSaveError?: (error: Error) => void;
  readOnly?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  noteId,
  note,
  onNoteUpdate,
  onSaveError,
  readOnly = false,
  autoSave = true,
  autoSaveDelay = 300,
}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(note);

  const dbManager = DatabaseManager.getInstance();

  const handleSave = useCallback(async (
    content: QuillDelta,
    markdown: string,
    plainText: string
  ) => {
    if (!currentNote) return;

    try {
      setIsLoading(true);

      // Generate title from content if current title is default
      let title = currentNote.title;
      if (title === 'Untitled' || !title.trim()) {
        title = generateNoteTitle(content);
      }

      const updatedNote = await dbManager.updateNote(noteId, {
        title,
        content,
        content_markdown: markdown,
        content_plain: plainText,
      });

      if (updatedNote) {
        setCurrentNote(updatedNote);
        onNoteUpdate?.(updatedNote);
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      onSaveError?.(error instanceof Error ? error : new Error('Save failed'));
    } finally {
      setIsLoading(false);
    }
  }, [currentNote, noteId, dbManager, onNoteUpdate, onSaveError]);

  const {
    content,
    markdown,
    plainText,
    handleContentChange,
    forceSave,
    saveState,
    clearError,
  } = useEditorAutoSave({
    noteId,
    initialContent: currentNote?.content,
    onSave: handleSave,
    autoSaveDelay,
    enabled: autoSave && !readOnly,
  });

  // Update current note when prop changes
  useEffect(() => {
    setCurrentNote(note);
  }, [note]);

  // Force save when component unmounts or note changes
  useEffect(() => {
    return () => {
      if (saveState.isDirty && !readOnly) {
        forceSave();
      }
    };
  }, [saveState.isDirty, forceSave, readOnly]);

  const handleManualSave = useCallback(async () => {
    try {
      await forceSave();
      Alert.alert('Success', 'Note saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  }, [forceSave]);

  if (!currentNote) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyState}>
          {/* Empty state content */}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SaveIndicator
        isSaving={saveState.isSaving || isLoading}
        lastSaved={saveState.lastSaved}
        saveError={saveState.saveError}
        isDirty={saveState.isDirty}
      />
      
      <QuillEditor
        initialContent={currentNote.content}
        onContentChange={handleContentChange}
        onSave={handleManualSave}
        placeholder="Start writing your note..."
        readOnly={readOnly}
        theme={theme.colors.background === '#0f172a' ? 'dark' : 'light'}
        autoSave={autoSave}
        autoSaveDelay={autoSaveDelay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});

export default NoteEditor;
