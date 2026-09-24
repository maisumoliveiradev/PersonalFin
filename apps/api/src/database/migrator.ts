import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { DatabasePool } from './pool.ts';

export interface Migration {
  id: string;
  sql: string;
}

export class MigrationError extends Error {
  override name = 'MigrationError';
}

const MIGRATION_LOCK_KEY = 7_340_001;
const MIGRATION_FILE_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/;

export const MIGRATIONS_DIRECTORY = path.join(import.meta.dirname, 'migrations');

function checksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export async function loadMigrations(directory: string): Promise<Migration[]> {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  const invalid = files.filter((file) => !MIGRATION_FILE_PATTERN.test(file));
  if (invalid.length > 0) {
    throw new MigrationError(`Invalid migration file names: ${invalid.join(', ')}`);
  }
  return Promise.all(
    files.map(async (file) => ({
      id: file.replace(/\.sql$/, ''),
      sql: await readFile(path.join(directory, file), 'utf8'),
    })),
  );
}

export async function migrate(pool: DatabasePool, migrations: Migration[]): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ id: string; checksum: string }>(
      'SELECT id, checksum FROM schema_migrations',
    );
    const appliedChecksums = new Map(rows.map((row) => [row.id, row.checksum]));
    const knownIds = new Set(migrations.map((migration) => migration.id));
    const unknownApplied = rows.filter((row) => !knownIds.has(row.id)).map((row) => row.id);
    if (unknownApplied.length > 0) {
      throw new MigrationError(
        `Database has migrations unknown to this release: ${unknownApplied.join(', ')}`,
      );
    }

    const applied: string[] = [];
    for (const migration of migrations) {
      const expectedChecksum = checksum(migration.sql);
      const appliedChecksum = appliedChecksums.get(migration.id);
      if (appliedChecksum !== undefined) {
        if (appliedChecksum !== expectedChecksum) {
          throw new MigrationError(`Applied migration ${migration.id} was modified`);
        }
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)', [
          migration.id,
          expectedChecksum,
        ]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new MigrationError(`Migration ${migration.id} failed`, { cause: error });
      }
      applied.push(migration.id);
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    client.release();
  }
}
