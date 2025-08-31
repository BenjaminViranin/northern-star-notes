import { executeSql, getCurrentTimestamp } from './sqlite';

export class UserSettingsDAO {
  static async getSetting(key: string): Promise<string | null> {
    const result = await executeSql(
      'SELECT value FROM user_settings WHERE key = ?',
      [key]
    );

    if (result.rows.length > 0) {
      return result.rows.item(0).value;
    }
    return null;
  }

  static async setSetting(key: string, value: string): Promise<void> {
    const timestamp = getCurrentTimestamp();
    
    await executeSql(
      `INSERT OR REPLACE INTO user_settings (key, value, updated_at)
       VALUES (?, ?, ?)`,
      [key, value, timestamp]
    );
  }

  static async deleteSetting(key: string): Promise<void> {
    await executeSql(
      'DELETE FROM user_settings WHERE key = ?',
      [key]
    );
  }

  static async getAllSettings(): Promise<Record<string, string>> {
    const result = await executeSql(
      'SELECT key, value FROM user_settings',
      []
    );

    const settings: Record<string, string> = {};
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      settings[row.key] = row.value;
    }
    return settings;
  }

  // Convenience methods for common settings
  static async getLastSelectedNoteId(): Promise<string | null> {
    return this.getSetting('lastSelectedNoteId');
  }

  static async setLastSelectedNoteId(noteId: string): Promise<void> {
    return this.setSetting('lastSelectedNoteId', noteId);
  }

  static async getLastSelectedGroupId(): Promise<string | null> {
    return this.getSetting('lastSelectedGroupId');
  }

  static async setLastSelectedGroupId(groupId: string): Promise<void> {
    return this.setSetting('lastSelectedGroupId', groupId);
  }

  static async getWindowLayout(): Promise<string | null> {
    return this.getSetting('windowLayout');
  }

  static async setWindowLayout(layout: string): Promise<void> {
    return this.setSetting('windowLayout', layout);
  }

  static async getTheme(): Promise<string> {
    const theme = await this.getSetting('theme');
    return theme || 'dark';
  }

  static async setTheme(theme: string): Promise<void> {
    return this.setSetting('theme', theme);
  }

  static async getAutoSaveEnabled(): Promise<boolean> {
    const enabled = await this.getSetting('autoSaveEnabled');
    return enabled !== 'false'; // Default to true
  }

  static async setAutoSaveEnabled(enabled: boolean): Promise<void> {
    return this.setSetting('autoSaveEnabled', enabled.toString());
  }

  static async getAutoSaveDelay(): Promise<number> {
    const delay = await this.getSetting('autoSaveDelay');
    return delay ? parseInt(delay, 10) : 300; // Default 300ms
  }

  static async setAutoSaveDelay(delay: number): Promise<void> {
    return this.setSetting('autoSaveDelay', delay.toString());
  }

  static async getOfflineMode(): Promise<boolean> {
    const mode = await this.getSetting('offlineMode');
    return mode === 'true';
  }

  static async setOfflineMode(enabled: boolean): Promise<void> {
    return this.setSetting('offlineMode', enabled.toString());
  }

  static async clearAllSettings(): Promise<void> {
    await executeSql('DELETE FROM user_settings', []);
  }
}
