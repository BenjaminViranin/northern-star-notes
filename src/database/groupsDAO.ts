import { executeSql, generateUUID, getCurrentTimestamp } from './sqlite';

export interface LocalGroup {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  is_deleted: number;
  needs_sync: number;
}

export class GroupsDAO {
  static async getAllGroups(userId: string): Promise<LocalGroup[]> {
    const result = await executeSql(
      'SELECT * FROM groups WHERE user_id = ? AND is_deleted = 0 ORDER BY name',
      [userId]
    );

    const groups: LocalGroup[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      groups.push(result.rows.item(i));
    }
    return groups;
  }

  static async getGroupById(id: string): Promise<LocalGroup | null> {
    const result = await executeSql(
      'SELECT * FROM groups WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0);
    }
    return null;
  }

  static async createGroup(
    name: string,
    color: string,
    userId: string
  ): Promise<LocalGroup> {
    const id = generateUUID();
    const timestamp = getCurrentTimestamp();

    const group: LocalGroup = {
      id,
      name,
      color,
      user_id: userId,
      created_at: timestamp,
      updated_at: timestamp,
      version: 1,
      is_deleted: 0,
      needs_sync: 1,
    };

    await executeSql(
      `INSERT INTO groups (id, name, color, user_id, created_at, updated_at, version, is_deleted, needs_sync)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        group.id,
        group.name,
        group.color,
        group.user_id,
        group.created_at,
        group.updated_at,
        group.version,
        group.is_deleted,
        group.needs_sync,
      ]
    );

    return group;
  }

  static async updateGroup(
    id: string,
    updates: Partial<Pick<LocalGroup, 'name' | 'color'>>
  ): Promise<LocalGroup | null> {
    const existingGroup = await this.getGroupById(id);
    if (!existingGroup) {
      return null;
    }

    const timestamp = getCurrentTimestamp();
    const newVersion = existingGroup.version + 1;

    const updatedGroup: LocalGroup = {
      ...existingGroup,
      ...updates,
      updated_at: timestamp,
      version: newVersion,
      needs_sync: 1,
    };

    await executeSql(
      `UPDATE groups 
       SET name = ?, color = ?, updated_at = ?, version = ?, needs_sync = 1
       WHERE id = ?`,
      [
        updatedGroup.name,
        updatedGroup.color,
        updatedGroup.updated_at,
        updatedGroup.version,
        id,
      ]
    );

    return updatedGroup;
  }

  static async deleteGroup(id: string): Promise<boolean> {
    const timestamp = getCurrentTimestamp();

    const result = await executeSql(
      `UPDATE groups 
       SET is_deleted = 1, updated_at = ?, needs_sync = 1
       WHERE id = ? AND is_deleted = 0`,
      [timestamp, id]
    );

    return result.rowsAffected > 0;
  }

  static async getGroupsNeedingSync(userId: string): Promise<LocalGroup[]> {
    const result = await executeSql(
      'SELECT * FROM groups WHERE user_id = ? AND needs_sync = 1',
      [userId]
    );

    const groups: LocalGroup[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      groups.push(result.rows.item(i));
    }
    return groups;
  }

  static async markGroupSynced(id: string): Promise<void> {
    await executeSql(
      'UPDATE groups SET needs_sync = 0 WHERE id = ?',
      [id]
    );
  }

  static async upsertGroupFromSync(group: Omit<LocalGroup, 'needs_sync'>): Promise<void> {
    await executeSql(
      `INSERT OR REPLACE INTO groups 
       (id, name, color, user_id, created_at, updated_at, version, is_deleted, needs_sync)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        group.id,
        group.name,
        group.color,
        group.user_id,
        group.created_at,
        group.updated_at,
        group.version,
        group.is_deleted,
      ]
    );
  }

  static async seedDefaultGroups(userId: string): Promise<void> {
    const defaultGroups = [
      { name: 'Work', color: '#3b82f6' },
      { name: 'Personal', color: '#10b981' },
      { name: 'Ideas', color: '#f59e0b' },
      { name: 'Tasks', color: '#ef4444' },
      { name: 'Uncategorized', color: '#6b7280' },
    ];

    for (const groupData of defaultGroups) {
      await this.createGroup(groupData.name, groupData.color, userId);
    }
  }

  static async getUncategorizedGroup(userId: string): Promise<LocalGroup | null> {
    const result = await executeSql(
      'SELECT * FROM groups WHERE user_id = ? AND name = ? AND is_deleted = 0',
      [userId, 'Uncategorized']
    );

    if (result.rows.length > 0) {
      return result.rows.item(0);
    }
    return null;
  }
}
