import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('stock_groups');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('stock_groups', 'is_active');
  if (!hasColumn) {
    await knex.schema.alterTable('stock_groups', (table) => {
      table.boolean('is_active').defaultTo(true);
    });

    // Backfill any existing rows to true
    await knex('stock_groups').whereNull('is_active').update({ is_active: true });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('stock_groups');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('stock_groups', 'is_active');
  if (hasColumn) {
    await knex.schema.alterTable('stock_groups', (table) => {
      table.dropColumn('is_active');
    });
  }
}

