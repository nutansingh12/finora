import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_stocks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('stock_id').notNullable().references('id').inTable('stocks').onDelete('CASCADE');
    table.uuid('group_id').references('id').inTable('stock_groups').onDelete('SET NULL');
    table.decimal('target_price', 12, 4);
    table.decimal('cutoff_price', 12, 4);
    table.text('notes');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('added_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('stock_id');
    table.index('group_id');
    table.index(['user_id', 'stock_id']);
    table.index(['user_id', 'group_id']);
    table.index(['user_id', 'added_at']);
    table.index(['user_id', 'is_active']);
    table.unique(['user_id', 'stock_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_stocks');
}
