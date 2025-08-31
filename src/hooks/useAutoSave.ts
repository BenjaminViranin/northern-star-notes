import { useEffect, useRef, useState, useCallback } from 'react';
import { debounce } from '../utils/dataUtils';

export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  isDirty: boolean;
}

export interface UseAutoSaveOptions {
  delay?: number; // milliseconds
  enabled?: boolean;
  onSave: () => Promise<void>;
  onError?: (error: Error) => void;
}

export const useAutoSave = (options: UseAutoSaveOptions) => {
  const {
    delay = 300,
    enabled = true,
    onSave,
    onError,
  } = options;

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    saveError: null,
    isDirty: false,
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const performSave = useCallback(async () => {
    if (!isMountedRef.current || !enabled) return;

    setState(prev => ({ ...prev, isSaving: true, saveError: null }));

    try {
      await onSave();
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(),
          isDirty: false,
          saveError: null,
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          saveError: errorMessage,
        }));
      }
      
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [enabled, onSave, onError]);

  const debouncedSave = useCallback(
    debounce(performSave, delay),
    [performSave, delay]
  );

  const triggerSave = useCallback(() => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isDirty: true }));
    debouncedSave();
  }, [enabled, debouncedSave]);

  const forceSave = useCallback(async () => {
    if (!enabled) return;

    // Cancel any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    await performSave();
  }, [enabled, performSave]);

  const markDirty = useCallback(() => {
    setState(prev => ({ ...prev, isDirty: true }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, saveError: null }));
  }, []);

  return {
    ...state,
    triggerSave,
    forceSave,
    markDirty,
    clearError,
  };
};

// Hook for managing editor state with autosave
export interface UseEditorAutoSaveOptions {
  noteId: string;
  initialContent?: any;
  onSave: (content: any, markdown: string, plainText: string) => Promise<void>;
  autoSaveDelay?: number;
  enabled?: boolean;
}

export const useEditorAutoSave = (options: UseEditorAutoSaveOptions) => {
  const {
    noteId,
    initialContent,
    onSave,
    autoSaveDelay = 300,
    enabled = true,
  } = options;

  const [content, setContent] = useState(initialContent);
  const [markdown, setMarkdown] = useState('');
  const [plainText, setPlainText] = useState('');
  const lastSavedContentRef = useRef(initialContent);

  const handleSave = useCallback(async () => {
    if (content && content !== lastSavedContentRef.current) {
      await onSave(content, markdown, plainText);
      lastSavedContentRef.current = content;
    }
  }, [content, markdown, plainText, onSave]);

  const autoSave = useAutoSave({
    delay: autoSaveDelay,
    enabled,
    onSave: handleSave,
  });

  const handleContentChange = useCallback((
    newContent: any,
    newMarkdown: string,
    newPlainText: string
  ) => {
    setContent(newContent);
    setMarkdown(newMarkdown);
    setPlainText(newPlainText);
    
    // Only trigger autosave if content actually changed
    if (JSON.stringify(newContent) !== JSON.stringify(lastSavedContentRef.current)) {
      autoSave.triggerSave();
    }
  }, [autoSave]);

  // Reset when noteId changes
  useEffect(() => {
    setContent(initialContent);
    lastSavedContentRef.current = initialContent;
    autoSave.clearError();
  }, [noteId, initialContent, autoSave]);

  // Force save on unmount or when switching notes
  useEffect(() => {
    return () => {
      if (autoSave.isDirty) {
        autoSave.forceSave();
      }
    };
  }, [autoSave]);

  return {
    content,
    markdown,
    plainText,
    handleContentChange,
    forceSave: autoSave.forceSave,
    saveState: {
      isSaving: autoSave.isSaving,
      lastSaved: autoSave.lastSaved,
      saveError: autoSave.saveError,
      isDirty: autoSave.isDirty,
    },
    clearError: autoSave.clearError,
  };
};
