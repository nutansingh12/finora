import type { Knex } from 'knex';

// Backfill missing columns on legacy "users" tables that predate our current schema
export async function up(knex: Knex): Promise<void> {
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) return;

  // Helper to add a column only if it's missing
  const addIfMissing = async (
    column: string,
    add: () => Promise<void>
  ) => {
    const exists = await knex.schema.hasColumn('users', column);
    if (!exists) {
      await add();
    }
  };

  await addIfMissing('email_verified', async () => {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('email_verified').defaultTo(false);
    });
  });

  await addIfMissing('email_verification_token', async () => {
    await knex.schema.alterTable('users', (table) => {
      table.string('email_verification_token');
    });
  });

  await addIfMissing('email_verified_at', async () => {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('email_verified_at');
    });
  });

  await addIfMissing('password_reset_token', async () => {
    await knex.schema.alterTable('users', (table) => {
      table.string('password_reset_token');
    });
  });

  await addIfMissing('password_reset_expires', async () => {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('password_reset_expires');
    });
  });

  await addIfMissing('preferences', async () => {
    await knex.schema.alterTable('users', (table) => {
      table.jsonb('preferences').defaultTo(JSON.stringify({
        defaultTargetPriceStrategy: '52w_low',
        alertsEnabled: true,
        emailNotifications: true,
        pushNotifications: true,
        theme: 'auto',
        currency: 'USD',
        timezone: 'America/New_York'
      }));
    });
  });

  await addIfMissing('last_login_at', async () => {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('last_login_at');
    });
  });

  await addIfMissing('last_login_ip', async () => {
    await knex.schema.alterTable('users', (table) => {
      table.string('last_login_ip');
    });
  });
}

export async function down(_knex: Knex): Promise<void> {
  // No-op: we won't drop columns on down to avoid data loss in shared environments
}

