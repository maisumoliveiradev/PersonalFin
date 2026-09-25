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
