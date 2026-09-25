import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildTestServer,
  createInMemoryRepositories,
  sessionCookie,
} from './support/test-server.ts';
import { sessions } from './support/users.ts';

let repositories = createInMemoryRepositories();
let server = buildTestServer({ sessions, repositories });
const asAna = { cookie: sessionCookie('ana-token') };
const asBruno = { cookie: sessionCookie('bruno-token') };

beforeEach(async () => {
  await server.close();
  repositories = createInMemoryRepositories();
  server = buildTestServer({ sessions, repositories });
});

afterAll(async () => {
  await server.close();
});

async function setUp() {
  const spaceId: string = (
    await server.inject({
      method: 'POST',
      url: '/financial-spaces',
      headers: asAna,
      payload: { name: 'Pessoal' },
    })
  ).json().id;
  const categories: { id: string; name: string; kind: string }[] = (
    await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/categories`,
      headers: asAna,
    })
  ).json().items;
  const food = categories.find((category) => category.name === 'Alimentação')?.id;
  const salary = categories.find((category) => category.kind === 'income')?.id;
  const card = (
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/cards`,
      headers: asAna,
      payload: {
        name: 'Nubank',
        closingDay: 3,
        dueDay: 10,
        limitMinor: 500_000,
        limitEffectiveFrom: '2026-01-01',
      },
    })
  ).json();
  const purchase = (payload: object, headers = asAna) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers,
      payload: {
        type: 'expense',
        description: 'Mercado',
        amountMinor: 10_000,
        financialDate: '2026-10-02',
        categoryId: food,
        cardId: card.id,
        ...payload,
      },
    });
  const invoice = (month: string, headers = asAna) =>
    server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/cards/${card.id}/invoices/${month}`,
      headers,
    });
  const setDates = (month: string, payload: object) =>
    server.inject({
      method: 'PUT',
      url: `/financial-spaces/${spaceId}/cards/${card.id}/invoices/${month}/dates`,
      headers: asAna,
      payload,
    });
  const patch = (transactionId: string, payload: object) =>
    server.inject({
      method: 'PATCH',
      url: `/financial-spaces/${spaceId}/transactions/${transactionId}`,
      headers: asAna,
      payload,
    });
  return { spaceId, card, food, salary, purchase, invoice, setDates, patch };
}

describe('card purchases', () => {
  it.each([
    ['2026-10-02', '2026-10'],
    ['2026-10-03', '2026-11'],
    ['2026-10-20', '2026-11'],
  ])('assigns a purchase on %s to the %s invoice', async (financialDate, month) => {
    const { purchase } = await setUp();

    const response = await purchase({ financialDate });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: 'pending',
      cardPurchase: { cardName: 'Nubank', invoiceMonth: month },
    });
  });

  it('accepts a manually chosen invoice near the purchase date', async () => {
    const { purchase } = await setUp();

    const response = await purchase({ invoiceMonth: '2026-12' });

    expect(response.json().cardPurchase.invoiceMonth).toBe('2026-12');
  });

  it.each([
    [{ invoiceMonth: '2027-01' }, 'INVALID_CARD_PURCHASE'],
    [{ status: 'paid' }, 'INVALID_CARD_PURCHASE'],
    [{ type: 'income', categoryId: 'income' }, 'INVALID_CARD_PURCHASE'],
    [{ cardId: '00000000-0000-4000-8000-000000000000' }, 'CARD_NOT_AVAILABLE'],
  ])('rejects %j', async (change, code) => {
    const { purchase, salary } = await setUp();
    const payload = { ...change } as Record<string, unknown>;
    if (payload.categoryId === 'income') {
      payload.categoryId = salary;
    }

    const response = await purchase(payload);

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe(code);
  });

  it('rejects an invoice month without a card', async () => {
    const { purchase } = await setUp();

    const response = await purchase({ cardId: undefined, invoiceMonth: '2026-10' });

    expect(response.json().error.code).toBe('INVALID_CARD_PURCHASE');
  });

  it('rejects purchases on an archived card', async () => {
    const { spaceId, card, purchase } = await setUp();
    await server.inject({
      method: 'PATCH',
      url: `/financial-spaces/${spaceId}/cards/${card.id}`,
      headers: asAna,
      payload: { version: 1, archived: true },
    });

    expect((await purchase({})).json().error.code).toBe('CARD_NOT_AVAILABLE');
  });

  it('never gives a card purchase its own status and moves it between invoices', async () => {
    const { purchase, patch } = await setUp();
    const created = (await purchase({})).json();

    const paid = await patch(created.id, { version: 1, status: 'paid' });
    const moved = await patch(created.id, { version: 1, invoiceMonth: '2026-11' });

    expect(paid.json().error.code).toBe('INVALID_CARD_PURCHASE');
    expect(moved.json()).toMatchObject({ version: 2, cardPurchase: { invoiceMonth: '2026-11' } });
  });

  it('rejects an invoice change on an ordinary transaction', async () => {
    const { purchase, patch } = await setUp();
    const ordinary = (await purchase({ cardId: undefined })).json();

    const response = await patch(ordinary.id, { version: 1, invoiceMonth: '2026-10' });

    expect(response.json().error.code).toBe('INVALID_CARD_PURCHASE');
  });
});

describe('card invoices', () => {
  it('shows default dates before the invoice exists', async () => {
    const { invoice } = await setUp();

    expect((await invoice('2026-10')).json()).toEqual({
      cardId: expect.any(String),
      referenceMonth: '2026-10',
      closingDate: '2026-10-03',
      dueDate: '2026-10-13',
      totalMinor: 0,
      paidMinor: 0,
      outstandingMinor: 0,
      state: 'empty',
      payments: [],
      version: null,
      purchases: [],
      hasMore: false,
    });
  });

  it('lists the purchases of the invoice with their exact total', async () => {
    const { purchase, invoice } = await setUp();
    await purchase({ amountMinor: 1_001 });
    await purchase({ amountMinor: 2_002, financialDate: '2026-09-30' });
    await purchase({ amountMinor: 5_000, financialDate: '2026-10-03' });

    const body = (await invoice('2026-10')).json();

    expect(body.totalMinor).toBe(3_003);
    expect(body.purchases).toHaveLength(2);
    expect(body.version).toBe(1);
  });

  it('overrides dates of one invoice without moving its purchases', async () => {
    const { purchase, invoice, setDates } = await setUp();
    await purchase({ financialDate: '2026-10-01' });

    const changed = await setDates('2026-10', {
      version: 1,
      closingDate: '2026-10-01',
      dueDate: '2026-10-09',
    });
    const later = await purchase({ financialDate: '2026-10-02' });

    expect(changed.json()).toMatchObject({ closingDate: '2026-10-01', dueDate: '2026-10-09' });
    expect((await invoice('2026-10')).json().purchases).toHaveLength(1);
    expect(later.json().cardPurchase.invoiceMonth).toBe('2026-11');
  });

  it('creates an invoice when overriding dates of a month without purchases', async () => {
    const { setDates } = await setUp();

    const response = await setDates('2027-02', {
      version: null,
      closingDate: '2027-02-01',
      dueDate: '2027-02-10',
    });

    expect(response.json()).toMatchObject({ version: 2, closingDate: '2027-02-01' });
  });

  it('rejects stale versions and a closing date after the due date', async () => {
    const { purchase, setDates } = await setUp();
    await purchase({});

    const stale = await setDates('2026-10', {
      version: null,
      closingDate: '2026-10-01',
      dueDate: '2026-10-09',
    });
    const inverted = await setDates('2026-10', {
      version: 1,
      closingDate: '2026-10-11',
      dueDate: '2026-10-09',
    });

    expect(stale.statusCode).toBe(409);
    expect(inverted.statusCode).toBe(400);
  });

  it("hides another user's invoices", async () => {
    const { invoice } = await setUp();

    expect((await invoice('2026-10', asBruno)).statusCode).toBe(404);
  });
});

describe('card purchases in metrics and commitments', () => {
  it('counts a purchase in its invoice month, not its purchase month', async () => {
    const { spaceId, purchase } = await setUp();
    await purchase({ financialDate: '2026-10-05', amountMinor: 7_777 });
    const dashboard = (month: string) =>
      server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/dashboard?month=${month}`,
        headers: asAna,
      });

    expect((await dashboard('2026-10')).json().forecastExpenses).toBe(0);
    expect((await dashboard('2026-11')).json().forecastExpenses).toBe(7_777);
  });

  it('lists open invoices instead of card purchases', async () => {
    const { spaceId, purchase } = await setUp();
    await purchase({ amountMinor: 4_000 });
    await purchase({ cardId: undefined, status: 'pending', amountMinor: 1_500 });

    const body = (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/commitments?from=2026-10-01&days=30`,
        headers: asAna,
      })
    ).json();

    expect(body.upcoming.items.map((item: { amountMinor: number }) => item.amountMinor)).toEqual([
      1_500,
    ]);
    expect(body.upcoming.invoices).toEqual([
      {
        cardId: expect.any(String),
        cardName: 'Nubank',
        referenceMonth: '2026-10',
        dueDate: '2026-10-13',
        amountMinor: 4_000,
      },
    ]);
    expect(body.upcoming.expenses).toBe(5_500);
  });

  it('subtracts open invoices due by the end of the month from the projection', async () => {
    const { spaceId, purchase } = await setUp();
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/balance-snapshots`,
      headers: asAna,
      payload: { amountMinor: 100_000, observedOn: '2026-09-30' },
    });
    await purchase({ amountMinor: 4_000 });
    await purchase({ amountMinor: 6_000, financialDate: '2026-10-10' });

    const projection = (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/dashboard?month=2026-10`,
        headers: asAna,
      })
    ).json().projection;

    expect(projection).toMatchObject({ amountMinor: 96_000, openInvoices: 4_000 });
  });
});
