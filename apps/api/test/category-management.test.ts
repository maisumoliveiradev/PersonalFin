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

interface TreeItem {
  id: string;
  name: string;
  kind: string;
  archived: boolean;
  version: number;
  subcategories: { id: string; name: string; archived: boolean; version: number }[];
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
  const base = `/financial-spaces/${spaceId}`;
  const tree = async (): Promise<TreeItem[]> =>
    (await server.inject({ method: 'GET', url: `${base}/categories`, headers: asAna })).json()
      .items;
  const byName = async (name: string) => {
    const item = (await tree()).find((category) => category.name === name);
    if (item === undefined) {
      throw new Error(`Missing ${name}`);
    }
    return item;
  };
  return {
    spaceId,
    tree,
    byName,
    create: (payload: object, headers = asAna) =>
      server.inject({ method: 'POST', url: `${base}/categories`, headers, payload }),
    patch: (id: string, payload: object, headers = asAna) =>
      server.inject({ method: 'PATCH', url: `${base}/categories/${id}`, headers, payload }),
    remove: (id: string, version: number, headers = asAna) =>
      server.inject({
        method: 'DELETE',
        url: `${base}/categories/${id}?version=${version}`,
        headers,
      }),
    addTransaction: (payload: object) =>
      server.inject({ method: 'POST', url: `${base}/transactions`, headers: asAna, payload }),
    editTransaction: (id: string, payload: object) =>
      server.inject({
        method: 'PATCH',
        url: `${base}/transactions/${id}`,
        headers: asAna,
        payload,
      }),
    deleteTransaction: (id: string, version: number) =>
      server.inject({
        method: 'DELETE',
        url: `${base}/transactions/${id}?version=${version}`,
        headers: asAna,
      }),
  };
}

const expense = (categoryId: string) => ({
  type: 'expense',
  description: 'Ração',
  amountMinor: 5000,
  financialDate: '2026-02-01',
  categoryId,
});

describe('creating categories', () => {
  it('creates a top-level category of the given kind and audits it', async () => {
    const { create, tree } = await setUp();

    const response = await create({ name: '  Pets ', kind: 'expense' });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: 'Pets',
      kind: 'expense',
      parentCategoryId: null,
      archived: false,
      version: 1,
    });
    expect((await tree()).at(-1)?.name).toBe('Pets');
    expect(repositories.audit.events.at(-1)).toMatchObject({
      entityType: 'category',
      action: 'create',
    });
  });

  it('creates a subcategory that inherits the parent kind', async () => {
    const { create, byName } = await setUp();
    const income = await byName('Receitas');

    const response = await create({ name: 'Bônus', parentCategoryId: income.id });

    expect(response.json()).toMatchObject({ kind: 'income', parentCategoryId: income.id });
    expect((await byName('Receitas')).subcategories.map((item) => item.name)).toContain('Bônus');
  });

  it('requires kind for top-level categories', async () => {
    const { create } = await setUp();

    expect((await create({ name: 'Sem tipo' })).statusCode).toBe(400);
  });

  it.each(['kind mismatch', 'subcategory as parent', 'archived parent'])(
    'rejects a %s',
    async (scenario) => {
      const { create, byName, patch } = await setUp();
      const housing = await byName('Moradia');
      let payload: object = { name: 'Nova', parentCategoryId: housing.id, kind: 'income' };
      if (scenario === 'subcategory as parent') {
        payload = { name: 'Nova', parentCategoryId: housing.subcategories[0]?.id };
      }
      if (scenario === 'archived parent') {
        await patch(housing.id, { version: 1, archived: true });
        payload = { name: 'Nova', parentCategoryId: housing.id };
      }

      const response = await create(payload);

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('PARENT_CATEGORY_NOT_AVAILABLE');
    },
  );

  it('rejects a duplicate sibling name', async () => {
    const { create } = await setUp();

    const response = await create({ name: 'Moradia', kind: 'expense' });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CATEGORY_NAME_TAKEN');
  });
});

describe('renaming and archiving', () => {
  it('renames a category and existing transactions show the new name', async () => {
    const { byName, patch, addTransaction } = await setUp();
    const leisure = await byName('Lazer');
    const created = (await addTransaction(expense(leisure.id))).json();

    const response = await patch(leisure.id, { version: 1, name: 'Diversão' });

    expect(response.json()).toMatchObject({ name: 'Diversão', version: 2 });
    expect(repositories.transactions.transactions[0]?.category.id).toBe(created.category.id);
    expect(repositories.audit.events.at(-1)?.changes).toEqual({
      name: { before: 'Lazer', after: 'Diversão' },
    });
  });

  it('keeps archived categories on existing transactions but blocks new use', async () => {
    const { byName, patch, addTransaction, editTransaction, tree } = await setUp();
    const leisure = await byName('Lazer');
    const food = await byName('Alimentação');
    const existing = (await addTransaction(expense(leisure.id))).json();

    await patch(leisure.id, { version: 1, archived: true });

    expect((await tree()).find((item) => item.id === leisure.id)?.archived).toBe(true);
    const newUse = await addTransaction(expense(leisure.id));
    expect(newUse.statusCode).toBe(422);
    const keepArchived = await editTransaction(existing.id, { version: 1, amountMinor: 6000 });
    expect(keepArchived.statusCode).toBe(200);
    const other = (await addTransaction(expense(food.id))).json();
    const switchToArchived = await editTransaction(other.id, {
      version: 1,
      categoryId: leisure.id,
    });
    expect(switchToArchived.statusCode).toBe(422);
  });

  it('unarchives a category', async () => {
    const { byName, patch, addTransaction } = await setUp();
    const leisure = await byName('Lazer');
    await patch(leisure.id, { version: 1, archived: true });

    await patch(leisure.id, { version: 2, archived: false });

    expect((await addTransaction(expense(leisure.id))).statusCode).toBe(201);
  });

  it('rejects a stale version and another user', async () => {
    const { byName, patch } = await setUp();
    const leisure = await byName('Lazer');

    expect((await patch(leisure.id, { version: 5, name: 'X' })).json().error.code).toBe(
      'VERSION_CONFLICT',
    );
    expect((await patch(leisure.id, { version: 1, name: 'X' }, asBruno)).statusCode).toBe(404);
  });
});

describe('deleting categories', () => {
  it('permanently deletes a never-used category', async () => {
    const { create, remove, tree } = await setUp();
    const pets = (await create({ name: 'Pets', kind: 'expense' })).json();

    const response = await remove(pets.id, 1);

    expect(response.statusCode).toBe(204);
    expect((await tree()).some((item) => item.id === pets.id)).toBe(false);
    expect(repositories.audit.events.at(-1)).toMatchObject({ action: 'delete', entityId: pets.id });
  });

  it('refuses to delete a category used by a deleted transaction', async () => {
    const { create, remove, addTransaction, deleteTransaction } = await setUp();
    const pets = (await create({ name: 'Pets', kind: 'expense' })).json();
    const used = (await addTransaction(expense(pets.id))).json();
    await deleteTransaction(used.id, 1);

    const response = await remove(pets.id, 1);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CATEGORY_IN_USE');
  });

  it('refuses to delete a category that still has subcategories', async () => {
    const { byName, remove } = await setUp();
    const housing = await byName('Moradia');

    const response = await remove(housing.id, 1);

    expect(response.json().error.code).toBe('CATEGORY_HAS_SUBCATEGORIES');
  });
});
