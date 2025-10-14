import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notification_logs');
  if (exists) return;

  await knex.schema.createTable('notification_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('title').notNullable();
    table.text('body');
    table.jsonb('data');
    table.boolean('success').notNullable().defaultTo(false);
    table.text('error');
    table.timestamps(true, true);

    // Indexes
    table.index(['user_id']);
    table.index(['success']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_logs');
}

