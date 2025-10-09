import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('stock_prices');
  if (!hasTable) return;

  const hasIsLatest = await knex.schema.hasColumn('stock_prices', 'is_latest');
  if (!hasIsLatest) {
    await knex.schema.alterTable('stock_prices', (table) => {
      table.boolean('is_latest').defaultTo(true);
    });

    // Backfill any nulls to true
    await knex('stock_prices').whereNull('is_latest').update({ is_latest: true });
  }
}

export async function down(_knex: Knex): Promise<void> {
  // No-op to avoid dropping columns in production
}

