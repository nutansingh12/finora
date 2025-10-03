import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Required for gen_random_uuid() defaults used in tables
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
}

export async function down(knex: Knex): Promise<void> {
  // Safe to skip dropping in shared environments, but include for completeness
  await knex.raw('DROP EXTENSION IF EXISTS pgcrypto;');
}

