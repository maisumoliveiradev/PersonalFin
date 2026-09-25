import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { getProjection, getProjectionSeries } from '../../src/modules/dashboard/get-dashboard.ts';
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
  spaceId = (await createFinancialSpace(data, { name: 'Projeção', ownerUserId: userId })).id;
  const categories = await data.repositories.categories.listForSpace(spaceId);
  const key = (value: string) =>
    categories.find((category) => category.defaultKey === value)?.id ?? '';
  const add = (
    type: 'income' | 'expense',
    status: 'paid' | 'pending',
    amountMinor: number,
    financialDate: string,
  ) =>
    createTransaction(data, {
      financialSpaceId: spaceId,
      createdByUserId: userId,
      type,
      status,
      description: `${type} ${amountMinor}`,
      amountMinor,
      financialDate,
      categoryId: key(type === 'income' ? 'income' : 'housing'),
      subcategoryId: null,
    });

  await add('expense', 'paid', 10_000, '2026-02-05');
  await add('expense', 'pending', 5_000, '2026-02-08');
  await add('income', 'paid', 30_000, '2026-02-10');
  await add('expense', 'pending', 2_000, '2026-02-10');
  await add('expense', 'paid', 20_000, '2026-02-15');
  await add('income', 'pending', 50_000, '2026-02-25');
  await add('expense', 'pending', 7_000, '2026-03-02');
  const deleted = await add('expense', 'pending', 999_000, '2026-02-20');
  await deleteTransaction(data, {
    financialSpaceId: spaceId,
    transactionId: deleted.id,
    actorUserId: userId,
    expectedVersion: 1,
  });
  await data.repositories.balanceSnapshots.record({
    id: randomUUID(),
    financialSpaceId: spaceId,
    amountMinor: 100_000,
    currency: 'BRL',
    observedOn: '2026-02-10',
    note: null,
    recordedByUserId: userId,
  });
});

afterAll(async () => {
  await pool.end();
});

describe('monthly projection (M-008)', () => {
  it('adds movements after the observation and pending items up to it', async () => {
    const projection = await getProjection(data, spaceId, '2026-02');

    expect(projection).toEqual({
      base: { amountMinor: 100_000, observedOn: '2026-02-10' },
      afterObservation: { income: 50_000, expenses: 20_000 },
      pendingUpToObservation: { income: 0, expenses: 7_000 },
      openInvoices: 0,
      invoicePayments: 0,
      amountMinor: 100_000 + (50_000 - 20_000) + (0 - 7_000),
    });
  });

  it('carries the projection into later months', async () => {
    const march = await getProjection(data, spaceId, '2026-03');

    expect(march?.amountMinor).toBe(100_000 + (50_000 - 20_000 - 7_000) - 7_000);
  });

  it('has no projection before any observed balance', async () => {
    expect(await getProjection(data, spaceId, '2026-01')).toBeNull();
  });

  it('builds a month-by-month series', async () => {
    const series = await getProjectionSeries(data, spaceId, '2026-01', 4);

    expect(series).toEqual([
      { month: '2026-01', projectedBalance: null },
      { month: '2026-02', projectedBalance: 123_000 },
      { month: '2026-03', projectedBalance: 116_000 },
      { month: '2026-04', projectedBalance: 116_000 },
    ]);
  });
});
