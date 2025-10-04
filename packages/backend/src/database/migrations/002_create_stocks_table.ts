import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('stocks');
  if (exists) return;
  return knex.schema.createTable('stocks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('symbol').unique().notNullable();
    table.string('name').notNullable();
    table.string('exchange').notNullable();
    table.string('type').defaultTo('stock'); // stock, etf, mutual_fund
    table.string('sector');
    table.string('industry');
    table.bigInteger('market_cap');
    table.string('currency').defaultTo('USD');
    table.string('country').defaultTo('US');
    table.text('description');
    table.string('website');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_updated');
    table.timestamps(true, true);

    // Indexes
    table.index('symbol');
    table.index('exchange');
    table.index('type');
    table.index('sector');
    table.index('industry');
    table.index('is_active');
    table.index(['symbol', 'exchange']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('stocks');
}
