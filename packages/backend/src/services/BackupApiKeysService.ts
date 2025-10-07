import db from '../config/database';

export class BackupApiKeysService {
  /**
   * Preferred: fetch an available backup key record (id + api_key) from backup_api_keys.
   * We select active, not blocked keys, preferring ones with the lowest daily_request_count.
   */
  static async fetchBackupKeyRecord(): Promise<{ id: string; api_key: string } | null> {
    try {
      const row = await db('backup_api_keys')
        .select('id', 'api_key')
        .where({ is_active: true })
        .andWhere((qb) => qb.whereNull('is_blocked').orWhere('is_blocked', false))
        .andWhere((qb) => qb.whereNull('block_until').orWhere('block_until', '<', db.fn.now()))
        .orderBy([{ column: 'daily_request_count', order: 'asc' }, { column: 'last_request_at', order: 'asc' }])
        .first();
      if (row?.api_key && row?.id) return { id: row.id, api_key: row.api_key };
    } catch {}

    // Fallback: any row
    try {
      const row = await db('backup_api_keys').select('id', 'api_key').first();
      if (row?.api_key && row?.id) return { id: row.id, api_key: row.api_key };
    } catch {}

    return null;
  }

  // Backward-compatible string-only method
  static async fetchBackupKey(): Promise<string | null> {
    const rec = await this.fetchBackupKeyRecord();
    return rec?.api_key || null;
  }
}

