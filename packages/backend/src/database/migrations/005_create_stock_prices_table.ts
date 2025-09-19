import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('stock_prices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('stock_id').notNullable().references('id').inTable('stocks').onDelete('CASCADE');
    table.decimal('price', 12, 4).notNullable();
    table.decimal('change', 12, 4).defaultTo(0);
    table.decimal('change_percent', 8, 4).defaultTo(0);
    table.bigInteger('volume').defaultTo(0);
    table.bigInteger('market_cap');
    table.decimal('day_high', 12, 4);
    table.decimal('day_low', 12, 4);
    table.decimal('week_52_high', 12, 4);
    table.decimal('week_52_low', 12, 4);
    table.decimal('previous_close', 12, 4);
    table.string('source').defaultTo('yahoo'); // yahoo, manual, api
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index('stock_id');
    table.index('timestamp');
    table.index(['stock_id', 'timestamp']);
    table.index(['stock_id', 'source']);
    table.unique(['stock_id', 'timestamp', 'source']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('stock_prices');
}
