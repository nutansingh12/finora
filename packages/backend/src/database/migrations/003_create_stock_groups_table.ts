import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('stock_groups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.string('color').defaultTo('#3B82F6'); // Default blue color
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_default').defaultTo(false);
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'sort_order']);
    table.index(['user_id', 'is_default']);
    table.unique(['user_id', 'name']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('stock_groups');
}
