import { renderHook, act } from '@testing-library/react-hooks';
import { useAutoSave, useEditorAutoSave } from '../../src/hooks/useAutoSave';

// Mock timers
jest.useFakeTimers();

describe('useAutoSave', () => {
  let mockOnSave: jest.Mock;
  let mockOnError: jest.Mock;

  beforeEach(() => {
    mockOnSave = jest.fn().mockResolvedValue(undefined);
    mockOnError = jest.fn();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        onError: mockOnError,
      })
    );

    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBe(null);
    expect(result.current.saveError).toBe(null);
    expect(result.current.isDirty).toBe(false);
  });

  it('should trigger save after debounce delay', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        delay: 300,
        onSave: mockOnSave,
        onError: mockOnError,
      })
    );

    act(() => {
      result.current.triggerSave();
    });

    expect(result.current.isDirty).toBe(true);
    expect(mockOnSave).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Wait for async operation
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should debounce multiple save triggers', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        delay: 300,
        onSave: mockOnSave,
        onError: mockOnError,
      })
    );

    // Trigger multiple saves quickly
    act(() => {
      result.current.triggerSave();
      result.current.triggerSave();
      result.current.triggerSave();
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Should only call save once due to debouncing
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('should handle save errors', async () => {
    const saveError = new Error('Save failed');
    mockOnSave.mockRejectedValue(saveError);

    const { result } = renderHook(() =>
      useAutoSave({
        delay: 300,
        onSave: mockOnSave,
        onError: mockOnError,
      })
    );

    act(() => {
      result.current.triggerSave();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveError).toBe('Save failed');
    expect(mockOnError).toHaveBeenCalledWith(saveError);
  });

  it('should force save immediately', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        delay: 300,
        onSave: mockOnSave,
        onError: mockOnError,
      })
    );

    await act(async () => {
      await result.current.forceSave();
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should not save when disabled', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        delay: 300,
        enabled: false,
        onSave: mockOnSave,
        onError: mockOnError,
      })
    );

    act(() => {
      result.current.triggerSave();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(result.current.isDirty).toBe(false);
  });

  it('should clear error state', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        onSave: mockOnSave,
        onError: mockOnError,
      })
    );

    // Manually set error state
    act(() => {
      result.current.clearError();
    });

    expect(result.current.saveError).toBe(null);
  });
});

describe('useEditorAutoSave', () => {
  let mockOnSave: jest.Mock;

  beforeEach(() => {
    mockOnSave = jest.fn().mockResolvedValue(undefined);
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with initial content', () => {
    const initialContent = { ops: [{ insert: 'Hello world\n' }] };
    
    const { result } = renderHook(() =>
      useEditorAutoSave({
        noteId: 'note-1',
        initialContent,
        onSave: mockOnSave,
      })
    );

    expect(result.current.content).toEqual(initialContent);
  });

  it('should trigger save when content changes', async () => {
    const initialContent = { ops: [{ insert: 'Hello world\n' }] };
    const newContent = { ops: [{ insert: 'Hello world updated\n' }] };
    
    const { result } = renderHook(() =>
      useEditorAutoSave({
        noteId: 'note-1',
        initialContent,
        onSave: mockOnSave,
        autoSaveDelay: 300,
      })
    );

    act(() => {
      result.current.handleContentChange(
        newContent,
        'Hello world updated',
        'Hello world updated'
      );
    });

    expect(result.current.content).toEqual(newContent);
    expect(result.current.saveState.isDirty).toBe(true);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      newContent,
      'Hello world updated',
      'Hello world updated'
    );
  });

  it('should not trigger save for identical content', () => {
    const initialContent = { ops: [{ insert: 'Hello world\n' }] };
    
    const { result } = renderHook(() =>
      useEditorAutoSave({
        noteId: 'note-1',
        initialContent,
        onSave: mockOnSave,
        autoSaveDelay: 300,
      })
    );

    act(() => {
      result.current.handleContentChange(
        initialContent,
        'Hello world',
        'Hello world'
      );
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(result.current.saveState.isDirty).toBe(false);
  });

  it('should reset content when noteId changes', () => {
    const initialContent1 = { ops: [{ insert: 'Note 1\n' }] };
    const initialContent2 = { ops: [{ insert: 'Note 2\n' }] };
    
    const { result, rerender } = renderHook(
      ({ noteId, initialContent }) =>
        useEditorAutoSave({
          noteId,
          initialContent,
          onSave: mockOnSave,
        }),
      {
        initialProps: {
          noteId: 'note-1',
          initialContent: initialContent1,
        },
      }
    );

    expect(result.current.content).toEqual(initialContent1);

    // Change noteId and initial content
    rerender({
      noteId: 'note-2',
      initialContent: initialContent2,
    });

    expect(result.current.content).toEqual(initialContent2);
    expect(result.current.saveState.isDirty).toBe(false);
  });

  it('should force save when requested', async () => {
    const initialContent = { ops: [{ insert: 'Hello world\n' }] };
    const newContent = { ops: [{ insert: 'Hello world updated\n' }] };
    
    const { result } = renderHook(() =>
      useEditorAutoSave({
        noteId: 'note-1',
        initialContent,
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.handleContentChange(
        newContent,
        'Hello world updated',
        'Hello world updated'
      );
    });

    await act(async () => {
      await result.current.forceSave();
    });

    expect(mockOnSave).toHaveBeenCalledWith(
      newContent,
      'Hello world updated',
      'Hello world updated'
    );
    expect(result.current.saveState.isDirty).toBe(false);
  });
});
