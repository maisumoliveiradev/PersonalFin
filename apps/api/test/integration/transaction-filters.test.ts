import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import type { Category } from '../../src/modules/categories/category.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
import {
  InvalidCursorError,
  type TransactionListQuery,
} from '../../src/modules/transactions/transaction-repository.ts';
import { createMigratedTestPool } from './database.ts';
import { insertUser } from './fixtures.ts';

let pool: DatabasePool;
let data: DataAccess;
let spaceId: string;
let otherSpaceId: string;
let categories: Category[];

const byKey = (key: string) => {
  const category = categories.find((candidate) => candidate.defaultKey === key);
  if (category === undefined) {
    throw new Error(`Missing ${key}`);
  }
  return category;
};

beforeAll(async () => {
  pool = await createMigratedTestPool();
  data = createPostgresDataAccess(pool);
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  spaceId = (await createFinancialSpace(data, { name: 'Filtros', ownerUserId: userId })).id;
  otherSpaceId = (await createFinancialSpace(data, { name: 'Outro', ownerUserId: userId })).id;
  categories = await data.repositories.categories.listForSpace(spaceId);
  const otherFood = (await data.repositories.categories.listForSpace(otherSpaceId)).find(
    (category) => category.defaultKey === 'food',
  );
  const add = (
    description: string,
    financialDate: string,
    overrides: {
      type?: 'expense' | 'income';
      status?: 'paid' | 'pending';
      key?: string;
      sub?: string;
    } = {},
  ) =>
    createTransaction(data, {
      financialSpaceId: spaceId,
      createdByUserId: userId,
      type: overrides.type ?? 'expense',
      status: overrides.status ?? 'paid',
      description,
      amountMinor: 1000,
      financialDate,
      categoryId: byKey(overrides.key ?? 'food').id,
      subcategoryId: overrides.sub === undefined ? null : byKey(overrides.sub).id,
    });
  await add('Padaria São João', '2026-01-31');
  await add('Supermercado', '2026-02-01', { sub: 'food.groceries' });
  await add('Café 100% arábica', '2026-02-15', { status: 'pending' });
  await add('Salário', '2026-02-28', { type: 'income', key: 'income' });
  await add('Aluguel', '2026-03-01', { key: 'housing', sub: 'housing.rent' });
  for (let index = 0; index < 7; index += 1) {
    await add(`Mesmo dia ${index}`, '2026-04-10');
  }
  await createTransaction(data, {
    financialSpaceId: otherSpaceId,
    createdByUserId: userId,
    type: 'expense',
    status: 'paid',
    description: 'Padaria de outro espaço',
    amountMinor: 1000,
    financialDate: '2026-02-10',
    categoryId: otherFood?.id ?? '',
    subcategoryId: null,
  });
});

afterAll(async () => {
  await pool.end();
});

async function descriptions(overrides: Partial<TransactionListQuery>) {
  const page = await data.repositories.transactions.list({
    financialSpaceId: spaceId,
    state: 'active',
    limit: 50,
    cursor: null,
    ...overrides,
  });
  return page.items.map((item) => item.description);
}

describe('transaction filters in PostgreSQL', () => {
  it('limits to the calendar month using financial dates, inclusive of month ends', async () => {
    expect(
      await descriptions({ range: { start: '2026-02-01', endExclusive: '2026-03-01' } }),
    ).toEqual(['Salário', 'Café 100% arábica', 'Supermercado']);
  });

  it('filters by type, status, and category including subcategories', async () => {
    expect(await descriptions({ type: 'income' })).toEqual(['Salário']);
    expect(await descriptions({ status: 'pending' })).toEqual(['Café 100% arábica']);
    expect(await descriptions({ categoryId: byKey('housing').id })).toEqual(['Aluguel']);
    expect(await descriptions({ categoryId: byKey('food.groceries').id })).toEqual([
      'Supermercado',
    ]);
  });

  it('searches descriptions ignoring case and accents', async () => {
    expect(await descriptions({ text: 'SAO JOAO' })).toEqual(['Padaria São João']);
    expect(await descriptions({ text: 'salario' })).toEqual(['Salário']);
  });

  it('treats LIKE wildcards in the search text literally', async () => {
    expect(await descriptions({ text: '100%' })).toEqual(['Café 100% arábica']);
    expect(await descriptions({ text: '%' })).toEqual(['Café 100% arábica']);
    expect(await descriptions({ text: '_' })).toEqual([]);
  });

  it('combines filters and never includes other spaces', async () => {
    expect(
      await descriptions({
        range: { start: '2026-02-01', endExclusive: '2026-03-01' },
        type: 'expense',
        text: 'a',
      }),
    ).toEqual(['Café 100% arábica', 'Supermercado']);
    expect(await descriptions({ text: 'outro espaço' })).toEqual([]);
  });

  it('pages through every transaction exactly once, including same-day ties', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await data.repositories.transactions.list({
        financialSpaceId: spaceId,
        state: 'active',
        limit: 3,
        cursor,
      });
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor !== null && pages < 20);

    const all = await data.repositories.transactions.list({
      financialSpaceId: spaceId,
      state: 'active',
      limit: 50,
      cursor: null,
    });
    expect(seen).toEqual(all.items.map((item) => item.id));
    expect(new Set(seen).size).toBe(12);
    expect(pages).toBe(4);
  });

  it('rejects a tampered cursor', async () => {
    await expect(
      data.repositories.transactions.list({
        financialSpaceId: spaceId,
        state: 'active',
        limit: 3,
        cursor: Buffer.from(JSON.stringify(["2026-01-01'; DROP TABLE x;--", 'a', 'b'])).toString(
          'base64url',
        ),
      }),
    ).rejects.toBeInstanceOf(InvalidCursorError);
  });
});
