import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import {
  payInvoice,
  removeInvoicePayment,
} from '../../src/modules/cards/card-invoice-management.ts';
import { createCard } from '../../src/modules/cards/card-management.ts';
import { getMonthlyDashboard } from '../../src/modules/dashboard/get-dashboard.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
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
  const purchase = await createTransaction(data, {
    financialSpaceId: spaceId,
    createdByUserId: userId,
    type: 'expense',
    status: 'pending',
    description: 'Mercado',
    amountMinor: 10_000,
    financialDate: '2026-10-02',
    categoryId: housing,
    subcategoryId: null,
    card: { cardId: card.id },
  });
  await data.repositories.balanceSnapshots.record({
    id: randomUUID(),
    financialSpaceId: spaceId,
    amountMinor: 100_000,
    currency: 'BRL',
    observedOn: '2026-09-30',
    note: null,
    recordedByUserId: userId,
  });
  const pay = (amountMinor: number, paidOn: string) =>
    payInvoice(data, {
      financialSpaceId: spaceId,
      cardId: card.id,
      referenceMonth: '2026-10',
      actorUserId: userId,
      amountMinor,
      paidOn,
    });
  return { userId, spaceId, card, purchase, pay };
}

describe('invoice payments', () => {
  it('projects cash once whether the invoice is open, partially paid, or paid', async () => {
    const { pay, spaceId } = await setUp();
    const projected = async () =>
      (await getMonthlyDashboard(data, spaceId, '2026-10')).projection?.amountMinor;

    const open = await projected();
    await pay(4_000, '2026-10-10');
    const partial = await projected();
    await pay(6_000, '2026-10-13');
    const paid = await projected();

    expect([open, partial, paid]).toEqual([90_000, 90_000, 90_000]);
  });

  it('treats payments before the observation as already in the balance', async () => {
    const { pay, spaceId } = await setUp();

    await pay(10_000, '2026-09-29');
    const dashboard = await getMonthlyDashboard(data, spaceId, '2026-10');

    expect(dashboard.projection).toMatchObject({
      amountMinor: 100_000,
      openInvoices: 0,
      invoicePayments: 0,
    });
    expect(dashboard.realizedExpenses).toBe(10_000);
  });

  it('marks purchases of a paid invoice as settled and audits payments', async () => {
    const { userId, spaceId, card, purchase, pay } = await setUp();
    const paid = await pay(10_000, '2026-10-13');
    const [payment] = await data.repositories.cardInvoices.listPayments(spaceId, paid.id);

    const settled = await data.repositories.transactions.findInSpace(spaceId, purchase.id);
    await removeInvoicePayment(data, {
      financialSpaceId: spaceId,
      cardId: card.id,
      referenceMonth: '2026-10',
      paymentId: payment?.id ?? '',
      actorUserId: userId,
    });
    const reopened = await data.repositories.transactions.findInSpace(spaceId, purchase.id);
    const events = await data.repositories.audit.listForEntity(
      spaceId,
      'card_invoice_payment',
      payment?.id ?? '',
    );

    expect(settled?.cardPurchase?.invoiceSettled).toBe(true);
    expect(reopened?.cardPurchase?.invoiceSettled).toBe(false);
    expect(events.map((event) => event.action)).toEqual(['create', 'delete']);
  });

  it('lists only invoices with an open amount in commitments', async () => {
    const { pay, spaceId } = await setUp();
    await pay(4_000, '2026-10-10');
    const range = { start: '2026-10-01', endExclusive: '2026-11-01' };

    const partial = await data.repositories.cardInvoices.listOpenDue(spaceId, range);
    await pay(6_000, '2026-10-13');
    const paid = await data.repositories.cardInvoices.listOpenDue(spaceId, range);

    expect(partial.map((invoice) => invoice.totalMinor - invoice.paidMinor)).toEqual([6_000]);
    expect(paid).toEqual([]);
  });
});

describe('card usage', () => {
  it('sums the unpaid part of every invoice of the card', async () => {
    const { pay, spaceId, card } = await setUp();
    await pay(4_000, '2026-10-10');

    const used = await data.repositories.cards.usedByCard(spaceId);
    const invoices = await data.repositories.cardInvoices.listForCard(spaceId, card.id, {
      start: '2026-09-01',
      endExclusive: '2026-12-01',
    });

    expect(used.get(card.id)).toBe(6_000);
    expect(invoices.map((invoice) => [invoice.referenceMonth, invoice.paidMinor])).toEqual([
      ['2026-10', 4_000],
    ]);
  });
});
