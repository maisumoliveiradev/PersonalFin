import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  loadMigrations,
  MIGRATIONS_DIRECTORY,
  MigrationError,
  migrate,
} from '../../src/database/migrator.ts';
import { createPool } from '../../src/database/pool.ts';
import { resetDatabase, testDatabaseUrl } from './database.ts';

const pool = createPool(testDatabaseUrl());

beforeEach(async () => {
  await resetDatabase(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('migrate', () => {
  it('applies every migration to an empty database exactly once', async () => {
    const migrations = await loadMigrations(MIGRATIONS_DIRECTORY);

    const firstRun = await migrate(pool, migrations);
    const secondRun = await migrate(pool, migrations);

    expect(firstRun).toEqual(migrations.map((migration) => migration.id));
    expect(secondRun).toEqual([]);
  });

  it('refuses to continue when an applied migration was modified', async () => {
    const migrations = await loadMigrations(MIGRATIONS_DIRECTORY);
    await migrate(pool, migrations);

    const [first, ...rest] = migrations;
    if (first === undefined) {
      throw new Error('Expected at least one migration');
    }
    const modified = [{ ...first, sql: `${first.sql}\n-- edited` }, ...rest];

    await expect(migrate(pool, modified)).rejects.toThrow(MigrationError);
  });

  it('rolls back a failing migration without recording it', async () => {
    const broken = [{ id: '9999_broken', sql: 'CREATE TABLE ok_table (id int); SELECT 1/0;' }];

    await expect(migrate(pool, broken)).rejects.toThrow(MigrationError);

    const { rows } = await pool.query(
      "SELECT to_regclass('public.ok_table') AS table_name, (SELECT count(*) FROM schema_migrations)::int AS applied",
    );
    expect(rows[0]).toEqual({ table_name: null, applied: 0 });
  });
});
