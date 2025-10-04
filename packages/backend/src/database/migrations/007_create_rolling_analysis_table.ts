import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('rolling_analysis');
  if (exists) return;
  return knex.schema.createTable('rolling_analysis', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('stock_id').notNullable().references('id').inTable('stocks').onDelete('CASCADE');
    table.decimal('current_price', 12, 4).notNullable();
    table.decimal('week_52_low', 12, 4);
    table.decimal('week_24_low', 12, 4);
    table.decimal('week_12_low', 12, 4);
    table.decimal('week_52_high', 12, 4);
    table.decimal('week_24_high', 12, 4);
    table.decimal('week_12_high', 12, 4);
    table.decimal('percent_above_52w_low', 8, 4);
    table.decimal('percent_above_24w_low', 8, 4);
    table.decimal('percent_above_12w_low', 8, 4);
    table.decimal('percent_below_52w_high', 8, 4);
    table.decimal('percent_below_24w_high', 8, 4);
    table.decimal('percent_below_12w_high', 8, 4);
    table.timestamp('calculated_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index('stock_id');
    table.index('calculated_at');
    table.index(['stock_id', 'calculated_at']);
    table.index('percent_above_52w_low');
    table.index('percent_above_24w_low');
    table.index('percent_above_12w_low');
    table.unique(['stock_id', 'calculated_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('rolling_analysis');
}
