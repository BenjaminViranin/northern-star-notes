import {
  deltaToMarkdown,
  markdownToDelta,
  deltaToPlainText,
  validateNote,
  validateGroup,
  generateNoteTitle,
  debounce,
  resolveConflict,
} from '../../src/utils/dataUtils';
import { QuillDelta } from '../../src/types';

describe('dataUtils', () => {
  describe('deltaToMarkdown', () => {
    it('should convert simple text to markdown', () => {
      const delta: QuillDelta = {
        ops: [{ insert: 'Hello world\n' }],
      };

      const markdown = deltaToMarkdown(delta);
      expect(markdown).toBe('Hello world');
    });

    it('should convert bold text to markdown', () => {
      const delta: QuillDelta = {
        ops: [
          { insert: 'Hello ' },
          { insert: 'world', attributes: { bold: true } },
          { insert: '\n' },
        ],
      };

      const markdown = deltaToMarkdown(delta);
      expect(markdown).toBe('Hello **world**');
    });

    it('should convert italic text to markdown', () => {
      const delta: QuillDelta = {
        ops: [
          { insert: 'Hello ' },
          { insert: 'world', attributes: { italic: true } },
          { insert: '\n' },
        ],
      };

      const markdown = deltaToMarkdown(delta);
      expect(markdown).toBe('Hello *world*');
    });

    it('should convert headers to markdown', () => {
      const delta: QuillDelta = {
        ops: [
          { insert: 'Main Title', attributes: { header: 1 } },
          { insert: '\n' },
          { insert: 'Subtitle', attributes: { header: 2 } },
          { insert: '\n' },
        ],
      };

      const markdown = deltaToMarkdown(delta);
      expect(markdown).toBe('# Main Title\n## Subtitle');
    });

    it('should convert lists to markdown', () => {
      const delta: QuillDelta = {
        ops: [
          { insert: 'Item 1', attributes: { list: 'bullet' } },
          { insert: '\n' },
          { insert: 'Item 2', attributes: { list: 'bullet' } },
          { insert: '\n' },
        ],
      };

      const markdown = deltaToMarkdown(delta);
      expect(markdown).toBe('- Item 1\n- Item 2');
    });

    it('should convert code to markdown', () => {
      const delta: QuillDelta = {
        ops: [
          { insert: 'Here is some ' },
          { insert: 'code', attributes: { code: true } },
          { insert: '\n' },
        ],
      };

      const markdown = deltaToMarkdown(delta);
      expect(markdown).toBe('Here is some `code`');
    });
  });

  describe('markdownToDelta', () => {
    it('should convert simple markdown to delta', () => {
      const markdown = 'Hello world';
      const delta = markdownToDelta(markdown);

      expect(delta.ops).toEqual([
        { insert: 'Hello world' },
        { insert: '\n' },
      ]);
    });

    it('should convert headers to delta', () => {
      const markdown = '# Main Title\n## Subtitle';
      const delta = markdownToDelta(markdown);

      expect(delta.ops).toContainEqual({
        insert: 'Main Title',
        attributes: { header: 1 },
      });
      expect(delta.ops).toContainEqual({
        insert: 'Subtitle',
        attributes: { header: 2 },
      });
    });

    it('should convert lists to delta', () => {
      const markdown = '- Item 1\n- Item 2';
      const delta = markdownToDelta(markdown);

      expect(delta.ops).toContainEqual({
        insert: 'Item 1',
        attributes: { list: 'bullet' },
      });
      expect(delta.ops).toContainEqual({
        insert: 'Item 2',
        attributes: { list: 'bullet' },
      });
    });
  });

  describe('deltaToPlainText', () => {
    it('should extract plain text from delta', () => {
      const delta: QuillDelta = {
        ops: [
          { insert: 'Hello ' },
          { insert: 'world', attributes: { bold: true } },
          { insert: '\n' },
        ],
      };

      const plainText = deltaToPlainText(delta);
      expect(plainText).toBe('Hello world');
    });

    it('should handle empty delta', () => {
      const delta: QuillDelta = { ops: [] };
      const plainText = deltaToPlainText(delta);
      expect(plainText).toBe('');
    });
  });

  describe('validateNote', () => {
    it('should validate a valid note', () => {
      const note = {
        title: 'Test Note',
        user_id: 'user-123',
      };

      const errors = validateNote(note);
      expect(errors).toEqual([]);
    });

    it('should require title', () => {
      const note = {
        title: '',
        user_id: 'user-123',
      };

      const errors = validateNote(note);
      expect(errors).toContain('Title is required');
    });

    it('should require user_id', () => {
      const note = {
        title: 'Test Note',
      };

      const errors = validateNote(note);
      expect(errors).toContain('User ID is required');
    });

    it('should validate title length', () => {
      const note = {
        title: 'a'.repeat(256),
        user_id: 'user-123',
      };

      const errors = validateNote(note);
      expect(errors).toContain('Title must be less than 255 characters');
    });
  });

  describe('validateGroup', () => {
    it('should validate a valid group', () => {
      const group = {
        name: 'Test Group',
        color: '#ff0000',
        user_id: 'user-123',
      };

      const errors = validateGroup(group);
      expect(errors).toEqual([]);
    });

    it('should require name', () => {
      const group = {
        name: '',
        color: '#ff0000',
        user_id: 'user-123',
      };

      const errors = validateGroup(group);
      expect(errors).toContain('Group name is required');
    });

    it('should validate color format', () => {
      const group = {
        name: 'Test Group',
        color: 'invalid-color',
        user_id: 'user-123',
      };

      const errors = validateGroup(group);
      expect(errors).toContain('Color must be a valid hex color');
    });

    it('should require user_id', () => {
      const group = {
        name: 'Test Group',
        color: '#ff0000',
      };

      const errors = validateGroup(group);
      expect(errors).toContain('User ID is required');
    });
  });

  describe('generateNoteTitle', () => {
    it('should generate title from first line', () => {
      const delta: QuillDelta = {
        ops: [
          { insert: 'This is the title\nThis is the content\n' },
        ],
      };

      const title = generateNoteTitle(delta);
      expect(title).toBe('This is the title');
    });

    it('should return "Untitled" for empty content', () => {
      const delta: QuillDelta = {
        ops: [{ insert: '\n' }],
      };

      const title = generateNoteTitle(delta);
      expect(title).toBe('Untitled');
    });

    it('should truncate long titles', () => {
      const longText = 'a'.repeat(300);
      const delta: QuillDelta = {
        ops: [{ insert: longText + '\n' }],
      };

      const title = generateNoteTitle(delta);
      expect(title.length).toBeLessThanOrEqual(255);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('arg1', 'arg2');

      jest.advanceTimersByTime(300);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn();
      jest.advanceTimersByTime(200);
      debouncedFn(); // Reset timer

      jest.advanceTimersByTime(200);
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolveConflict', () => {
    const localItem = {
      id: '1',
      title: 'Local Title',
      updated_at: '2023-01-01T10:00:00Z',
    };

    const remoteItem = {
      id: '1',
      title: 'Remote Title',
      updated_at: '2023-01-01T11:00:00Z',
    };

    it('should resolve with local strategy', () => {
      const result = resolveConflict(localItem, remoteItem, 'local');
      expect(result).toEqual(localItem);
    });

    it('should resolve with remote strategy', () => {
      const result = resolveConflict(localItem, remoteItem, 'remote');
      expect(result).toEqual(remoteItem);
    });

    it('should resolve with latest strategy', () => {
      const result = resolveConflict(localItem, remoteItem, 'latest');
      expect(result).toEqual(remoteItem); // Remote is newer
    });

    it('should resolve with latest strategy (local newer)', () => {
      const newerLocalItem = {
        ...localItem,
        updated_at: '2023-01-01T12:00:00Z',
      };

      const result = resolveConflict(newerLocalItem, remoteItem, 'latest');
      expect(result).toEqual(newerLocalItem);
    });
  });
});
