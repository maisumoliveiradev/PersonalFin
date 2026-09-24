import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
import { deleteTransaction } from '../../src/modules/transactions/transaction-deletion.ts';
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

describe('pending commitments in PostgreSQL', () => {
  it('lists and sums only pending, non-deleted transactions of the space in range', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });
    const other = await createFinancialSpace(data, { name: 'Outro', ownerUserId: userId });
    const categoryOf = async (spaceId: string) =>
      (await data.repositories.categories.listForSpace(spaceId)).find(
        (category) => category.defaultKey === 'housing',
      )?.id ?? '';
    const add = async (
      spaceId: string,
      amountMinor: number,
      financialDate: string,
      status: 'paid' | 'pending',
    ) =>
      createTransaction(data, {
        financialSpaceId: spaceId,
        createdByUserId: userId,
        type: 'expense',
        status,
        description: `Item ${amountMinor}`,
        amountMinor,
        financialDate,
        categoryId: await categoryOf(spaceId),
        subcategoryId: null,
      });
    await add(space.id, 100, '2026-10-01', 'pending');
    await add(space.id, 200, '2026-10-05', 'pending');
    await add(space.id, 400, '2026-10-06', 'paid');
    await add(other.id, 800, '2026-10-02', 'pending');
    const deleted = await add(space.id, 1_600, '2026-10-03', 'pending');
    await deleteTransaction(data, {
      financialSpaceId: space.id,
      transactionId: deleted.id,
      actorUserId: userId,
      expectedVersion: 1,
    });
    const range = { start: '2026-10-01', endExclusive: '2026-10-06' };

    const page = await data.repositories.transactions.list({
      financialSpaceId: space.id,
      state: 'active',
      status: 'pending',
      range,
      limit: 50,
      cursor: null,
    });
    const totals = await data.repositories.dashboard.monthTotals({
      financialSpaceId: space.id,
      ...range,
    });

    expect(page.items.map((item) => item.amountMinor).sort((a, b) => a - b)).toEqual([100, 200]);
    expect(totals.forecastExpenses).toBe(300);
  });
});
