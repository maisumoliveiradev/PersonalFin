import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { updateInvoiceDates } from '../../src/modules/cards/card-invoice-management.ts';
import { createCard } from '../../src/modules/cards/card-management.ts';
import { getMonthlyDashboard } from '../../src/modules/dashboard/get-dashboard.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
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
  const buy = (amountMinor: number, financialDate: string, invoiceMonth?: string) =>
    createTransaction(data, {
      financialSpaceId: spaceId,
      createdByUserId: userId,
      type: 'expense',
      status: 'pending',
      description: `Compra ${amountMinor}`,
      amountMinor,
      financialDate,
      categoryId: housing,
      subcategoryId: null,
      card: { cardId: card.id, ...(invoiceMonth === undefined ? {} : { invoiceMonth }) },
    });
  const add = (amountMinor: number, financialDate: string, status: 'paid' | 'pending') =>
    createTransaction(data, {
      financialSpaceId: spaceId,
      createdByUserId: userId,
      type: 'expense',
      status,
      description: `Conta ${amountMinor}`,
      amountMinor,
      financialDate,
      categoryId: housing,
      subcategoryId: null,
    });
  return { userId, spaceId, card, buy, add };
}

describe('card purchase persistence', () => {
  it('stores the invoice, reads the card back, and totals the invoice exactly', async () => {
    const { spaceId, card, buy } = await setUp();
    const first = await buy(1_001, '2026-10-02');
    await buy(2_002, '2026-09-30');
    await buy(99_999, '2026-10-03');

    const invoice = await data.repositories.cardInvoices.findByMonth(spaceId, card.id, '2026-10');

    expect(first.cardPurchase).toMatchObject({ cardName: 'Nubank', invoiceMonth: '2026-10' });
    expect(invoice).toMatchObject({
      closingDate: '2026-10-03',
      dueDate: '2026-10-13',
      totalMinor: 3_003,
    });
  });

  it('refuses a paid or income card purchase at the database level', async () => {
    const { buy } = await setUp();
    const purchase = await buy(500, '2026-10-02');

    await expect(
      pool.query(`UPDATE financial_transaction SET status = 'paid' WHERE id = $1`, [purchase.id]),
    ).rejects.toThrow(/financial_transaction_card_purchase_is_pending_expense/);
  });

  it('uses overridden closing dates for new purchases only', async () => {
    const { userId, spaceId, card, buy } = await setUp();
    const before = await buy(100, '2026-10-01');
    await updateInvoiceDates(data, {
      financialSpaceId: spaceId,
      cardId: card.id,
      referenceMonth: '2026-10',
      actorUserId: userId,
      expectedVersion: 1,
      closingDate: '2026-10-01',
      dueDate: '2026-10-09',
    });
    const after = await buy(200, '2026-10-02');
    const events = await data.repositories.audit.listForEntity(
      spaceId,
      'card_invoice',
      before.cardPurchase?.invoiceId ?? '',
    );

    expect(
      (await data.repositories.transactions.findInSpace(spaceId, before.id))?.cardPurchase
        ?.invoiceMonth,
    ).toBe('2026-10');
    expect(after.cardPurchase?.invoiceMonth).toBe('2026-11');
    expect(events[0]?.changes).toEqual({
      closingDate: { before: '2026-10-03', after: '2026-10-01' },
      dueDate: { before: '2026-10-13', after: '2026-10-09' },
    });
  });

  it('audits moving a purchase to another invoice', async () => {
    const { userId, spaceId, buy } = await setUp();
    const purchase = await buy(100, '2026-10-02');

    const moved = await updateTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: purchase.id,
      actorUserId: userId,
      expectedVersion: 1,
      changes: {},
      invoiceMonth: '2026-11',
    });

    expect(moved.cardPurchase?.invoiceMonth).toBe('2026-11');
    expect(moved.cardPurchase?.invoiceId).not.toBe(purchase.cardPurchase?.invoiceId);
  });
});

describe('card purchases in metrics', () => {
  it('counts purchases in the invoice month and excludes deleted ones', async () => {
    const { userId, spaceId, buy, add } = await setUp();
    await buy(7_000, '2026-10-05');
    const deleted = await buy(50_000, '2026-10-06');
    await deleteTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: deleted.id,
      actorUserId: userId,
      expectedVersion: 1,
    });
    await add(1_000, '2026-10-05', 'paid');

    const october = await getMonthlyDashboard(data, spaceId, '2026-10');
    const november = await getMonthlyDashboard(data, spaceId, '2026-11');

    expect(october).toMatchObject({ realizedExpenses: 1_000, forecastExpenses: 0 });
    expect(november).toMatchObject({ realizedExpenses: 0, forecastExpenses: 7_000 });
  });

  it('projects cash with open invoices due by the month end instead of purchases', async () => {
    const { userId, spaceId, buy, add } = await setUp();
    await data.repositories.balanceSnapshots.record({
      id: randomUUID(),
      financialSpaceId: spaceId,
      amountMinor: 100_000,
      currency: 'BRL',
      observedOn: '2026-09-30',
      note: null,
      recordedByUserId: userId,
    });
    await buy(4_000, '2026-09-20');
    await buy(6_000, '2026-10-10');
    await add(1_000, '2026-10-15', 'pending');

    const october = await getMonthlyDashboard(data, spaceId, '2026-10');
    const november = await getMonthlyDashboard(data, spaceId, '2026-11');

    expect(october.projection).toMatchObject({ amountMinor: 95_000, openInvoices: 4_000 });
    expect(november.projection).toMatchObject({ amountMinor: 89_000, openInvoices: 10_000 });
  });

  it('lists open invoices due in a range with their card', async () => {
    const { spaceId, buy } = await setUp();
    await buy(4_000, '2026-10-02');
    await buy(6_000, '2026-10-10');

    const due = await data.repositories.cardInvoices.listOpenDue(spaceId, {
      start: '2026-10-01',
      endExclusive: '2026-11-01',
    });

    expect(due.map((invoice) => [invoice.cardName, invoice.dueDate, invoice.totalMinor])).toEqual([
      ['Nubank', '2026-10-13', 4_000],
    ]);
  });
});
