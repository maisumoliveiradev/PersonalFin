import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import type { Category } from '../../src/modules/categories/category.ts';
import { getMonthlyDashboard } from '../../src/modules/dashboard/get-dashboard.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
import { deleteTransaction } from '../../src/modules/transactions/transaction-deletion.ts';
import { createMigratedTestPool } from './database.ts';
import { insertUser } from './fixtures.ts';

let pool: DatabasePool;
let data: DataAccess;
let spaceId: string;

beforeAll(async () => {
  pool = await createMigratedTestPool();
  data = createPostgresDataAccess(pool);
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  spaceId = (await createFinancialSpace(data, { name: 'Painel', ownerUserId: userId })).id;
  const otherSpace = await createFinancialSpace(data, { name: 'Outro', ownerUserId: userId });
  const categories: Category[] = await data.repositories.categories.listForSpace(spaceId);
  const key = (value: string) =>
    categories.find((category) => category.defaultKey === value)?.id ?? '';
  const add = async (
    type: 'income' | 'expense',
    status: 'paid' | 'pending',
    amountMinor: number,
    financialDate: string,
    category: string,
    subcategory: string | null = null,
    space = spaceId,
  ) => {
    const categoryId =
      space === spaceId
        ? key(category)
        : ((await data.repositories.categories.listForSpace(space)).find(
            (item) => item.defaultKey === category,
          )?.id ?? '');
    return createTransaction(data, {
      financialSpaceId: space,
      createdByUserId: userId,
      type,
      status,
      description: `${type} ${amountMinor}`,
      amountMinor,
      financialDate,
      categoryId,
      subcategoryId: subcategory === null ? null : key(subcategory),
    });
  };

  await add('income', 'paid', 500_000, '2026-02-05', 'income');
  await add('income', 'pending', 90_000, '2026-02-25', 'other-income');
  await add('expense', 'paid', 185_000, '2026-02-10', 'housing', 'housing.rent');
  await add('expense', 'paid', 15_000, '2026-02-11', 'housing', 'housing.utilities');
  await add('expense', 'paid', 123_456, '2026-02-01', 'food');
  await add('expense', 'paid', 30, '2026-02-28', 'food', 'food.groceries');
  await add('expense', 'pending', 20_000, '2026-02-20', 'health');
  await add('expense', 'paid', 99_999, '2026-01-31', 'food');
  await add('expense', 'paid', 77_777, '2026-03-01', 'food');
  await add('expense', 'paid', 55_555, '2026-02-15', 'food', null, otherSpace.id);
  const deleted = await add('expense', 'paid', 1_000_000, '2026-02-12', 'leisure');
  await deleteTransaction(data, {
    financialSpaceId: spaceId,
    transactionId: deleted.id,
    actorUserId: userId,
    expectedVersion: 1,
  });
  const snapshot = (amountMinor: number, observedOn: string) =>
    data.repositories.balanceSnapshots.record({
      id: randomUUID(),
      financialSpaceId: spaceId,
      amountMinor,
      currency: 'BRL',
      observedOn,
      note: null,
      recordedByUserId: userId,
    });
  await snapshot(300_000, '2026-01-20');
  await snapshot(-15_075, '2026-02-27');
  await snapshot(999_999, '2026-03-05');
});

afterAll(async () => {
  await pool.end();
});

describe('monthly dashboard metrics (docs/product/METRICS.md)', () => {
  it('computes M-001 to M-007 exactly for February 2026', async () => {
    const dashboard = await getMonthlyDashboard(data, spaceId, '2026-02');

    expect(dashboard).toEqual({
      month: '2026-02',
      currency: 'BRL',
      realizedIncome: 500_000,
      realizedExpenses: 185_000 + 15_000 + 123_456 + 30,
      realizedNet: 500_000 - (185_000 + 15_000 + 123_456 + 30),
      forecastIncome: 90_000,
      forecastExpenses: 20_000,
      realizedExpensesByCategory: [
        { categoryId: expect.any(String), name: 'Moradia', amountMinor: 200_000 },
        { categoryId: expect.any(String), name: 'Alimentação', amountMinor: 123_486 },
      ],
      observedBalance: { amountMinor: -15_075, observedOn: '2026-02-27' },
    });
  });

  it('uses the latest snapshot dated up to the end of a past month', async () => {
    const january = await getMonthlyDashboard(data, spaceId, '2026-01');

    expect(january.observedBalance).toEqual({ amountMinor: 300_000, observedOn: '2026-01-20' });
    expect(january.realizedExpenses).toBe(99_999);
  });

  it('returns zeros and no balance for a month before any data', async () => {
    const dashboard = await getMonthlyDashboard(data, spaceId, '2025-06');

    expect(dashboard).toMatchObject({
      realizedIncome: 0,
      realizedExpenses: 0,
      realizedNet: 0,
      forecastIncome: 0,
      forecastExpenses: 0,
      realizedExpensesByCategory: [],
      observedBalance: null,
    });
  });
});
