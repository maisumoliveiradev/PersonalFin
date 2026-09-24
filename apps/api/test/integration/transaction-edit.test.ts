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

async function setUp() {
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });
  const categories = await data.repositories.categories.listForSpace(space.id);
  const food = categories.find((category) => category.defaultKey === 'food');
  if (food === undefined) {
    throw new Error('Missing food category');
  }
  const transaction = await createTransaction(data, {
    financialSpaceId: space.id,
    createdByUserId: userId,
    type: 'expense',
    status: 'paid',
    description: 'Mercado',
    amountMinor: 1000,
    financialDate: '2026-01-05',
    categoryId: food.id,
    subcategoryId: null,
  });
  return { userId, spaceId: space.id, transaction };
}

describe('transaction edit persistence', () => {
  it('persists the edit, bumps the version, and stores the audit event', async () => {
    const { userId, spaceId, transaction } = await setUp();

    const updated = await updateTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: transaction.id,
      actorUserId: userId,
      expectedVersion: 1,
      changes: { amountMinor: 99_999_999_999, financialDate: '2026-12-31' },
    });

    expect(updated).toMatchObject({
      amountMinor: 99_999_999_999,
      financialDate: '2026-12-31',
      version: 2,
    });
    const events = await data.repositories.audit.listForEntity(
      spaceId,
      'financial_transaction',
      transaction.id,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.changes).toEqual({
      amountMinor: { before: 1000, after: 99_999_999_999 },
      financialDate: { before: '2026-01-05', after: '2026-12-31' },
    });
    const { rows } = await pool.query<{ updated_by_user_id: string }>(
      'SELECT updated_by_user_id FROM financial_transaction WHERE id = $1',
      [transaction.id],
    );
    expect(rows[0]?.updated_by_user_id).toBe(userId);
  });

  it('lets exactly one of two concurrent edits of the same version win', async () => {
    const { userId, spaceId, transaction } = await setUp();
    const edit = (description: string) =>
      updateTransaction(data, {
        financialSpaceId: spaceId,
        transactionId: transaction.id,
        actorUserId: userId,
        expectedVersion: 1,
        changes: { description },
      });

    const results = await Promise.allSettled([edit('Primeira'), edit('Segunda')]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason.code).toBe('VERSION_CONFLICT');
    const events = await data.repositories.audit.listForEntity(
      spaceId,
      'financial_transaction',
      transaction.id,
    );
    expect(events).toHaveLength(1);
  });

  it('keeps audit events append-only', async () => {
    const { userId, spaceId, transaction } = await setUp();
    await updateTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: transaction.id,
      actorUserId: userId,
      expectedVersion: 1,
      changes: { description: 'Editado' },
    });

    await expect(pool.query("UPDATE audit_event SET action = 'update'")).rejects.toThrow(
      /append-only/,
    );
    await expect(pool.query('DELETE FROM audit_event')).rejects.toThrow(/append-only/);
  });
});
