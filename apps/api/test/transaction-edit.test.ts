import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildTestServer,
  createInMemoryRepositories,
  sessionCookie,
} from './support/test-server.ts';
import { ana, sessions } from './support/users.ts';

let repositories = createInMemoryRepositories();
let server = buildTestServer({ sessions, repositories });
const asAna = { cookie: sessionCookie('ana-token') };
const asBruno = { cookie: sessionCookie('bruno-token') };

interface CategoryItem {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

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
  const categories: CategoryItem[] = (
    await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/categories`,
      headers: asAna,
    })
  ).json().items;
  const byName = (name: string) => {
    const category = categories.find((item) => item.name === name);
    if (category === undefined) {
      throw new Error(`Missing ${name}`);
    }
    return category;
  };
  const created = (
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Mercado',
        amountMinor: 1000,
        financialDate: '2026-01-05',
        categoryId: byName('Alimentação').id,
        subcategoryId: byName('Alimentação').subcategories[0]?.id,
      },
    })
  ).json();
  const url = `/financial-spaces/${spaceId}/transactions/${created.id}`;
  const patch = (payload: object, headers = asAna) =>
    server.inject({ method: 'PATCH', url, headers, payload });
  return { spaceId, byName, created, url, patch };
}

describe('GET /financial-spaces/:spaceId/transactions/:transactionId', () => {
  it('returns the transaction with its version', async () => {
    const { url, created } = await setUp();

    const response = await server.inject({ method: 'GET', url, headers: asAna });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ...created, version: 1 });
  });

  it.each(['00000000-0000-4000-8000-000000000000', 'not-a-uuid'])(
    'returns 404 for unknown id %s',
    async (id) => {
      const { spaceId } = await setUp();

      const response = await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/transactions/${id}`,
        headers: asAna,
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('TRANSACTION_NOT_FOUND');
    },
  );
});

describe('PATCH /financial-spaces/:spaceId/transactions/:transactionId', () => {
  it('edits fields, increments the version, and records one audit event', async () => {
    const { patch, created } = await setUp();

    const response = await patch({
      version: 1,
      description: 'Mercado do mês',
      amountMinor: 2550,
      financialDate: '2026-01-06',
      status: 'pending',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      description: 'Mercado do mês',
      amountMinor: 2550,
      financialDate: '2026-01-06',
      status: 'pending',
      version: 2,
    });
    expect(repositories.audit.events).toHaveLength(1);
    expect(repositories.audit.events[0]).toMatchObject({
      entityType: 'financial_transaction',
      entityId: created.id,
      action: 'update',
      actorUserId: ana.id,
      changes: {
        description: { before: 'Mercado', after: 'Mercado do mês' },
        amountMinor: { before: 1000, after: 2550 },
        financialDate: { before: '2026-01-05', after: '2026-01-06' },
        status: { before: 'paid', after: 'pending' },
      },
    });
  });

  it('accepts a no-op edit without a new version or audit event', async () => {
    const { patch } = await setUp();

    const response = await patch({ version: 1, description: 'Mercado', amountMinor: 1000 });

    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBe(1);
    expect(repositories.audit.events).toHaveLength(0);
  });

  it('rejects a stale version instead of overwriting', async () => {
    const { patch } = await setUp();
    await patch({ version: 1, description: 'Primeira edição' });

    const response = await patch({ version: 1, description: 'Edição concorrente' });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('VERSION_CONFLICT');
  });

  it('changes type together with a category of the new kind', async () => {
    const { patch, byName } = await setUp();

    const response = await patch({
      version: 1,
      type: 'income',
      categoryId: byName('Receitas').id,
      subcategoryId: null,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ type: 'income', category: { name: 'Receitas' } });
  });

  it('rejects a type change that keeps a category of the old kind', async () => {
    const { patch } = await setUp();

    const response = await patch({ version: 1, type: 'income' });

    expect(response.statusCode).toBe(422);
    expect(repositories.audit.events).toHaveLength(0);
  });

  it('rejects a new category that keeps a subcategory of the old one', async () => {
    const { patch, byName } = await setUp();

    const response = await patch({ version: 1, categoryId: byName('Moradia').id });

    expect(response.statusCode).toBe(422);
  });

  it.each([
    ['a zero amount', { amountMinor: 0 }],
    ['an impossible date', { financialDate: '2026-02-30' }],
    ['an empty description', { description: ' ' }],
    ['a currency change', { currency: 'USD' }],
    ['a missing version', { version: undefined, description: 'x' }],
  ])('rejects %s', async (_case, override) => {
    const { patch } = await setUp();

    const response = await patch({ version: 1, ...override });

    expect(response.statusCode).toBe(400);
  });

  it('does not let another user edit the transaction', async () => {
    const { patch } = await setUp();

    const response = await patch({ version: 1, description: 'Invasão' }, asBruno);

    expect(response.statusCode).toBe(404);
    expect(repositories.audit.events).toHaveLength(0);
  });
});
