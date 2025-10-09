import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('stock_prices');
  if (!hasTable) return;

  const addColumnIfMissing = async (column: string, apply: (table: Knex.CreateTableBuilder) => void) => {
    const exists = await knex.schema.hasColumn('stock_prices', column);
    if (!exists) {
      await knex.schema.alterTable('stock_prices', (table) => apply(table as unknown as Knex.CreateTableBuilder));
    }
  };

  await addColumnIfMissing('is_latest', (table) => (table as any).boolean('is_latest').defaultTo(true));
  await addColumnIfMissing('pe_ratio', (table) => (table as any).decimal('pe_ratio', 12, 4));
  await addColumnIfMissing('dividend_yield', (table) => (table as any).decimal('dividend_yield', 12, 6));
  await addColumnIfMissing('fifty_two_week_low', (table) => (table as any).decimal('fifty_two_week_low', 12, 4));
  await addColumnIfMissing('fifty_two_week_high', (table) => (table as any).decimal('fifty_two_week_high', 12, 4));
  await addColumnIfMissing('fifty_day_avg', (table) => (table as any).decimal('fifty_day_avg', 12, 4));
  await addColumnIfMissing('two_hundred_day_avg', (table) => (table as any).decimal('two_hundred_day_avg', 12, 4));

  // Backfill is_latest to true for existing rows if column was just added
  const hasIsLatest = await knex.schema.hasColumn('stock_prices', 'is_latest');
  if (hasIsLatest) {
    await knex('stock_prices').whereNull('is_latest').update({ is_latest: true });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('stock_prices');
  if (!hasTable) return;

  // For safety in production, do not drop columns on down to avoid data loss
  // If strictly needed, uncomment below lines.
  // await knex.schema.alterTable('stock_prices', (table) => {
  //   table.dropColumn('is_latest');
  //   table.dropColumn('pe_ratio');
  //   table.dropColumn('dividend_yield');
  //   table.dropColumn('fifty_two_week_low');
  //   table.dropColumn('fifty_two_week_high');
  //   table.dropColumn('fifty_day_avg');
  //   table.dropColumn('two_hundred_day_avg');
  // });
}

