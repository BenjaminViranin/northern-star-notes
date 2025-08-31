import { executeSql, generateUUID, getCurrentTimestamp } from './sqlite';

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: string; // JSON string
  user_id: string;
  created_at: string;
  retry_count: number;
  last_error: string | null;
}

export class SyncQueueDAO {
  static async addToQueue(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: any,
    userId: string
  ): Promise<SyncQueueItem> {
    const id = generateUUID();
    const timestamp = getCurrentTimestamp();

    const queueItem: SyncQueueItem = {
      id,
      table_name: tableName,
      record_id: recordId,
      operation,
      data: JSON.stringify(data),
      user_id: userId,
      created_at: timestamp,
      retry_count: 0,
      last_error: null,
    };

    await executeSql(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, data, user_id, created_at, retry_count, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        queueItem.id,
        queueItem.table_name,
        queueItem.record_id,
        queueItem.operation,
        queueItem.data,
        queueItem.user_id,
        queueItem.created_at,
        queueItem.retry_count,
        queueItem.last_error,
      ]
    );

    return queueItem;
  }

  static async getPendingItems(userId: string, limit: number = 50): Promise<SyncQueueItem[]> {
    const result = await executeSql(
      `SELECT * FROM sync_queue 
       WHERE user_id = ? AND retry_count < 5
       ORDER BY created_at ASC 
       LIMIT ?`,
      [userId, limit]
    );

    const items: SyncQueueItem[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }
    return items;
  }

  static async removeFromQueue(id: string): Promise<void> {
    await executeSql(
      'DELETE FROM sync_queue WHERE id = ?',
      [id]
    );
  }

  static async incrementRetryCount(id: string, error: string): Promise<void> {
    await executeSql(
      `UPDATE sync_queue 
       SET retry_count = retry_count + 1, last_error = ?
       WHERE id = ?`,
      [error, id]
    );
  }

  static async clearProcessedItems(userId: string): Promise<void> {
    // Remove items that have been retried too many times (> 5)
    await executeSql(
      'DELETE FROM sync_queue WHERE user_id = ? AND retry_count >= 5',
      [userId]
    );
  }

  static async getQueueSize(userId: string): Promise<number> {
    const result = await executeSql(
      'SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ? AND retry_count < 5',
      [userId]
    );

    return result.rows.item(0).count;
  }

  static async clearAllQueue(userId: string): Promise<void> {
    await executeSql(
      'DELETE FROM sync_queue WHERE user_id = ?',
      [userId]
    );
  }

  static async getFailedItems(userId: string): Promise<SyncQueueItem[]> {
    const result = await executeSql(
      `SELECT * FROM sync_queue 
       WHERE user_id = ? AND retry_count >= 5
       ORDER BY created_at DESC`,
      [userId]
    );

    const items: SyncQueueItem[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }
    return items;
  }

  static async retryFailedItem(id: string): Promise<void> {
    await executeSql(
      `UPDATE sync_queue 
       SET retry_count = 0, last_error = NULL
       WHERE id = ?`,
      [id]
    );
  }

  static async removeOldItems(): Promise<void> {
    // Remove items older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    await executeSql(
      'DELETE FROM sync_queue WHERE created_at < ?',
      [cutoffDate]
    );
  }
}
