import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // JWT refresh tokens can exceed 255 chars; store as text to avoid truncation errors
  await knex.schema.alterTable('sessions', (table) => {
    table.text('refresh_token').notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revert to varchar(255); may fail if existing data exceeds 255 chars
  await knex.schema.alterTable('sessions', (table) => {
    table.string('refresh_token').notNullable().alter();
  });
}

