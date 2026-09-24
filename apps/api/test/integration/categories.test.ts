import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { DEFAULT_CATEGORY_CATALOG } from '../../src/modules/categories/default-category-catalog.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createMigratedTestPool } from './database.ts';
import { insertUser } from './fixtures.ts';

let pool: DatabasePool;
let data: DataAccess;

const catalogSize = DEFAULT_CATEGORY_CATALOG.reduce(
  (total, category) => total + 1 + category.subcategories.length,
  0,
);

beforeAll(async () => {
  pool = await createMigratedTestPool();
  data = createPostgresDataAccess(pool);
});

afterAll(async () => {
  await pool.end();
});

async function countCategories(spaceId: string): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM category WHERE financial_space_id = $1',
    [spaceId],
  );
  return rows[0]?.count ?? 0;
}

async function newSpace(): Promise<string> {
  const owner = await insertUser(pool, `${randomUUID()}@example.com`);
  const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: owner });
  return space.id;
}

describe('default category seeding', () => {
  it('seeds the full catalog when a space is created', async () => {
    const spaceId = await newSpace();

    expect(await countCategories(spaceId)).toBe(catalogSize);
  });

  it('is idempotent: seeding again adds nothing', async () => {
    const spaceId = await newSpace();

    const seededAgain = await data.transaction((repositories) =>
      repositories.categories.seedDefaults(spaceId, DEFAULT_CATEGORY_CATALOG),
    );

    expect(seededAgain).toBe(false);
    expect(await countCategories(spaceId)).toBe(catalogSize);
  });

  it('seeds exactly once under concurrent attempts', async () => {
    const owner = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await data.repositories.financialSpaces.create({
      id: randomUUID(),
      name: 'Concorrente',
      ownerUserId: owner,
    });

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        data.transaction((repositories) =>
          repositories.categories.seedDefaults(space.id, DEFAULT_CATEGORY_CATALOG),
        ),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await countCategories(space.id)).toBe(catalogSize);
  });

  it('rolls back the space when the creation transaction fails', async () => {
    const owner = await insertUser(pool, `${randomUUID()}@example.com`);
    const spaceId = randomUUID();

    await expect(
      data.transaction(async (repositories) => {
        await repositories.financialSpaces.create({
          id: spaceId,
          name: 'Falha',
          ownerUserId: owner,
        });
        throw new Error('seed failed');
      }),
    ).rejects.toThrow('seed failed');

    const { rowCount } = await pool.query('SELECT 1 FROM financial_space WHERE id = $1', [spaceId]);
    expect(rowCount).toBe(0);
  });
});

describe('category integrity constraints', () => {
  async function insertCategory(values: {
    spaceId: string;
    parentId?: string | null;
    kind?: string;
    name?: string;
  }) {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO category (id, financial_space_id, parent_category_id, kind, name, position)
       VALUES ($1, $2, $3, $4, $5, 0)`,
      [
        id,
        values.spaceId,
        values.parentId ?? null,
        values.kind ?? 'expense',
        values.name ?? randomUUID().slice(0, 8),
      ],
    );
    return id;
  }

  it('rejects a subcategory whose parent belongs to another space', async () => {
    const parent = await insertCategory({ spaceId: await newSpace() });

    await expect(insertCategory({ spaceId: await newSpace(), parentId: parent })).rejects.toThrow(
      /foreign key/,
    );
  });

  it('rejects a subcategory with a different kind than its parent', async () => {
    const spaceId = await newSpace();
    const parent = await insertCategory({ spaceId, kind: 'expense' });

    await expect(insertCategory({ spaceId, parentId: parent, kind: 'income' })).rejects.toThrow(
      /foreign key/,
    );
  });

  it('rejects a third level of nesting', async () => {
    const spaceId = await newSpace();
    const parent = await insertCategory({ spaceId });
    const child = await insertCategory({ spaceId, parentId: parent });

    await expect(insertCategory({ spaceId, parentId: child })).rejects.toThrow(
      /cannot have subcategories/,
    );
  });

  it('rejects duplicate sibling names', async () => {
    const spaceId = await newSpace();
    await insertCategory({ spaceId, name: 'Pets' });

    await expect(insertCategory({ spaceId, name: 'Pets' })).rejects.toThrow(
      /category_sibling_name_unique/,
    );
  });
});
