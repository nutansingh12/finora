import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('user_fcm_tokens');
  if (exists) return;

  await knex.schema.createTable('user_fcm_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('token').notNullable();
    table.string('platform', 16).notNullable().defaultTo('web'); // ios | android | web
    table.string('device_id');
    table.string('device_name');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_used_at');
    table.timestamps(true, true);

    // Indexes
    table.unique(['user_id', 'token']);
    table.index(['user_id', 'is_active']);
    table.index(['token']);
    table.index(['platform']);
    table.index(['device_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_fcm_tokens');
}

