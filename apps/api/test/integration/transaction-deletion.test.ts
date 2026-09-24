import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
import {
  deleteTransaction,
  restoreTransaction,
} from '../../src/modules/transactions/transaction-deletion.ts';
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

function listFor(financialSpaceId: string, state: 'active' | 'deleted') {
  return data.repositories.transactions.list({ financialSpaceId, state, limit: 10, cursor: null });
}

async function setUp() {
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });
  const food = (await data.repositories.categories.listForSpace(space.id)).find(
    (category) => category.defaultKey === 'food',
  );
  const transaction = await createTransaction(data, {
    financialSpaceId: space.id,
    createdByUserId: userId,
    type: 'expense',
    status: 'paid',
    description: 'Engano',
    amountMinor: 4321,
    financialDate: '2026-01-05',
    categoryId: food?.id ?? '',
    subcategoryId: null,
  });
  const input = { financialSpaceId: space.id, transactionId: transaction.id, actorUserId: userId };
  return { userId, spaceId: space.id, transaction, input };
}

describe('transaction soft delete persistence', () => {
  it('keeps the row, records who deleted it, and restores identical values', async () => {
    const { userId, spaceId, transaction, input } = await setUp();

    await deleteTransaction(data, { ...input, expectedVersion: 1 });

    const { rows } = await pool.query<{ deleted_by_user_id: string; amount_minor: string }>(
      'SELECT deleted_by_user_id, amount_minor FROM financial_transaction WHERE id = $1',
      [transaction.id],
    );
    expect(rows[0]).toEqual({ deleted_by_user_id: userId, amount_minor: '4321' });
    expect((await listFor(spaceId, 'active')).items).toEqual([]);
    expect((await listFor(spaceId, 'deleted')).items).toHaveLength(1);

    const restored = await restoreTransaction(data, { ...input, expectedVersion: 2 });

    expect(restored).toMatchObject({
      amountMinor: 4321,
      financialDate: '2026-01-05',
      description: 'Engano',
      deletedAt: null,
      version: 3,
    });
    const events = await data.repositories.audit.listForEntity(
      spaceId,
      'financial_transaction',
      transaction.id,
    );
    expect(events.map((event) => event.action)).toEqual(['delete', 'restore']);
  });

  it('rejects a half-recorded deletion at the database level', async () => {
    const { transaction } = await setUp();

    await expect(
      pool.query('UPDATE financial_transaction SET deleted_at = now() WHERE id = $1', [
        transaction.id,
      ]),
    ).rejects.toThrow(/financial_transaction_deletion_is_complete/);
  });
});
