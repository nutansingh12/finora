import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('user_notification_preferences');
  if (exists) return;

  await knex.schema.createTable('user_notification_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.boolean('push_notifications').notNullable().defaultTo(true);
    table.boolean('email_notifications').notNullable().defaultTo(true);
    table.boolean('price_alerts').notNullable().defaultTo(true);
    table.boolean('portfolio_updates').notNullable().defaultTo(true);
    table.boolean('market_news').notNullable().defaultTo(false);

    table.boolean('quiet_hours_enabled').notNullable().defaultTo(false);
    table.string('quiet_hours_start', 5).notNullable().defaultTo('22:00'); // HH:MM
    table.string('quiet_hours_end', 5).notNullable().defaultTo('08:00');   // HH:MM

    table.timestamps(true, true);

    // Indexes
    table.unique(['user_id']);
    table.index(['push_notifications']);
    table.index(['email_notifications']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_notification_preferences');
}

