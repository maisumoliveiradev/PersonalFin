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
  const categories: { id: string; name: string }[] = (
    await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/categories`,
      headers: asAna,
    })
  ).json().items;
  const food = categories.find((category) => category.name === 'Alimentação')?.id;
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
  const buy = (amountMinor: number) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Mercado',
        amountMinor,
        financialDate: '2026-10-02',
        categoryId: food,
        cardId: card.id,
      },
    });
  const invoiceUrl = `/financial-spaces/${spaceId}/cards/${card.id}/invoices/2026-10`;
  const pay = (amountMinor: number, headers = asAna) =>
    server.inject({
      method: 'POST',
      url: `${invoiceUrl}/payments`,
      headers,
      payload: { amountMinor, paidOn: '2026-10-13' },
    });
  const dashboard = async () =>
    (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/dashboard?month=2026-10`,
        headers: asAna,
      })
    ).json();
  return { spaceId, invoiceUrl, buy, pay, dashboard };
}

describe('invoice payments', () => {
  it('leaves the exact open amount after a partial payment', async () => {
    const { buy, pay } = await setUp();
    await buy(10_000);

    const response = await pay(3_333);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      totalMinor: 10_000,
      paidMinor: 3_333,
      outstandingMinor: 6_667,
      state: 'partially_paid',
      payments: [{ amountMinor: 3_333, paidOn: '2026-10-13' }],
    });
  });

  it('never records a payment as an expense and realizes purchases once paid', async () => {
    const { buy, pay, dashboard } = await setUp();
    await buy(10_000);

    await pay(4_000);
    const partial = await dashboard();
    await pay(6_000);
    const paid = await dashboard();

    expect(partial).toMatchObject({ realizedExpenses: 0, forecastExpenses: 10_000 });
    expect(paid).toMatchObject({ realizedExpenses: 10_000, forecastExpenses: 0 });
  });

  it('rejects payments above the open amount or on an empty invoice', async () => {
    const { buy, pay } = await setUp();

    const empty = await pay(1);
    await buy(10_000);
    const tooMuch = await pay(10_001);

    expect(empty.json().error.code).toBe('PAYMENT_EXCEEDS_OUTSTANDING');
    expect(tooMuch.statusCode).toBe(422);
  });

  it('removes a payment and reopens the invoice', async () => {
    const { invoiceUrl, buy, pay } = await setUp();
    await buy(10_000);
    const paymentId = (await pay(10_000)).json().payments[0].id;

    const removed = await server.inject({
      method: 'DELETE',
      url: `${invoiceUrl}/payments/${paymentId}`,
      headers: asAna,
    });
    const again = await server.inject({
      method: 'DELETE',
      url: `${invoiceUrl}/payments/${paymentId}`,
      headers: asAna,
    });

    expect(removed.json()).toMatchObject({ paidMinor: 0, state: 'open' });
    expect(again.json().error.code).toBe('INVOICE_PAYMENT_NOT_FOUND');
  });

  it('keeps installments of invoices with payments when cancelling', async () => {
    const { spaceId, invoiceUrl } = await setUp();
    const categories: { id: string; name: string }[] = (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/categories`,
        headers: asAna,
      })
    ).json().items;
    const cards = (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/cards`,
        headers: asAna,
      })
    ).json().items;
    const first = (
      await server.inject({
        method: 'POST',
        url: `/financial-spaces/${spaceId}/transactions`,
        headers: asAna,
        payload: {
          type: 'expense',
          description: 'TV',
          amountMinor: 30_000,
          financialDate: '2026-09-02',
          categoryId: categories.find((category) => category.name === 'Moradia')?.id,
          cardId: cards[0].id,
          installments: 3,
        },
      })
    ).json();
    await server.inject({
      method: 'POST',
      url: `${invoiceUrl}/payments`,
      headers: asAna,
      payload: { amountMinor: 1_000, paidOn: '2026-10-01' },
    });

    const cancelled = await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/installment-purchases/${first.installment.purchaseId}/cancel`,
      headers: asAna,
      payload: { afterMonth: '2026-09' },
    });

    expect(cancelled.json()).toEqual({ cancelled: 1 });
  });

  it("hides another user's invoice payments", async () => {
    const { buy, pay } = await setUp();
    await buy(10_000);

    expect((await pay(1_000, asBruno)).statusCode).toBe(404);
  });
});
