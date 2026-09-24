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

async function createSpace(headers: Record<string, string>, name = 'Pessoal') {
  const spaceId: string = (
    await server.inject({ method: 'POST', url: '/financial-spaces', headers, payload: { name } })
  ).json().id;
  const categories: { id: string; name: string }[] = (
    await server.inject({ method: 'GET', url: `/financial-spaces/${spaceId}/categories`, headers })
  ).json().items;
  const foodId = categories.find((category) => category.name === 'Alimentação')?.id;
  const addExpense = (description: string, financialDate: string, amountMinor = 1000) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers,
      payload: { type: 'expense', description, amountMinor, financialDate, categoryId: foodId },
    });
  return { spaceId, addExpense };
}

function list(headers: Record<string, string>, spaceId: string, query = '') {
  return server.inject({
    method: 'GET',
    url: `/financial-spaces/${spaceId}/transactions${query}`,
    headers,
  });
}

describe('GET /financial-spaces/:spaceId/transactions', () => {
  it('returns an empty list for a space without transactions', async () => {
    const { spaceId } = await createSpace(asAna);

    const response = await list(asAna, spaceId);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [], hasMore: false });
  });

  it('shows a newly created transaction with all displayed fields', async () => {
    const { spaceId, addExpense } = await createSpace(asAna);
    const created = (await addExpense('Mercado', '2026-01-05', 123_456)).json();

    const response = await list(asAna, spaceId);

    expect(response.json().items).toEqual([created]);
    expect(response.json().items[0]).toMatchObject({
      type: 'expense',
      description: 'Mercado',
      amountMinor: 123_456,
      currency: 'BRL',
      financialDate: '2026-01-05',
      status: 'paid',
      category: { name: 'Alimentação' },
    });
  });

  it('orders by financial date, newest first, then by creation', async () => {
    const { spaceId, addExpense } = await createSpace(asAna);
    await addExpense('Janeiro', '2026-01-10');
    await addExpense('Março', '2026-03-01');
    await addExpense('Janeiro, depois', '2026-01-10');

    const descriptions = (await list(asAna, spaceId))
      .json()
      .items.map((item: { description: string }) => item.description);

    expect(descriptions).toEqual(['Março', 'Janeiro, depois', 'Janeiro']);
  });

  it('never includes transactions from other spaces', async () => {
    const personal = await createSpace(asAna, 'Pessoal');
    const home = await createSpace(asAna, 'Casa');
    const bruno = await createSpace(asBruno, 'Bruno');
    await personal.addExpense('Pessoal', '2026-01-01');
    await home.addExpense('Casa', '2026-01-01');
    await bruno.addExpense('Bruno', '2026-01-01');

    const descriptions = (await list(asAna, personal.spaceId))
      .json()
      .items.map((item: { description: string }) => item.description);

    expect(descriptions).toEqual(['Pessoal']);
  });

  it("hides another user's space as not found", async () => {
    const { spaceId, addExpense } = await createSpace(asAna);
    await addExpense('Privado', '2026-01-01');

    const response = await list(asBruno, spaceId);

    expect(response.statusCode).toBe(404);
    expect(JSON.stringify(response.json())).not.toContain('Privado');
  });

  it('requires authentication', async () => {
    const { spaceId } = await createSpace(asAna);

    const response = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/transactions`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('limits the result and reports that more exist', async () => {
    const { spaceId, addExpense } = await createSpace(asAna);
    for (const day of ['01', '02', '03']) {
      await addExpense(`Dia ${day}`, `2026-01-${day}`);
    }

    const limited = (await list(asAna, spaceId, '?limit=2')).json();
    const complete = (await list(asAna, spaceId, '?limit=3')).json();

    expect(limited.items.map((item: { description: string }) => item.description)).toEqual([
      'Dia 03',
      'Dia 02',
    ]);
    expect(limited.hasMore).toBe(true);
    expect(complete.hasMore).toBe(false);
  });

  it.each(['0', '201', 'abc', '1.5'])('rejects limit=%s', async (limit) => {
    const { spaceId } = await createSpace(asAna);

    const response = await list(asAna, spaceId, `?limit=${limit}`);

    expect(response.statusCode).toBe(400);
  });
});
