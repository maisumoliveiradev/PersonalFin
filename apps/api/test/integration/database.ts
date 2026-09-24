import { loadMigrations, MIGRATIONS_DIRECTORY, migrate } from '../../src/database/migrator.ts';
import { createPool, type DatabasePool } from '../../src/database/pool.ts';

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (url === undefined || url === '') {
    throw new Error('TEST_DATABASE_URL is required for integration tests');
  }
  if (!new URL(url).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point to a database whose name ends with _test');
  }
  return url;
}

export async function resetDatabase(pool: DatabasePool): Promise<void> {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}

export async function createMigratedTestPool(): Promise<DatabasePool> {
  const pool = createPool(testDatabaseUrl());
  await resetDatabase(pool);
  await migrate(pool, await loadMigrations(MIGRATIONS_DIRECTORY));
  return pool;
}
