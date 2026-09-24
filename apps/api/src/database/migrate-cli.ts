import { loadMigrations, MIGRATIONS_DIRECTORY, migrate } from './migrator.ts';
import { createPool } from './pool.ts';

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  process.stderr.write('DATABASE_URL is required\n');
  process.exit(1);
}

const pool = createPool(databaseUrl);
try {
  const applied = await migrate(pool, await loadMigrations(MIGRATIONS_DIRECTORY));
  const summary =
    applied.length === 0 ? 'Database is up to date' : `Applied: ${applied.join(', ')}`;
  process.stdout.write(`${summary}\n`);
} finally {
  await pool.end();
}
