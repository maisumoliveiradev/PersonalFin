import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
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

describe('PostgreSQL multi-currency', () => {
  it('stores rates as exact decimals and keeps the applied rate on the transaction', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await createFinancialSpace(data, { name: 'Viagem', ownerUserId: userId });
    const food = (await data.repositories.categories.listForSpace(space.id)).find(
      (category) => category.defaultKey === 'food',
    );
    await data.repositories.exchangeRates.record({
      id: randomUUID(),
      financialSpaceId: space.id,
      currency: 'JPY',
      baseCurrency: 'BRL',
      rateDate: '2026-10-01',
      rate: '0.0366123456',
      source: 'manual',
      recordedByUserId: userId,
    });
    const created = await createTransaction(data, {
      financialSpaceId: space.id,
      createdByUserId: userId,
      type: 'expense',
      status: 'paid',
      description: 'Ramen',
      amountMinor: 0,
      financialDate: '2026-10-05',
      categoryId: food?.id ?? '',
      subcategoryId: null,
      foreign: { currency: 'JPY', amountMinor: 1_500 },
    });
    expect(created).toMatchObject({
      amountMinor: 5_492,
      original: { currency: 'JPY', amountMinor: 1_500, rate: '0.0366123456', rateSource: 'manual' },
    });

    const converted = await updateTransaction(data, {
      financialSpaceId: space.id,
      transactionId: created.id,
      actorUserId: userId,
      expectedVersion: 1,
      changes: {},
      foreign: null,
    });
    expect(converted).toMatchObject({ amountMinor: 5_492, original: null });

    await expect(
      pool.query('UPDATE exchange_rate SET rate = 1 WHERE financial_space_id = $1', [space.id]),
    ).rejects.toThrow(/append-only/);
    await expect(
      pool.query(`UPDATE financial_transaction SET original_currency = 'USD' WHERE id = $1`, [
        created.id,
      ]),
    ).rejects.toThrow(/original_amount_complete/);
  });
});
