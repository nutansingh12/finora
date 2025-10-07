import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('user_api_keys');
  if (hasTable) return;

  await knex.schema.createTable('user_api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.text('provider').notNullable();
    table.text('api_key').notNullable(); // encrypted value
    table.text('key_name');

    table.boolean('is_active').notNullable().defaultTo(true);

    table.integer('requests_used').notNullable().defaultTo(0);
    table.integer('daily_requests_used').notNullable().defaultTo(0);

    table.integer('request_limit').notNullable().defaultTo(500);
    table.integer('daily_request_limit').notNullable().defaultTo(500);

    table.timestamp('last_used_at', { useTz: true });
    table.timestamp('expires_at', { useTz: true });

    table.text('registration_id');
    table.jsonb('metadata').defaultTo(knex.raw("'{}'::jsonb"));

    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'provider']);
    table.index(['is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('user_api_keys');
  if (!hasTable) return;
  await knex.schema.dropTable('user_api_keys');
}

