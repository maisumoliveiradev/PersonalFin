import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { buildCategoryTree, type Category } from '../src/modules/categories/category.ts';
import { DEFAULT_CATEGORY_CATALOG } from '../src/modules/categories/default-category-catalog.ts';
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

async function createSpace(headers: Record<string, string>, name: string): Promise<string> {
  const response = await server.inject({
    method: 'POST',
    url: '/financial-spaces',
    headers,
    payload: { name },
  });
  return response.json().id;
}

function listCategories(headers: Record<string, string>, spaceId: string) {
  return server.inject({ method: 'GET', url: `/financial-spaces/${spaceId}/categories`, headers });
}

describe('default category catalog', () => {
  it('has unique keys and concise, trimmed names', () => {
    const keys = DEFAULT_CATEGORY_CATALOG.flatMap((category) => [
      category.key,
      ...category.subcategories.map((subcategory) => subcategory.key),
    ]);
    const names = DEFAULT_CATEGORY_CATALOG.flatMap((category) => [
      category.name,
      ...category.subcategories.map((subcategory) => subcategory.name),
    ]);

    expect(new Set(keys).size).toBe(keys.length);
    for (const name of names) {
      expect(name).toBe(name.trim());
      expect(name.length).toBeGreaterThan(0);
      expect(name.length).toBeLessThanOrEqual(60);
    }
  });

  it('keys each subcategory under its parent key', () => {
    for (const category of DEFAULT_CATEGORY_CATALOG) {
      for (const subcategory of category.subcategories) {
        expect(subcategory.key.startsWith(`${category.key}.`)).toBe(true);
      }
    }
  });

  it('offers categories for both expenses and income', () => {
    const kinds = new Set(DEFAULT_CATEGORY_CATALOG.map((category) => category.kind));

    expect(kinds).toEqual(new Set(['expense', 'income']));
  });
});

describe('buildCategoryTree', () => {
  it('nests subcategories under their parents ordered by position', () => {
    const base = {
      financialSpaceId: 's',
      kind: 'expense' as const,
      defaultKey: null,
      archivedAt: null,
      version: 1,
    };
    const categories: Category[] = [
      { ...base, id: 'b', parentCategoryId: null, name: 'B', position: 1 },
      { ...base, id: 'a2', parentCategoryId: 'a', name: 'A2', position: 1 },
      { ...base, id: 'a', parentCategoryId: null, name: 'A', position: 0 },
      { ...base, id: 'a1', parentCategoryId: 'a', name: 'A1', position: 0 },
    ];

    const tree = buildCategoryTree(categories);

    expect(tree.map((node) => node.category.id)).toEqual(['a', 'b']);
    expect(tree[0]?.subcategories.map((category) => category.id)).toEqual(['a1', 'a2']);
    expect(tree[1]?.subcategories).toEqual([]);
  });
});

describe('GET /financial-spaces/:spaceId/categories', () => {
  it('returns the default catalog for a new space', async () => {
    const spaceId = await createSpace(asAna, 'Pessoal');

    const response = await listCategories(asAna, spaceId);

    expect(response.statusCode).toBe(200);
    const items = response.json().items;
    expect(items.map((item: { name: string }) => item.name)).toEqual(
      DEFAULT_CATEGORY_CATALOG.map((category) => category.name),
    );
    expect(items.find((item: { name: string }) => item.name === 'Receitas')).toMatchObject({
      kind: 'income',
      subcategories: [{ name: 'Salário' }, { name: 'Renda extra' }, { name: 'Rendimentos' }],
    });
  });

  it('gives each space its own categories', async () => {
    const personal = await createSpace(asAna, 'Pessoal');
    const home = await createSpace(asAna, 'Casa');

    const personalIds = (await listCategories(asAna, personal))
      .json()
      .items.map((item: { id: string }) => item.id);
    const homeIds = (await listCategories(asAna, home))
      .json()
      .items.map((item: { id: string }) => item.id);

    expect(personalIds.filter((id: string) => homeIds.includes(id))).toEqual([]);
  });

  it("does not reveal another user's categories", async () => {
    const spaceId = await createSpace(asAna, 'Pessoal');

    const response = await listCategories(asBruno, spaceId);

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('FINANCIAL_SPACE_NOT_FOUND');
  });

  it('requires authentication', async () => {
    const spaceId = await createSpace(asAna, 'Pessoal');

    const response = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/categories`,
    });

    expect(response.statusCode).toBe(401);
  });
});
