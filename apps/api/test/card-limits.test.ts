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
  const buy = (payload: object) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Compra',
        amountMinor: 10_000,
        financialDate: '2026-10-02',
        categoryId: food,
        cardId: card.id,
        ...payload,
      },
    });
  const limits = async (on: string, headers = asAna) =>
    server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/card-limits?on=${on}`,
      headers,
    });
  return { spaceId, card, buy, limits };
}

describe('card limits', () => {
  it('counts future installments as used and subtracts payments', async () => {
    const { spaceId, card, buy, limits } = await setUp();
    await buy({ amountMinor: 120_000, installments: 12 });
    await buy({ amountMinor: 30_000 });
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/cards/${card.id}/invoices/2026-10/payments`,
      headers: asAna,
      payload: { amountMinor: 5_000, paidOn: '2026-10-10' },
    });

    const body = (await limits('2026-10-15')).json();

    expect(body.items).toEqual([
      {
        cardId: card.id,
        currentLimitMinor: 500_000,
        usedMinor: 145_000,
        availableMinor: 355_000,
      },
    ]);
  });

  it('uses the limit effective on the date and allows a negative available limit', async () => {
    const { spaceId, card, buy, limits } = await setUp();
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/cards/${card.id}/limit-changes`,
      headers: asAna,
      payload: { amountMinor: 5_000, effectiveFrom: '2026-10-01' },
    });
    await buy({});

    expect((await limits('2026-09-30')).json().items[0].availableMinor).toBe(490_000);
    expect((await limits('2026-10-01')).json().items[0].availableMinor).toBe(-5_000);
    expect((await limits('2025-12-31')).json().items[0]).toMatchObject({
      currentLimitMinor: null,
      availableMinor: null,
    });
  });

  it('rejects a missing date and hides other users', async () => {
    const { spaceId, limits } = await setUp();

    const missing = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/card-limits`,
      headers: asAna,
    });

    expect(missing.statusCode).toBe(400);
    expect((await limits('2026-10-01', asBruno)).statusCode).toBe(404);
  });
});

describe('card invoice summary', () => {
  it('lists every month with totals and states', async () => {
    const { spaceId, card, buy } = await setUp();
    await buy({ amountMinor: 30_000, installments: 3 });

    const response = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/cards/${card.id}/invoices?fromMonth=2026-09&months=5`,
      headers: asAna,
    });

    expect(
      response
        .json()
        .items.map((item: { referenceMonth: string; totalMinor: number; state: string }) => [
          item.referenceMonth,
          item.totalMinor,
          item.state,
        ]),
    ).toEqual([
      ['2026-09', 0, 'empty'],
      ['2026-10', 10_000, 'open'],
      ['2026-11', 10_000, 'open'],
      ['2026-12', 10_000, 'open'],
      ['2027-01', 0, 'empty'],
    ]);
  });

  it('rejects too many months and unknown cards', async () => {
    const { spaceId, card } = await setUp();
    const get = (cardId: string, query: string) =>
      server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/cards/${cardId}/invoices?${query}`,
        headers: asAna,
      });

    expect((await get(card.id, 'fromMonth=2026-01&months=25')).statusCode).toBe(400);
    expect(
      (await get('00000000-0000-4000-8000-000000000000', 'fromMonth=2026-01')).statusCode,
    ).toBe(404);
  });
});
