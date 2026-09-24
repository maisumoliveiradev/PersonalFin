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
  const categoryId = (name: string) => categories.find((category) => category.name === name)?.id;
  const add = (
    description: string,
    financialDate: string,
    type = 'expense',
    category = 'Alimentação',
  ) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type,
        description,
        amountMinor: 100,
        financialDate,
        categoryId: categoryId(category),
      },
    });
  const list = (query: string) =>
    server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/transactions?${query}`,
      headers: asAna,
    });
  return { add, list, categoryId };
}

describe('GET transactions with filters', () => {
  it('filters by month and follows the cursor to the next page', async () => {
    const { add, list } = await setUp();
    await add('Janeiro', '2026-01-10');
    await add('Fevereiro 1', '2026-02-10');
    await add('Fevereiro 2', '2026-02-11');
    await add('Março', '2026-03-01');

    const first = (await list('month=2026-02&limit=1')).json();
    const second = (await list(`month=2026-02&limit=1&cursor=${first.nextCursor}`)).json();

    expect(first.items.map((item: { description: string }) => item.description)).toEqual([
      'Fevereiro 2',
    ]);
    expect(first.hasMore).toBe(true);
    expect(second.items.map((item: { description: string }) => item.description)).toEqual([
      'Fevereiro 1',
    ]);
    expect(second).toMatchObject({ hasMore: false, nextCursor: null });
  });

  it('filters by text, type, and category', async () => {
    const { add, list, categoryId } = await setUp();
    await add('Padaria São João', '2026-02-10');
    await add('Salário', '2026-02-05', 'income', 'Receitas');

    expect((await list('q=sao%20joao')).json().items).toHaveLength(1);
    expect((await list('type=income')).json().items[0].description).toBe('Salário');
    expect((await list(`categoryId=${categoryId('Receitas')}`)).json().items).toHaveLength(1);
  });

  it.each([
    'month=2026-13',
    'month=2026-2',
    'type=transfer',
    'status=done',
    'q=',
    'categoryId=food',
    'cursor=@@@',
  ])('rejects %s', async (query) => {
    const { list } = await setUp();

    expect((await list(query)).statusCode).toBe(400);
  });
});
