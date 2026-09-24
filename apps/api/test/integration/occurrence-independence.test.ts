import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import {
  createRecurrenceSeries,
  endSeries,
  materializeSpace,
  updateSeriesFrom,
} from '../../src/modules/recurrences/recurrence-management.ts';
import { deleteTransaction } from '../../src/modules/transactions/transaction-deletion.ts';
import { updateTransaction } from '../../src/modules/transactions/update-transaction.ts';
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

interface OccurrenceRow {
  id: string;
  occurrence_date: string;
  description: string;
  amount_minor: string;
  status: string;
  deleted: boolean;
  individually_modified: boolean;
  version: number;
}

async function setUp() {
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });
  const categories = await data.repositories.categories.listForSpace(space.id);
  const key = (value: string) =>
    categories.find((category) => category.defaultKey === value)?.id ?? '';
  const { series } = await createRecurrenceSeries(data, {
    financialSpaceId: space.id,
    actorUserId: userId,
    type: 'expense',
    description: 'Academia',
    amountMinor: 10_000,
    categoryId: key('health'),
    subcategoryId: null,
    frequency: 'monthly',
    nonBusinessDayRule: 'keep',
    startDate: '2026-01-10',
    endDate: null,
    materializeThrough: '2026-06-30',
  });
  const rows = async (): Promise<OccurrenceRow[]> =>
    (
      await pool.query<OccurrenceRow>(
        `SELECT id, occurrence_date::text, description, amount_minor, status,
                deleted_at IS NOT NULL AS deleted, individually_modified, version
         FROM financial_transaction WHERE recurrence_series_id = $1 ORDER BY occurrence_date`,
        [series.id],
      )
    ).rows;
  const byDate = async (date: string) => {
    const row = (await rows()).find((item) => item.occurrence_date === date);
    if (row === undefined) {
      throw new Error(`Missing occurrence ${date}`);
    }
    return row;
  };
  return { userId, spaceId: space.id, series, rows, byDate, key };
}

describe('occurrence independence', () => {
  it('editing one occurrence marks it and leaves the others untouched', async () => {
    const { userId, spaceId, byDate, rows } = await setUp();
    const march = await byDate('2026-03-10');

    await updateTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: march.id,
      actorUserId: userId,
      expectedVersion: 1,
      changes: { amountMinor: 12_000 },
    });

    const all = await rows();
    expect(
      all.filter((row) => row.individually_modified).map((row) => row.occurrence_date),
    ).toEqual(['2026-03-10']);
    expect(all.filter((row) => row.amount_minor !== '10000')).toHaveLength(1);
  });

  it('updates only pending, unmodified occurrences from the chosen date', async () => {
    const { userId, spaceId, series, byDate, rows } = await setUp();
    const april = await byDate('2026-04-10');
    const may = await byDate('2026-05-10');
    await updateTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: april.id,
      actorUserId: userId,
      expectedVersion: 1,
      changes: { status: 'paid' },
    });
    await pool.query("UPDATE financial_transaction SET status = 'paid' WHERE id = $1", [may.id]);

    const result = await updateSeriesFrom(data, {
      financialSpaceId: spaceId,
      seriesId: series.id,
      actorUserId: userId,
      expectedVersion: 1,
      fromOccurrenceDate: '2026-03-10',
      changes: { amountMinor: 15_000, description: 'Academia nova' },
    });

    expect(result.occurrencesUpdated).toBe(2);
    expect(result.series).toMatchObject({
      amountMinor: 15_000,
      description: 'Academia nova',
      version: 2,
    });
    expect((await rows()).map((row) => [row.occurrence_date, row.amount_minor])).toEqual([
      ['2026-01-10', '10000'],
      ['2026-02-10', '10000'],
      ['2026-03-10', '15000'],
      ['2026-04-10', '10000'],
      ['2026-05-10', '10000'],
      ['2026-06-10', '15000'],
    ]);
    const events = await data.repositories.audit.listForEntity(
      spaceId,
      'financial_transaction',
      (await byDate('2026-06-10')).id,
    );
    expect(events.at(-1)?.changes).toEqual({
      description: { before: 'Academia', after: 'Academia nova' },
      amountMinor: { before: 10_000, after: 15_000 },
    });
  });

  it('new occurrences after a series edit use the new defaults', async () => {
    const { userId, spaceId, series, byDate } = await setUp();
    await updateSeriesFrom(data, {
      financialSpaceId: spaceId,
      seriesId: series.id,
      actorUserId: userId,
      expectedVersion: 1,
      fromOccurrenceDate: '2026-02-10',
      changes: { amountMinor: 11_000 },
    });

    await materializeSpace(data, spaceId, '2026-08-31', '2026-01');

    expect((await byDate('2026-08-10')).amount_minor).toBe('11000');
  });

  it('ending a series trashes only pending, unmodified later occurrences', async () => {
    const { userId, spaceId, series, byDate, rows } = await setUp();
    const may = await byDate('2026-05-10');
    const june = await byDate('2026-06-10');
    await updateTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: may.id,
      actorUserId: userId,
      expectedVersion: 1,
      changes: { description: 'Academia (ajustada)' },
    });
    await deleteTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: june.id,
      actorUserId: userId,
      expectedVersion: 1,
    });

    const result = await endSeries(data, {
      financialSpaceId: spaceId,
      seriesId: series.id,
      actorUserId: userId,
      expectedVersion: 1,
      endDate: '2026-03-31',
    });
    await materializeSpace(data, spaceId, '2026-12-31', '2026-01');

    expect(result.occurrencesRemoved).toBe(1);
    expect(result.series.endDate).toBe('2026-03-31');
    expect(
      (await rows()).map((row) => [row.occurrence_date, row.deleted, row.individually_modified]),
    ).toEqual([
      ['2026-01-10', false, false],
      ['2026-02-10', false, false],
      ['2026-03-10', false, false],
      ['2026-04-10', true, false],
      ['2026-05-10', false, true],
      ['2026-06-10', true, true],
    ]);
  });

  it('rejects a stale series version and an end before the start', async () => {
    const { userId, spaceId, series } = await setUp();

    await expect(
      updateSeriesFrom(data, {
        financialSpaceId: spaceId,
        seriesId: series.id,
        actorUserId: userId,
        expectedVersion: 9,
        fromOccurrenceDate: '2026-01-10',
        changes: { amountMinor: 1 },
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      endSeries(data, {
        financialSpaceId: spaceId,
        seriesId: series.id,
        actorUserId: userId,
        expectedVersion: 1,
        endDate: '2025-12-31',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('rejects a category of the wrong kind for the series', async () => {
    const { userId, spaceId, series, key } = await setUp();

    await expect(
      updateSeriesFrom(data, {
        financialSpaceId: spaceId,
        seriesId: series.id,
        actorUserId: userId,
        expectedVersion: 1,
        fromOccurrenceDate: '2026-01-10',
        changes: { categoryId: key('income') },
      }),
    ).rejects.toMatchObject({ code: 'CATEGORY_NOT_AVAILABLE' });
  });
});
