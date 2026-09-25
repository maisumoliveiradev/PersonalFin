import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { getReminders } from '../../src/modules/reminders/reminders.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
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

describe('PostgreSQL reminders', () => {
  it('stores personal settings and dismissals and applies them', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: userId });
    const categories = await data.repositories.categories.listForSpace(space.id);
    const food = categories.find((category) => category.defaultKey === 'food');
    await createTransaction(data, {
      financialSpaceId: space.id,
      createdByUserId: userId,
      type: 'expense',
      status: 'pending',
      description: 'Mercado',
      amountMinor: 1000,
      financialDate: '2026-10-13',
      categoryId: food?.id ?? '',
      subcategoryId: null,
    });

    const before = await getReminders(data, userId, space.id, '2026-10-10');
    expect(before.map((item) => item.stage)).toEqual(['before-3']);

    await data.repositories.reminders.dismiss(userId, space.id, before[0]?.key ?? '', 'before-3');
    await data.repositories.reminders.dismiss(userId, space.id, before[0]?.key ?? '', 'before-3');
    expect(await getReminders(data, userId, space.id, '2026-10-10')).toEqual([]);

    await data.repositories.reminders.saveSettings(userId, space.id, {
      offsets: [0, 7],
      kinds: ['transactions'],
    });
    await data.repositories.reminders.saveSettings(userId, space.id, {
      offsets: [1, 7],
      kinds: ['transactions', 'debts'],
    });
    expect(await data.repositories.reminders.findSettings(userId, space.id)).toEqual({
      offsets: [1, 7],
      kinds: ['transactions', 'debts'],
    });
    expect(
      (await getReminders(data, userId, space.id, '2026-10-10')).map((item) => item.stage),
    ).toEqual(['before-7']);
  });
});
