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
  const add = (type: 'income' | 'expense', amountMinor: number, financialDate: string) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type,
        description: 'Lançamento',
        amountMinor,
        financialDate,
        categoryId: type === 'income' ? salary : food,
      },
    });
  const get = (path: string, headers = asAna) =>
    server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/analytics/${path}`,
      headers,
    });
  return { spaceId, add, get };
}

describe('evolution', () => {
  it('lists realized metrics and the month-end balance for every month', async () => {
    const { spaceId, add, get } = await setUp();
    await add('income', 500_000, '2026-08-05');
    await add('expense', 120_000, '2026-08-10');
    await add('expense', 30_000, '2026-10-01');
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/balance-snapshots`,
      headers: asAna,
      payload: { amountMinor: 380_000, observedOn: '2026-08-31' },
    });

    const body = (await get('evolution?fromMonth=2026-08&months=3')).json();

    expect(body.items).toEqual([
      {
        month: '2026-08',
        realizedIncome: 500_000,
        realizedExpenses: 120_000,
        realizedNet: 380_000,
        observedBalance: { amountMinor: 380_000, observedOn: '2026-08-31' },
      },
      {
        month: '2026-09',
        realizedIncome: 0,
        realizedExpenses: 0,
        realizedNet: 0,
        observedBalance: { amountMinor: 380_000, observedOn: '2026-08-31' },
      },
      {
        month: '2026-10',
        realizedIncome: 0,
        realizedExpenses: 30_000,
        realizedNet: -30_000,
        observedBalance: { amountMinor: 380_000, observedOn: '2026-08-31' },
      },
    ]);
  });

  it.each(['fromMonth=2026-13', 'fromMonth=2026-01&months=25', 'months=3'])(
    'rejects %s',
    async (query) => {
      const { get } = await setUp();

      expect((await get(`evolution?${query}`)).statusCode).toBe(400);
    },
  );
});

describe('comparison', () => {
  it('compares with the previous month and the same month a year earlier', async () => {
    const { add, get } = await setUp();
    await add('expense', 110_00, '2026-10-10');
    await add('expense', 100_00, '2026-09-10');
    await add('income', 300_00, '2026-10-05');

    const body = (await get('comparison?month=2026-10')).json();

    expect(body.previousMonth.month).toBe('2026-09');
    expect(body.previousYear.month).toBe('2025-10');
    expect(body.previousMonth.changes.realizedExpenses).toEqual({
      difference: 10_00,
      percentChangeTenths: 100,
    });
    expect(body.previousYear.changes.realizedIncome).toEqual({
      difference: 300_00,
      percentChangeTenths: null,
    });
    expect(body.current.realizedNet).toBe(190_00);
  });

  it("hides another user's analytics", async () => {
    const { get } = await setUp();

    expect((await get('comparison?month=2026-10', asBruno)).statusCode).toBe(404);
    expect((await get('evolution?fromMonth=2026-10', asBruno)).statusCode).toBe(404);
  });
});

describe('breakdown', () => {
  it('splits realized expenses by category and tag with exact shares', async () => {
    const { spaceId, get } = await setUp();
    const categories: {
      id: string;
      name: string;
      subcategories: { id: string; name: string }[];
    }[] = (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/categories`,
        headers: asAna,
      })
    ).json().items;
    const food = categories.find((category) => category.name === 'Alimentação');
    const housing = categories.find((category) => category.name === 'Moradia');
    const trip = (
      await server.inject({
        method: 'POST',
        url: `/financial-spaces/${spaceId}/tags`,
        headers: asAna,
        payload: { name: 'Viagem' },
      })
    ).json();
    const add = (payload: object) =>
      server.inject({
        method: 'POST',
        url: `/financial-spaces/${spaceId}/transactions`,
        headers: asAna,
        payload: { type: 'expense', description: 'Gasto', financialDate: '2026-10-05', ...payload },
      });
    await add({ amountMinor: 100, categoryId: food?.id, tagIds: [trip.id] });
    await add({
      amountMinor: 200,
      categoryId: food?.id,
      subcategoryId: food?.subcategories[0]?.id,
    });
    await add({ amountMinor: 300, categoryId: housing?.id, tagIds: [trip.id] });
    await add({ amountMinor: 50, categoryId: housing?.id, financialDate: '2026-09-20' });
    await add({ amountMinor: 999, categoryId: food?.id, status: 'pending' });

    const body = (await get('breakdown?fromMonth=2026-10&months=1')).json();

    expect(body).toMatchObject({
      fromMonth: '2026-10',
      throughMonth: '2026-10',
      previousFromMonth: '2026-09',
      totalMinor: 600,
      previousTotalMinor: 50,
    });
    expect(
      body.categories.map(
        (item: {
          name: string;
          amountMinor: number;
          shareTenths: number;
          previousAmountMinor: number;
        }) => [item.name, item.amountMinor, item.shareTenths, item.previousAmountMinor],
      ),
    ).toEqual([
      ['Moradia', 300, 500, 50],
      ['Alimentação', 300, 500, 0],
    ]);
    expect(body.categories[1].subcategories).toEqual([
      { id: food?.subcategories[0]?.id, name: food?.subcategories[0]?.name, amountMinor: 200 },
      { id: null, name: null, amountMinor: 100 },
    ]);
    expect(body.tags).toEqual([
      { id: trip.id, name: 'Viagem', amountMinor: 400, shareTenths: 667, previousAmountMinor: 0 },
    ]);
  });

  it('accepts only 1, 3, 6, or 12 months', async () => {
    const { get } = await setUp();

    expect((await get('breakdown?fromMonth=2026-10&months=2')).statusCode).toBe(400);
    expect((await get('breakdown?fromMonth=2026-10&months=12')).statusCode).toBe(200);
  });
});
