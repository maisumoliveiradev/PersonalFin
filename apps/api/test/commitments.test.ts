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
  const id = (name: string) => categories.find((category) => category.name === name)?.id;
  const add = (payload: object) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload,
    });
  const get = (query: string, headers = asAna) =>
    server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/commitments?${query}`,
      headers,
    });
  return { id, add, get };
}

describe('GET /financial-spaces/:spaceId/commitments', () => {
  it('splits pending items into overdue and upcoming with exact totals', async () => {
    const { id, add, get } = await setUp();
    const expense = (
      description: string,
      financialDate: string,
      amountMinor: number,
      status = 'pending',
    ) =>
      add({
        type: 'expense',
        status,
        description,
        amountMinor,
        financialDate,
        categoryId: id('Moradia'),
      });
    await expense('Atrasada', '2026-09-20', 1_000);
    await expense('Hoje', '2026-09-24', 2_000);
    await expense('Último dia', '2026-10-23', 3_000);
    await expense('Fora do período', '2026-10-24', 4_000);
    await expense('Paga', '2026-09-25', 5_000, 'paid');
    await add({
      type: 'income',
      status: 'pending',
      description: 'Freela',
      amountMinor: 90_000,
      financialDate: '2026-10-01',
      categoryId: id('Receitas'),
    });

    const body = (await get('from=2026-09-24&days=30')).json();

    expect(body.from).toBe('2026-09-24');
    expect(body.through).toBe('2026-10-23');
    expect(body.overdue).toMatchObject({ income: 0, expenses: 1_000, hasMore: false });
    expect(body.overdue.items.map((item: { description: string }) => item.description)).toEqual([
      'Atrasada',
    ]);
    expect(body.upcoming).toMatchObject({ income: 90_000, expenses: 5_000 });
    expect(body.upcoming.items.map((item: { description: string }) => item.description)).toEqual([
      'Hoje',
      'Freela',
      'Último dia',
    ]);
  });

  it.each(['', 'from=2026-02-30', 'from=2026-09-24&days=6', 'from=2026-09-24&days=366'])(
    'rejects %j',
    async (query) => {
      const { get } = await setUp();

      expect((await get(query)).statusCode).toBe(400);
    },
  );

  it("hides another user's commitments", async () => {
    const { get } = await setUp();

    expect((await get('from=2026-09-24', asBruno)).statusCode).toBe(404);
  });
});
