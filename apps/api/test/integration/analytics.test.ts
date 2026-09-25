import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import {
  getBreakdown,
  getComparison,
  getEvolution,
} from '../../src/modules/analytics/analytics.ts';
import { getMonthlyDashboard } from '../../src/modules/dashboard/get-dashboard.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
import { createMigratedTestPool } from './database.ts';
import { insertUser } from './fixtures.ts';

let pool: DatabasePool;
let data: DataAccess;
let spaceId: string;

beforeAll(async () => {
  pool = await createMigratedTestPool();
  data = createPostgresDataAccess(pool);
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  spaceId = (await createFinancialSpace(data, { name: 'Análises', ownerUserId: userId })).id;
  const categories = await data.repositories.categories.listForSpace(spaceId);
  const key = (value: string) =>
    categories.find((category) => category.defaultKey === value)?.id ?? '';
  const add = (
    type: 'income' | 'expense',
    amountMinor: number,
    financialDate: string,
    status: 'paid' | 'pending' = 'paid',
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
  await add('income', 1_000_001, '2025-10-15');
  await add('expense', 333_333, '2025-10-20');
  await add('income', 1_200_000, '2026-09-05');
  await add('expense', 400_000, '2026-09-10');
  await add('income', 1_100_000, '2026-10-05');
  await add('expense', 500_000, '2026-10-10');
  await add('expense', 70_000, '2026-10-28', 'pending');
});

afterAll(async () => {
  await pool.end();
});

describe('analytics against PostgreSQL', () => {
  it('matches the dashboard of each month to the cent', async () => {
    const evolution = await getEvolution(data, spaceId, '2026-09', 2);
    const september = await getMonthlyDashboard(data, spaceId, '2026-09');
    const october = await getMonthlyDashboard(data, spaceId, '2026-10');

    expect(evolution.map((item) => item.realizedNet)).toEqual([
      september.realizedNet,
      october.realizedNet,
    ]);
    expect(evolution[1]).toMatchObject({ realizedIncome: 1_100_000, realizedExpenses: 500_000 });
  });

  it('computes exact differences and rounded percentage changes', async () => {
    const comparison = await getComparison(data, spaceId, '2026-10');

    expect(comparison.previousMonth.changes.realizedIncome).toEqual({
      difference: -100_000,
      percentChangeTenths: -83,
    });
    expect(comparison.previousYear.changes.realizedExpenses).toEqual({
      difference: 166_667,
      percentChangeTenths: 500,
    });
    expect(comparison.previousMonth.changes.forecastExpenses).toEqual({
      difference: 70_000,
      percentChangeTenths: null,
    });
  });
});

describe('breakdown against PostgreSQL', () => {
  it('adds categories up to the realized expenses of the range', async () => {
    const breakdown = await getBreakdown(data, spaceId, '2026-09', 3);
    const september = await getMonthlyDashboard(data, spaceId, '2026-09');
    const october = await getMonthlyDashboard(data, spaceId, '2026-10');

    expect(breakdown.totalMinor).toBe(september.realizedExpenses + october.realizedExpenses);
    expect(breakdown.categories.reduce((total, item) => total + item.amountMinor, 0)).toBe(
      breakdown.totalMinor,
    );
    expect(breakdown).toMatchObject({ previousFromMonth: '2026-06', previousTotalMinor: 0 });
  });
});
