import { QuillDelta, Note, Group } from '../types';

// Quill Delta utilities
export const createEmptyDelta = (): QuillDelta => ({
  ops: [{ insert: '\n' }],
});

export const deltaToMarkdown = (delta: QuillDelta): string => {
  // Convert Quill Delta to Markdown
  // This is a simplified implementation - in a real app, you'd use a proper converter
  let markdown = '';
  
  for (const op of delta.ops) {
    if (typeof op.insert === 'string') {
      let text = op.insert;
      
      if (op.attributes) {
        if (op.attributes.bold) text = `**${text}**`;
        if (op.attributes.italic) text = `*${text}*`;
        if (op.attributes.underline) text = `<u>${text}</u>`;
        if (op.attributes.strike) text = `~~${text}~~`;
        if (op.attributes.code) text = `\`${text}\``;
        if (op.attributes['code-block']) text = `\`\`\`\n${text}\n\`\`\``;
        if (op.attributes.header) {
          const level = op.attributes.header;
          text = `${'#'.repeat(level)} ${text}`;
        }
        if (op.attributes.list === 'bullet') text = `- ${text}`;
        if (op.attributes.list === 'ordered') text = `1. ${text}`;
        if (op.attributes.list === 'check') text = `- [ ] ${text}`;
        if (op.attributes.link) text = `[${text}](${op.attributes.link})`;
      }
      
      markdown += text;
    }
  }
  
  return markdown.trim();
};

export const markdownToDelta = (markdown: string): QuillDelta => {
  // Convert Markdown to Quill Delta
  // This is a simplified implementation - in a real app, you'd use a proper parser
  const ops = [];
  
  // Basic markdown parsing - this would be much more sophisticated in a real implementation
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('# ')) {
      ops.push({ insert: line.substring(2), attributes: { header: 1 } });
    } else if (line.startsWith('## ')) {
      ops.push({ insert: line.substring(3), attributes: { header: 2 } });
    } else if (line.startsWith('### ')) {
      ops.push({ insert: line.substring(4), attributes: { header: 3 } });
    } else if (line.startsWith('- ')) {
      ops.push({ insert: line.substring(2), attributes: { list: 'bullet' } });
    } else {
      // Handle inline formatting
      let text = line;
      const attributes: any = {};
      
      // Bold
      text = text.replace(/\*\*(.*?)\*\*/g, (match, content) => {
        attributes.bold = true;
        return content;
      });
      
      // Italic
      text = text.replace(/\*(.*?)\*/g, (match, content) => {
        attributes.italic = true;
        return content;
      });
      
      ops.push({ insert: text, attributes: Object.keys(attributes).length > 0 ? attributes : undefined });
    }
    
    ops.push({ insert: '\n' });
  }
  
  return { ops };
};

export const deltaToPlainText = (delta: QuillDelta): string => {
  let text = '';
  
  for (const op of delta.ops) {
    if (typeof op.insert === 'string') {
      text += op.insert;
    }
  }
  
  return text.trim();
};

// Data validation utilities
export const validateNote = (note: Partial<Note>): string[] => {
  const errors: string[] = [];
  
  if (!note.title || note.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (note.title && note.title.length > 255) {
    errors.push('Title must be less than 255 characters');
  }
  
  if (!note.user_id) {
    errors.push('User ID is required');
  }
  
  return errors;
};

export const validateGroup = (group: Partial<Group>): string[] => {
  const errors: string[] = [];
  
  if (!group.name || group.name.trim().length === 0) {
    errors.push('Group name is required');
  }
  
  if (group.name && group.name.length > 255) {
    errors.push('Group name must be less than 255 characters');
  }
  
  if (group.color && !/^#[0-9A-F]{6}$/i.test(group.color)) {
    errors.push('Color must be a valid hex color');
  }
  
  if (!group.user_id) {
    errors.push('User ID is required');
  }
  
  return errors;
};

// Data transformation utilities
export const sanitizeTitle = (title: string): string => {
  return title.trim().substring(0, 255);
};

export const sanitizeGroupName = (name: string): string => {
  return name.trim().substring(0, 255);
};

export const generateNoteTitle = (content: QuillDelta): string => {
  const plainText = deltaToPlainText(content);
  const firstLine = plainText.split('\n')[0];
  
  if (firstLine && firstLine.trim().length > 0) {
    return sanitizeTitle(firstLine.trim());
  }
  
  return 'Untitled';
};

// Search utilities
export const searchInText = (text: string, query: string): boolean => {
  return text.toLowerCase().includes(query.toLowerCase());
};

export const highlightSearchTerm = (text: string, query: string): string => {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// Date utilities
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Conflict resolution utilities
export const resolveConflict = (local: any, remote: any, strategy: 'local' | 'remote' | 'latest'): any => {
  switch (strategy) {
    case 'local':
      return local;
    case 'remote':
      return remote;
    case 'latest':
      const localTime = new Date(local.updated_at).getTime();
      const remoteTime = new Date(remote.updated_at).getTime();
      return localTime > remoteTime ? local : remote;
    default:
      return remote;
  }
};

// Export/Import utilities
export const exportToJSON = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

export const importFromJSON = (jsonString: string): any => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};

// UUID utilities
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
