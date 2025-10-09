import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('rolling_analysis');
  if (!hasTable) return;

  const addColumnIfMissing = async (column: string, apply: (table: Knex.CreateTableBuilder) => void) => {
    const exists = await knex.schema.hasColumn('rolling_analysis', column);
    if (!exists) {
      await knex.schema.alterTable('rolling_analysis', (table) => apply(table as unknown as Knex.CreateTableBuilder));
    }
  };

  await addColumnIfMissing('percent_above_52w_low', (t) => (t as any).decimal('percent_above_52w_low', 8, 4));
  await addColumnIfMissing('percent_above_24w_low', (t) => (t as any).decimal('percent_above_24w_low', 8, 4));
  await addColumnIfMissing('percent_above_12w_low', (t) => (t as any).decimal('percent_above_12w_low', 8, 4));
  await addColumnIfMissing('volatility', (t) => (t as any).decimal('volatility', 12, 6));
  await addColumnIfMissing('trend_direction', (t) => (t as any).string('trend_direction'));
}

export async function down(_knex: Knex): Promise<void> {
  // No-op to avoid dropping columns in production
}

