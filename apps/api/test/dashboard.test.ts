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

describe('GET /financial-spaces/:spaceId/dashboard', () => {
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
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Mercado',
        amountMinor: 4_321,
        financialDate: '2026-02-10',
        categoryId: food,
      },
    });
    return (month: string, headers = asAna) =>
      server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/dashboard?month=${month}`,
        headers,
      });
  }

  it('returns the month metrics', async () => {
    const dashboard = await setUp();

    const body = (await dashboard('2026-02')).json();

    expect(body).toMatchObject({
      month: '2026-02',
      realizedExpenses: 4_321,
      realizedNet: -4_321,
      realizedExpensesByCategory: [{ name: 'Alimentação', amountMinor: 4_321 }],
      observedBalance: null,
    });
  });

  it.each(['', '2026-13', '2026-2'])('rejects month=%j', async (month) => {
    const dashboard = await setUp();

    expect((await dashboard(month)).statusCode).toBe(400);
  });

  it("hides another user's dashboard", async () => {
    const dashboard = await setUp();

    expect((await dashboard('2026-02', asBruno)).statusCode).toBe(404);
  });
});
