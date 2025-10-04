import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('users');
  if (exists) return;
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token');
    table.timestamp('email_verified_at');
    table.string('password_reset_token');
    table.timestamp('password_reset_expires');
    table.jsonb('preferences').defaultTo(JSON.stringify({
      defaultTargetPriceStrategy: '52w_low',
      alertsEnabled: true,
      emailNotifications: true,
      pushNotifications: true,
      theme: 'auto',
      currency: 'USD',
      timezone: 'America/New_York'
    }));
    table.timestamp('last_login_at');
    table.string('last_login_ip');
    table.timestamps(true, true);

    // Indexes
    table.index('email');
    table.index('is_active');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}
