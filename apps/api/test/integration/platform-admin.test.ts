import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createMigratedTestPool } from './database.ts';
import { insertUser } from './fixtures.ts';

let pool: DatabasePool;
let data: DataAccess;

beforeAll(async () => {
  pool = await createMigratedTestPool();
  data = createPostgresDataAccess(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('PostgreSQL platform administration', () => {
  it('recognizes administrators and computes an aggregate overview without amounts', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    await createFinancialSpace(data, { name: 'Casa', ownerUserId: userId });
    expect(await data.repositories.platformAdmins.isPlatformAdmin(userId)).toBe(false);
    await pool.query("INSERT INTO platform_admin (user_id, granted_by) VALUES ($1, 'test')", [
      userId,
    ]);
    expect(await data.repositories.platformAdmins.isPlatformAdmin(userId)).toBe(true);

    const overview = await data.repositories.platformAdmins.overview();

    expect(overview.users.total).toBeGreaterThanOrEqual(1);
    expect(overview.spaces.total).toBeGreaterThanOrEqual(1);
    expect(overview.database.migrations).toBeGreaterThanOrEqual(29);
    expect(overview.database.latestMigration).toMatch(/^\d{4}_/);
    expect(JSON.stringify(overview)).not.toMatch(/amount|minor/i);
  });
});
