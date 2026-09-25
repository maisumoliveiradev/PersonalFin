import { randomUUID } from 'node:crypto';

import { summarizeDebt } from '@personalfin/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import {
  confirmDebtPrepayment,
  createDebt,
  recordDebtPayment,
  removeDebtPayment,
  updateDebt,
} from '../../src/modules/debts/debt-management.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
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
  const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: userId });
  return { userId, spaceId: space.id };
}

describe('PostgreSQL debts', () => {
  it('persists debts and payments exactly and audits every change', async () => {
    const { userId, spaceId } = await setUp();
    const { debt } = await createDebt(data, {
      financialSpaceId: spaceId,
      actorUserId: userId,
      name: 'Empréstimo',
      originalAmountMinor: 99_999_999_999,
      installmentCount: 600,
      firstDueDate: '2026-01-31',
    });
    expect(debt.installmentAmountMinor).toBe(166_666_666);

    const afterPayment = await recordDebtPayment(data, {
      financialSpaceId: spaceId,
      debtId: debt.id,
      actorUserId: userId,
      kind: 'installment',
      amountMinor: 166_666_666,
      paidOn: '2026-01-31',
    });
    expect(summarizeDebt(afterPayment.debt, afterPayment.payments)).toMatchObject({
      outstandingMinor: 99_833_333_333,
      paidInstallments: 1,
      nextDueDate: '2026-02-28',
    });

    const [payment] = afterPayment.payments;
    const afterRemoval = await removeDebtPayment(data, {
      financialSpaceId: spaceId,
      debtId: debt.id,
      paymentId: payment?.id ?? '',
      actorUserId: userId,
    });
    expect(afterRemoval.payments).toEqual([]);

    const { debt: archived } = await updateDebt(data, {
      financialSpaceId: spaceId,
      debtId: debt.id,
      actorUserId: userId,
      expectedVersion: 1,
      archived: true,
    });
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.version).toBe(2);

    const history = await data.repositories.audit.listForSpace(spaceId, 10, null);
    expect(history.items.map((event) => `${event.entityType}:${event.action}`)).toEqual([
      'debt:update',
      'debt_payment:delete',
      'debt_payment:create',
      'debt:create',
    ]);
  });

  it('rejects an installment larger than the original amount in the database', async () => {
    const { userId, spaceId } = await setUp();
    await expect(
      data.repositories.debts.create({
        id: randomUUID(),
        financialSpaceId: spaceId,
        name: 'Inválida',
        originalAmountMinor: 100,
        currency: 'BRL',
        installmentCount: 1,
        installmentAmountMinor: 101,
        firstDueDate: '2026-01-01',
        createdByUserId: userId,
      }),
    ).rejects.toThrow();
  });

  it('confirms a prepayment atomically with the simulated plan', async () => {
    const { userId, spaceId } = await setUp();
    const { debt } = await createDebt(data, {
      financialSpaceId: spaceId,
      actorUserId: userId,
      name: 'Casa',
      originalAmountMinor: 1_200_000,
      installmentCount: 12,
      firstDueDate: '2026-10-10',
    });

    const { debt: updated, payments } = await confirmDebtPrepayment(data, {
      financialSpaceId: spaceId,
      debtId: debt.id,
      actorUserId: userId,
      expectedVersion: 1,
      amountMinor: 250_000,
      mode: 'reduce_term',
      paidOn: '2026-10-01',
    });

    expect(updated).toMatchObject({
      version: 2,
      installmentCount: 10,
      installmentAmountMinor: 100_000,
    });
    expect(payments.map((payment) => payment.kind)).toEqual(['prepayment']);
    await expect(
      confirmDebtPrepayment(data, {
        financialSpaceId: spaceId,
        debtId: debt.id,
        actorUserId: userId,
        expectedVersion: 1,
        amountMinor: 1,
        mode: 'reduce_term',
        paidOn: '2026-10-01',
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(await data.repositories.debts.listPayments(spaceId, debt.id)).toHaveLength(1);
  });
});
