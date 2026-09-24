import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import type { Category } from '../../src/modules/categories/category.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import type { NewFinancialTransaction } from '../../src/modules/transactions/transaction.ts';
import { createMigratedTestPool } from './database.ts';
import { insertUser } from './fixtures.ts';

let pool: DatabasePool;
let data: DataAccess;

beforeAll(async () => {
  pool = await createMigratedTestPool();
  data = createPostgresDataAccess(pool);
});

afterAll(async () => {
  await pool.end();
});

async function setUp() {
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });
  const categories = await data.repositories.categories.listForSpace(space.id);
  const find = (key: string): Category => {
    const category = categories.find((candidate) => candidate.defaultKey === key);
    if (category === undefined) {
      throw new Error(`Missing ${key}`);
    }
    return category;
  };
  const transaction = (
    overrides: Partial<NewFinancialTransaction> = {},
  ): NewFinancialTransaction => ({
    id: randomUUID(),
    financialSpaceId: space.id,
    type: 'expense',
    status: 'paid',
    description: 'Mercado',
    amountMinor: 1000,
    currency: 'BRL',
    financialDate: '2026-01-05',
    categoryId: find('food').id,
    subcategoryId: null,
    createdByUserId: userId,
    ...overrides,
  });
  return { userId, spaceId: space.id, find, transaction };
}

describe('PostgreSQL transaction persistence', () => {
  it('round-trips money exactly at the boundaries', async () => {
    const { transaction } = await setUp();

    const smallest = await data.repositories.transactions.create(transaction({ amountMinor: 1 }));
    const largest = await data.repositories.transactions.create(
      transaction({ amountMinor: 99_999_999_999 }),
    );
    const cents = await data.repositories.transactions.create(transaction({ amountMinor: 30 }));

    expect(smallest.amountMinor).toBe(1);
    expect(largest.amountMinor).toBe(99_999_999_999);
    expect(cents.amountMinor).toBe(30);
    const { rows } = await pool.query<{ amount_minor: string }>(
      'SELECT amount_minor FROM financial_transaction WHERE id = $1',
      [largest.id],
    );
    expect(rows[0]?.amount_minor).toBe('99999999999');
  });

  it.each(['2026-01-01', '2026-12-31', '2024-02-29', '2026-03-08'])(
    'round-trips the financial date %s without timezone shift',
    async (financialDate) => {
      const { transaction } = await setUp();

      const created = await data.repositories.transactions.create(transaction({ financialDate }));

      expect(created.financialDate).toBe(financialDate);
      expect(typeof created.financialDate).toBe('string');
    },
  );

  it('keeps the date when the database session uses a far-away timezone', async () => {
    const { transaction } = await setUp();
    const client = await pool.connect();
    try {
      await client.query("SET TIME ZONE 'Pacific/Kiritimati'");
      const created = await data.repositories.transactions.create(
        transaction({ financialDate: '2026-01-01' }),
      );
      const { rows } = await client.query<{ financial_date: string }>(
        'SELECT financial_date FROM financial_transaction WHERE id = $1',
        [created.id],
      );
      expect(rows[0]?.financial_date).toBe('2026-01-01');
    } finally {
      client.release();
    }
  });

  it('records the author and resolves category names', async () => {
    const { userId, find, transaction } = await setUp();

    const created = await data.repositories.transactions.create(
      transaction({ categoryId: find('housing').id, subcategoryId: find('housing.rent').id }),
    );

    expect(created.createdByUserId).toBe(userId);
    expect(created.category.name).toBe('Moradia');
    expect(created.subcategory?.name).toBe('Aluguel');
  });
});

describe('transaction integrity constraints', () => {
  it('rejects a category whose kind differs from the transaction type', async () => {
    const { find, transaction } = await setUp();

    await expect(
      data.repositories.transactions.create(
        transaction({ type: 'expense', categoryId: find('income').id }),
      ),
    ).rejects.toThrow(/financial_transaction_category_matches_space_and_type/);
  });

  it('rejects a category from another space', async () => {
    const own = await setUp();
    const other = await setUp();

    await expect(
      data.repositories.transactions.create(own.transaction({ categoryId: other.find('food').id })),
    ).rejects.toThrow(/financial_transaction_category_matches_space_and_type/);
  });

  it('rejects a subcategory used as the main category', async () => {
    const { find, transaction } = await setUp();

    await expect(
      data.repositories.transactions.create(transaction({ categoryId: find('food.groceries').id })),
    ).rejects.toThrow(/top-level category/);
  });

  it('rejects a subcategory of a different category', async () => {
    const { find, transaction } = await setUp();

    await expect(
      data.repositories.transactions.create(
        transaction({ categoryId: find('food').id, subcategoryId: find('housing.rent').id }),
      ),
    ).rejects.toThrow(/financial_transaction_subcategory_belongs_to_category/);
  });

  it.each([0, -1, 100_000_000_000])('rejects the stored amount %i', async (amountMinor) => {
    const { transaction } = await setUp();

    await expect(
      data.repositories.transactions.create(transaction({ amountMinor })),
    ).rejects.toThrow(/check constraint/);
  });
});
