import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('sessions');
  if (exists) return;
  return knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('refresh_token').notNullable().unique();
    table.string('device_type'); // mobile, web, desktop
    table.string('device_name');
    table.string('user_agent');
    table.string('ip_address');
    table.string('location');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('expires_at').notNullable();
    table.timestamp('last_used_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('refresh_token');
    table.index('expires_at');
    table.index(['user_id', 'is_active']);
    table.index(['user_id', 'last_used_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('sessions');
}
