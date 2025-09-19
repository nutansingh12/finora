import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('historical_data', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('stock_id').notNullable().references('id').inTable('stocks').onDelete('CASCADE');
    table.date('date').notNullable();
    table.decimal('open', 12, 4).notNullable();
    table.decimal('high', 12, 4).notNullable();
    table.decimal('low', 12, 4).notNullable();
    table.decimal('close', 12, 4).notNullable();
    table.decimal('adjusted_close', 12, 4).notNullable();
    table.bigInteger('volume').defaultTo(0);
    table.string('source').defaultTo('yahoo');
    table.timestamps(true, true);

    // Indexes
    table.index('stock_id');
    table.index('date');
    table.index(['stock_id', 'date']);
    table.index(['stock_id', 'date', 'source']);
    table.unique(['stock_id', 'date', 'source']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('historical_data');
}
