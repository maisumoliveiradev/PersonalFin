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

interface CategoryItem {
  id: string;
  name: string;
  kind: string;
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

async function createSpace(headers: Record<string, string>, name = 'Pessoal') {
  const spaceId: string = (
    await server.inject({ method: 'POST', url: '/financial-spaces', headers, payload: { name } })
  ).json().id;
  const categories: CategoryItem[] = (
    await server.inject({ method: 'GET', url: `/financial-spaces/${spaceId}/categories`, headers })
  ).json().items;
  const byName = (name: string) => {
    const category = categories.find((item) => item.name === name);
    if (category === undefined) {
      throw new Error(`Missing category ${name}`);
    }
    return category;
  };
  return { spaceId, byName };
}

function postTransaction(headers: Record<string, string>, spaceId: string, payload: object) {
  return server.inject({
    method: 'POST',
    url: `/financial-spaces/${spaceId}/transactions`,
    headers,
    payload,
  });
}

describe('POST /financial-spaces/:spaceId/transactions', () => {
  it('creates an expense with subcategory, paid by default, in BRL', async () => {
    const { spaceId, byName } = await createSpace(asAna);
    const housing = byName('Moradia');
    const rent = housing.subcategories.find((item) => item.name === 'Aluguel');

    const response = await postTransaction(asAna, spaceId, {
      type: 'expense',
      description: '  Aluguel   de janeiro ',
      amountMinor: 185_000,
      financialDate: '2026-01-05',
      categoryId: housing.id,
      subcategoryId: rent?.id,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      type: 'expense',
      status: 'paid',
      description: 'Aluguel de janeiro',
      amountMinor: 185_000,
      currency: 'BRL',
      financialDate: '2026-01-05',
      category: { id: housing.id, name: 'Moradia' },
      subcategory: { id: rent?.id, name: 'Aluguel' },
    });
    expect(repositories.transactions.transactions[0]?.createdByUserId).toBe(
      '0f8fad5b-d9cb-469f-a165-70867728950e',
    );
  });

  it('creates a pending income without subcategory', async () => {
    const { spaceId, byName } = await createSpace(asAna);

    const response = await postTransaction(asAna, spaceId, {
      type: 'income',
      status: 'pending',
      description: 'Salário',
      amountMinor: 1,
      financialDate: '2026-12-31',
      categoryId: byName('Receitas').id,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      type: 'income',
      status: 'pending',
      amountMinor: 1,
      financialDate: '2026-12-31',
      subcategory: null,
    });
  });

  describe('input validation', () => {
    const valid = (categoryId: string) => ({
      type: 'expense',
      description: 'Mercado',
      amountMinor: 1000,
      financialDate: '2026-01-05',
      categoryId,
    });

    it.each([
      ['a zero amount', { amountMinor: 0 }],
      ['a negative amount', { amountMinor: -500 }],
      ['a fractional amount', { amountMinor: 10.5 }],
      ['an amount above the maximum', { amountMinor: 100_000_000_000 }],
      ['an amount sent as text', { amountMinor: '1000' }],
      ['an impossible date', { financialDate: '2026-02-30' }],
      ['a timestamp instead of a date', { financialDate: '2026-01-05T00:00:00Z' }],
      ['an empty description', { description: '   ' }],
      ['a description over 140 characters', { description: 'x'.repeat(141) }],
      ['an unknown type', { type: 'transfer' }],
      ['an unknown status', { status: 'cancelled' }],
      ['a currency override', { currency: 'USD' }],
      ['a malformed category id', { categoryId: 'food' }],
    ])('rejects %s', async (_case, override) => {
      const { spaceId, byName } = await createSpace(asAna);

      const response = await postTransaction(asAna, spaceId, {
        ...valid(byName('Alimentação').id),
        ...override,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_FAILED');
      expect(repositories.transactions.transactions).toHaveLength(0);
    });

    it.each(['type', 'description', 'amountMinor', 'financialDate', 'categoryId'])(
      'requires %s',
      async (field) => {
        const { spaceId, byName } = await createSpace(asAna);
        const payload: Record<string, unknown> = valid(byName('Alimentação').id);
        delete payload[field];

        const response = await postTransaction(asAna, spaceId, payload);

        expect(response.statusCode).toBe(400);
      },
    );
  });

  describe('category rules', () => {
    it('rejects a category from another space of the same user', async () => {
      const personal = await createSpace(asAna, 'Pessoal');
      const home = await createSpace(asAna, 'Casa');

      const response = await postTransaction(asAna, personal.spaceId, {
        type: 'expense',
        description: 'Mercado',
        amountMinor: 1000,
        financialDate: '2026-01-05',
        categoryId: home.byName('Alimentação').id,
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('CATEGORY_NOT_AVAILABLE');
    });

    it("rejects a category from another user's space", async () => {
      const ana = await createSpace(asAna);
      const bruno = await createSpace(asBruno);

      const response = await postTransaction(asAna, ana.spaceId, {
        type: 'expense',
        description: 'Mercado',
        amountMinor: 1000,
        financialDate: '2026-01-05',
        categoryId: bruno.byName('Alimentação').id,
      });

      expect(response.statusCode).toBe(422);
    });

    it('rejects an income category on an expense', async () => {
      const { spaceId, byName } = await createSpace(asAna);

      const response = await postTransaction(asAna, spaceId, {
        type: 'expense',
        description: 'Errado',
        amountMinor: 1000,
        financialDate: '2026-01-05',
        categoryId: byName('Receitas').id,
      });

      expect(response.statusCode).toBe(422);
    });

    it('rejects a subcategory used as the category', async () => {
      const { spaceId, byName } = await createSpace(asAna);

      const response = await postTransaction(asAna, spaceId, {
        type: 'expense',
        description: 'Aluguel',
        amountMinor: 1000,
        financialDate: '2026-01-05',
        categoryId: byName('Moradia').subcategories[0]?.id,
      });

      expect(response.statusCode).toBe(422);
    });

    it('rejects a subcategory that belongs to a different category', async () => {
      const { spaceId, byName } = await createSpace(asAna);

      const response = await postTransaction(asAna, spaceId, {
        type: 'expense',
        description: 'Mercado',
        amountMinor: 1000,
        financialDate: '2026-01-05',
        categoryId: byName('Alimentação').id,
        subcategoryId: byName('Moradia').subcategories[0]?.id,
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('access', () => {
    it('requires authentication', async () => {
      const { spaceId, byName } = await createSpace(asAna);

      const response = await server.inject({
        method: 'POST',
        url: `/financial-spaces/${spaceId}/transactions`,
        payload: {
          type: 'expense',
          description: 'Mercado',
          amountMinor: 1000,
          financialDate: '2026-01-05',
          categoryId: byName('Alimentação').id,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("cannot write into another user's space", async () => {
      const { spaceId, byName } = await createSpace(asAna);

      const response = await postTransaction(asBruno, spaceId, {
        type: 'expense',
        description: 'Intruso',
        amountMinor: 1000,
        financialDate: '2026-01-05',
        categoryId: byName('Alimentação').id,
      });

      expect(response.statusCode).toBe(404);
      expect(repositories.transactions.transactions).toHaveLength(0);
    });
  });
});

describe('POST /financial-spaces/:spaceId/transactions with a client id', () => {
  const clientId = '6f1c2b0e-8d4a-4c3b-9a55-2f7e1d0c9b11';

  async function offlinePayload() {
    const { spaceId, byName } = await createSpace(asAna);
    return {
      spaceId,
      payload: {
        id: clientId,
        type: 'expense',
        description: 'Padaria',
        amountMinor: 1250,
        financialDate: '2026-09-25',
        categoryId: byName('Alimentação').id,
      },
    };
  }

  it('creates the transaction with the id generated by the client', async () => {
    const { spaceId, payload } = await offlinePayload();
    const response = await postTransaction(asAna, spaceId, payload);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: clientId, description: 'Padaria' });
  });

  it('returns the existing transaction when the same request is replayed', async () => {
    const { spaceId, payload } = await offlinePayload();
    const first = await postTransaction(asAna, spaceId, payload);
    const replay = await postTransaction(asAna, spaceId, payload);

    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(first.json());
    const list = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
    });
    expect(list.json().items).toHaveLength(1);
  });

  it('rejects an id already used in another space', async () => {
    const { spaceId, payload } = await offlinePayload();
    await postTransaction(asAna, spaceId, payload);
    const { spaceId: brunoSpaceId, byName } = await createSpace(asBruno);

    const response = await postTransaction(asBruno, brunoSpaceId, {
      ...payload,
      categoryId: byName('Alimentação').id,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TRANSACTION_ID_CONFLICT');
  });

  it('rejects ids that are not UUIDs and ids on installment purchases', async () => {
    const { spaceId, payload } = await offlinePayload();
    const invalid = await postTransaction(asAna, spaceId, { ...payload, id: 'offline-1' });
    expect(invalid.statusCode).toBe(400);

    const installments = await postTransaction(asAna, spaceId, {
      ...payload,
      cardId: '1d8f5a53-6b8e-4f0e-9d0c-5a5f2f7a0b21',
      installments: 3,
    });
    expect(installments.statusCode).toBe(400);
  });
});
