import db from '../config/database';

export class BackupApiKeysService {
  /**
   * Try to fetch a backup API key for the given provider from `backup_api_keys` table.
   * We keep this resilient to minor schema differences by attempting a couple of simple
   * SELECT variants. If the table or columns are missing, we return null.
   */
  static async fetchBackupKey(provider: string = 'alpha_vantage'): Promise<string | null> {
    // Try with provider + is_active filter
    try {
      const row = await db('backup_api_keys')
        .select('api_key')
        .where({ provider })
        .andWhere('is_active', true)
        .first();
      if (row?.api_key) return row.api_key as string;
    } catch {}

    // Fallback: without is_active column
    try {
      const row = await db('backup_api_keys')
        .select('api_key')
        .where({ provider })
        .first();
      if (row?.api_key) return row.api_key as string;
    } catch {}

    // Final: try any row
    try {
      const row = await db('backup_api_keys').select('api_key').first();
      if (row?.api_key) return row.api_key as string;
    } catch {}

    return null;
  }
}

