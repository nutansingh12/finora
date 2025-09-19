/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('feedback', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.integer('rating').notNullable().checkBetween([1, 5]);
    table.text('feedback_text');
    table.string('page_url', 2048);
    table.text('user_agent');
    table.string('screenshot_path', 1024);
    table.jsonb('device_info');
    table.string('app_version', 50);
    table.enum('platform', ['web', 'mobile', 'desktop']).notNullable();
    table.enum('status', ['pending', 'sent', 'failed']).defaultTo('pending');
    table.timestamp('email_sent_at');
    table.text('error_message');
    table.timestamps(true, true);

    // Foreign key constraint
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('rating');
    table.index('platform');
    table.index('status');
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('feedback');
};
