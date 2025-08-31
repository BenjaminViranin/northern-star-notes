import { executeSql, generateUUID, getCurrentTimestamp } from './sqlite';

export interface LocalNote {
  id: string;
  title: string;
  content: string; // JSON string
  content_markdown: string;
  content_plain: string;
  group_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  is_deleted: number;
  deleted_at: string | null;
  needs_sync: number;
}

export class NotesDAO {
  static async getAllNotes(userId: string): Promise<LocalNote[]> {
    const result = await executeSql(
      'SELECT * FROM notes WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
      [userId]
    );

    const notes: LocalNote[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      notes.push(result.rows.item(i));
    }
    return notes;
  }

  static async getNotesByGroup(userId: string, groupId: string | null): Promise<LocalNote[]> {
    let sql: string;
    let params: any[];

    if (groupId === null) {
      sql = 'SELECT * FROM notes WHERE user_id = ? AND group_id IS NULL AND is_deleted = 0 ORDER BY updated_at DESC';
      params = [userId];
    } else {
      sql = 'SELECT * FROM notes WHERE user_id = ? AND group_id = ? AND is_deleted = 0 ORDER BY updated_at DESC';
      params = [userId, groupId];
    }

    const result = await executeSql(sql, params);

    const notes: LocalNote[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      notes.push(result.rows.item(i));
    }
    return notes;
  }

  static async getNoteById(id: string): Promise<LocalNote | null> {
    const result = await executeSql(
      'SELECT * FROM notes WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0);
    }
    return null;
  }

  static async createNote(
    title: string,
    content: any,
    contentMarkdown: string,
    contentPlain: string,
    groupId: string | null,
    userId: string
  ): Promise<LocalNote> {
    const id = generateUUID();
    const timestamp = getCurrentTimestamp();

    const note: LocalNote = {
      id,
      title,
      content: JSON.stringify(content),
      content_markdown: contentMarkdown,
      content_plain: contentPlain,
      group_id: groupId,
      user_id: userId,
      created_at: timestamp,
      updated_at: timestamp,
      version: 1,
      is_deleted: 0,
      deleted_at: null,
      needs_sync: 1,
    };

    await executeSql(
      `INSERT INTO notes (id, title, content, content_markdown, content_plain, group_id, user_id, created_at, updated_at, version, is_deleted, deleted_at, needs_sync)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.title,
        note.content,
        note.content_markdown,
        note.content_plain,
        note.group_id,
        note.user_id,
        note.created_at,
        note.updated_at,
        note.version,
        note.is_deleted,
        note.deleted_at,
        note.needs_sync,
      ]
    );

    return note;
  }

  static async updateNote(
    id: string,
    updates: Partial<Pick<LocalNote, 'title' | 'content' | 'content_markdown' | 'content_plain' | 'group_id'>>
  ): Promise<LocalNote | null> {
    const existingNote = await this.getNoteById(id);
    if (!existingNote) {
      return null;
    }

    const timestamp = getCurrentTimestamp();
    const newVersion = existingNote.version + 1;

    const updatedNote: LocalNote = {
      ...existingNote,
      ...updates,
      content: updates.content ? JSON.stringify(updates.content) : existingNote.content,
      updated_at: timestamp,
      version: newVersion,
      needs_sync: 1,
    };

    await executeSql(
      `UPDATE notes 
       SET title = ?, content = ?, content_markdown = ?, content_plain = ?, group_id = ?, updated_at = ?, version = ?, needs_sync = 1
       WHERE id = ?`,
      [
        updatedNote.title,
        updatedNote.content,
        updatedNote.content_markdown,
        updatedNote.content_plain,
        updatedNote.group_id,
        updatedNote.updated_at,
        updatedNote.version,
        id,
      ]
    );

    return updatedNote;
  }

  static async deleteNote(id: string): Promise<boolean> {
    const timestamp = getCurrentTimestamp();

    const result = await executeSql(
      `UPDATE notes 
       SET is_deleted = 1, deleted_at = ?, updated_at = ?, needs_sync = 1
       WHERE id = ? AND is_deleted = 0`,
      [timestamp, timestamp, id]
    );

    return result.rowsAffected > 0;
  }

  static async searchNotes(userId: string, query: string): Promise<LocalNote[]> {
    const result = await executeSql(
      `SELECT * FROM notes 
       WHERE user_id = ? AND is_deleted = 0 
       AND (title LIKE ? OR content_plain LIKE ?)
       ORDER BY updated_at DESC`,
      [userId, `%${query}%`, `%${query}%`]
    );

    const notes: LocalNote[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      notes.push(result.rows.item(i));
    }
    return notes;
  }

  static async getNotesNeedingSync(userId: string): Promise<LocalNote[]> {
    const result = await executeSql(
      'SELECT * FROM notes WHERE user_id = ? AND needs_sync = 1',
      [userId]
    );

    const notes: LocalNote[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      notes.push(result.rows.item(i));
    }
    return notes;
  }

  static async markNoteSynced(id: string): Promise<void> {
    await executeSql(
      'UPDATE notes SET needs_sync = 0 WHERE id = ?',
      [id]
    );
  }

  static async upsertNoteFromSync(note: Omit<LocalNote, 'needs_sync'>): Promise<void> {
    await executeSql(
      `INSERT OR REPLACE INTO notes 
       (id, title, content, content_markdown, content_plain, group_id, user_id, created_at, updated_at, version, is_deleted, deleted_at, needs_sync)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        note.id,
        note.title,
        note.content,
        note.content_markdown,
        note.content_plain,
        note.group_id,
        note.user_id,
        note.created_at,
        note.updated_at,
        note.version,
        note.is_deleted,
        note.deleted_at,
      ]
    );
  }

  static async moveNotesToGroup(fromGroupId: string, toGroupId: string, userId: string): Promise<void> {
    const timestamp = getCurrentTimestamp();
    
    await executeSql(
      `UPDATE notes 
       SET group_id = ?, updated_at = ?, needs_sync = 1
       WHERE group_id = ? AND user_id = ? AND is_deleted = 0`,
      [toGroupId, timestamp, fromGroupId, userId]
    );
  }

  static async cleanupOldDeletedNotes(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    await executeSql(
      'DELETE FROM notes WHERE is_deleted = 1 AND deleted_at < ?',
      [cutoffDate]
    );
  }
}
