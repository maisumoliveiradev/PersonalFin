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

describe('dashboard preference persistence', () => {
  it('stores one preference per user and space and updates it in place', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const otherUserId = await insertUser(pool, `${randomUUID()}@example.com`);
    const spaceId = (await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId })).id;
    const { dashboardPreferences } = data.repositories;

    await dashboardPreferences.save(userId, spaceId, { profile: 'basic', overrides: {} });
    await dashboardPreferences.save(userId, spaceId, {
      profile: 'intermediate',
      overrides: { analytics: true },
    });

    expect(await dashboardPreferences.find(userId, spaceId)).toEqual({
      profile: 'intermediate',
      overrides: { analytics: true },
    });
    expect(await dashboardPreferences.find(otherUserId, spaceId)).toBeNull();
  });
});
