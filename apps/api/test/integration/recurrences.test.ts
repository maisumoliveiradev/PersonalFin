import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import {
  createRecurrenceSeries,
  materializeSpace,
} from '../../src/modules/recurrences/recurrence-management.ts';
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

async function setUp() {
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });
  const categories = await data.repositories.categories.listForSpace(space.id);
  const housing = categories.find((category) => category.defaultKey === 'housing');
  const create = (overrides: Partial<Parameters<typeof createRecurrenceSeries>[1]> = {}) =>
    createRecurrenceSeries(data, {
      financialSpaceId: space.id,
      actorUserId: userId,
      type: 'expense',
      description: 'Aluguel',
      amountMinor: 185_000,
      categoryId: housing?.id ?? '',
      subcategoryId: null,
      frequency: 'monthly',
      nonBusinessDayRule: 'next',
      startDate: '2026-01-31',
      endDate: null,
      materializeThrough: '2026-06-30',
      ...overrides,
    });
  const occurrences = async (seriesId: string) =>
    (
      await pool.query<{ occurrence_date: string; financial_date: string; status: string }>(
        `SELECT occurrence_date::text, financial_date, status FROM financial_transaction
         WHERE recurrence_series_id = $1 ORDER BY occurrence_date`,
        [seriesId],
      )
    ).rows;
  return { userId, spaceId: space.id, create, occurrences };
}

describe('recurring series persistence', () => {
  it('creates pending occurrences with business-day-adjusted financial dates', async () => {
    const { create, occurrences } = await setUp();

    const { series, occurrencesCreated } = await create();

    expect(occurrencesCreated).toBe(6);
    expect(series.materializedThrough).toBe('2026-06-30');
    expect(await occurrences(series.id)).toEqual([
      { occurrence_date: '2026-01-31', financial_date: '2026-02-02', status: 'pending' },
      { occurrence_date: '2026-02-28', financial_date: '2026-03-02', status: 'pending' },
      { occurrence_date: '2026-03-31', financial_date: '2026-03-31', status: 'pending' },
      { occurrence_date: '2026-04-30', financial_date: '2026-04-30', status: 'pending' },
      { occurrence_date: '2026-05-31', financial_date: '2026-06-01', status: 'pending' },
      { occurrence_date: '2026-06-30', financial_date: '2026-06-30', status: 'pending' },
    ]);
  });

  it('extends materialization idempotently and respects the end date', async () => {
    const { spaceId, create, occurrences } = await setUp();
    const { series } = await create({ endDate: '2026-09-15' });

    const first = await materializeSpace(data, spaceId, '2026-12-31', '2026-01');
    const second = await materializeSpace(data, spaceId, '2026-12-31', '2026-01');

    expect(first).toBe(2);
    expect(second).toBe(0);
    expect((await occurrences(series.id)).map((row) => row.occurrence_date).at(-1)).toBe(
      '2026-08-31',
    );
  });

  it('never materializes beyond 60 months after the current month', async () => {
    const { spaceId, create, occurrences } = await setUp();
    const { series } = await create({ startDate: '2026-01-10', materializeThrough: '2026-01-31' });

    await materializeSpace(data, spaceId, '2040-12-31', '2026-01');

    expect((await occurrences(series.id)).at(-1)?.occurrence_date).toBe('2031-01-10');
  });

  it('keeps an occurrence per scheduled date unique at the database level', async () => {
    const { create, occurrences } = await setUp();
    const { series } = await create({ materializeThrough: '2026-01-31' });
    const [existing] = await occurrences(series.id);

    await expect(
      pool.query(
        `INSERT INTO financial_transaction (id, financial_space_id, type, status, description,
           amount_minor, currency, financial_date, category_id, created_by_user_id,
           recurrence_series_id, occurrence_date)
         SELECT $1, financial_space_id, type, status, description, amount_minor, currency,
           financial_date, category_id, created_by_user_id, recurrence_series_id, occurrence_date
         FROM financial_transaction WHERE recurrence_series_id = $2 LIMIT 1`,
        [randomUUID(), series.id],
      ),
    ).rejects.toThrow(/financial_transaction_occurrence_unique/);
    expect(existing?.occurrence_date).toBe('2026-01-31');
  });

  it('rejects linking an occurrence to a series of another space', async () => {
    const own = await setUp();
    const other = await setUp();
    const { series: foreign } = await other.create({
      startDate: '2026-01-15',
      materializeThrough: '2026-01-31',
    });
    const { series: ownSeries } = await own.create({ materializeThrough: '2026-01-31' });

    await expect(
      pool.query(
        'UPDATE financial_transaction SET recurrence_series_id = $1 WHERE recurrence_series_id = $2',
        [foreign.id, ownSeries.id],
      ),
    ).rejects.toThrow(/financial_transaction_series_in_same_space/);
  });
});
