import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import {
  cancelInstallments,
  createInstallmentPurchase,
} from '../../src/modules/cards/card-installment-management.ts';
import { createCard } from '../../src/modules/cards/card-management.ts';
import { getMonthlyDashboard } from '../../src/modules/dashboard/get-dashboard.ts';
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
  const spaceId = (await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId })).id;
  const categories = await data.repositories.categories.listForSpace(spaceId);
  const housing = categories.find((category) => category.defaultKey === 'housing')?.id ?? '';
  const { card } = await createCard(data, {
    financialSpaceId: spaceId,
    actorUserId: userId,
    name: 'Nubank',
    closingDay: 3,
    dueDay: 10,
    limitMinor: 500_000,
    limitEffectiveFrom: '2026-01-01',
  });
  const installments = await createInstallmentPurchase(data, {
    financialSpaceId: spaceId,
    createdByUserId: userId,
    type: 'expense',
    status: 'pending',
    description: 'Geladeira',
    amountMinor: 100_001,
    financialDate: '2026-10-02',
    categoryId: housing,
    subcategoryId: null,
    card: { cardId: card.id },
    installments: 10,
  });
  return { userId, spaceId, installments };
}

describe('installment purchase persistence', () => {
  it('stores every installment linked to the purchase, adding up to the total', async () => {
    const { installments } = await setUp();

    expect(installments).toHaveLength(10);
    expect(installments.reduce((total, item) => total + item.amountMinor, 0)).toBe(100_001);
    expect(installments[9]).toMatchObject({
      financialDate: '2027-07-02',
      installment: { number: 10, count: 10 },
      cardPurchase: { invoiceMonth: '2027-07' },
    });
  });

  it('counts one installment per invoice month in the metrics', async () => {
    const { spaceId } = await setUp();

    const october = await getMonthlyDashboard(data, spaceId, '2026-10');
    const july = await getMonthlyDashboard(data, spaceId, '2027-07');

    expect(october.forecastExpenses).toBe(10_001);
    expect(july.forecastExpenses).toBe(10_000);
  });

  it('cancels only later installments and refuses duplicate numbers', async () => {
    const { userId, spaceId, installments } = await setUp();
    const purchaseId = installments[0]?.installment?.purchaseId ?? '';

    const cancelled = await cancelInstallments(data, {
      financialSpaceId: spaceId,
      purchaseId,
      afterMonth: '2027-04',
      actorUserId: userId,
    });
    const remaining = await data.repositories.transactions.list({
      financialSpaceId: spaceId,
      state: 'active',
      limit: 50,
      cursor: null,
    });

    expect(cancelled).toBe(3);
    expect(remaining.items).toHaveLength(7);
    await expect(
      pool.query(
        `UPDATE financial_transaction SET installment_number = 1
         WHERE installment_purchase_id = $1 AND installment_number = 2`,
        [purchaseId],
      ),
    ).rejects.toThrow(/financial_transaction_installment_unique/);
  });
});
