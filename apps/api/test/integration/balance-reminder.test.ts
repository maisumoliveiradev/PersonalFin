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

describe('balance reminder persistence', () => {
  it('stores one setting per user and space and updates it in place', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });
    const reminders = data.repositories.balanceReminders;

    expect(await reminders.find(userId, space.id)).toBeNull();
    await reminders.save(userId, space.id, { frequency: 'daily', intervalDays: null });
    await reminders.save(userId, space.id, { frequency: 'every_n_days', intervalDays: 15 });

    expect(await reminders.find(userId, space.id)).toEqual({
      frequency: 'every_n_days',
      intervalDays: 15,
    });
  });

  it('rejects inconsistent frequency and interval at the database level', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });

    await expect(
      data.repositories.balanceReminders.save(userId, space.id, {
        frequency: 'daily',
        intervalDays: 3,
      }),
    ).rejects.toThrow(/balance_reminder_interval_matches_frequency/);
  });
});
