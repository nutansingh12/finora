import knex from 'knex';

(async () => {
  const connection = process.env.DATABASE_URL;
  if (!connection) {
    console.error('DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const db = knex({
    client: 'pg',
    connection,
    pool: { min: 0, max: 1 },
  });

  try {
    const hasTable = await db.schema.hasTable('stock_groups');
    if (!hasTable) {
      console.log('stock_groups table does not exist; nothing to patch.');
      await db.destroy();
      process.exit(0);
    }

    const hasColumn = await db.schema.hasColumn('stock_groups', 'is_active').catch(() => false);

    if (!hasColumn) {
      console.log('Adding stock_groups.is_active (boolean, default true)...');
      await db.schema.alterTable('stock_groups', (table) => {
        table.boolean('is_active').defaultTo(true);
      });
      const updated = await db('stock_groups').whereNull('is_active').update({ is_active: true });
      console.log(`Backfilled ${updated} rows to is_active=true`);
    } else {
      console.log('stock_groups.is_active already exists; no changes made.');
    }

    console.log('One-off patch complete.');
  } catch (err) {
    console.error('Error running one-off patch:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
})();

