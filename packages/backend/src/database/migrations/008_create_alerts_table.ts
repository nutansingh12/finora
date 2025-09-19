import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('stock_id').notNullable().references('id').inTable('stocks').onDelete('CASCADE');
    table.string('type').notNullable(); // price_below, price_above, target_reached, cutoff_reached
    table.decimal('target_price', 12, 4).notNullable();
    table.decimal('current_price', 12, 4);
    table.text('message');
    table.boolean('is_read').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_sent').defaultTo(false);
    table.boolean('push_sent').defaultTo(false);
    table.timestamp('triggered_at');
    table.timestamp('email_sent_at');
    table.timestamp('push_sent_at');
    table.timestamp('read_at');
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('stock_id');
    table.index('type');
    table.index(['user_id', 'is_read']);
    table.index(['user_id', 'is_active']);
    table.index(['user_id', 'triggered_at']);
    table.index(['stock_id', 'type', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('alerts');
}
