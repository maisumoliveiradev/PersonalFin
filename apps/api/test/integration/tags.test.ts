import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { TagInUseError, TagNameTakenError } from '../../src/modules/tags/tag-errors.ts';
import { createTag, deleteTag, updateTag } from '../../src/modules/tags/tag-management.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
import { updateTransaction } from '../../src/modules/transactions/update-transaction.ts';
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
  const spaceId = (await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId })).id;
  const categories = await data.repositories.categories.listForSpace(spaceId);
  const housing = categories.find((category) => category.defaultKey === 'housing')?.id ?? '';
  const tag = (name: string) =>
    createTag(data, { financialSpaceId: spaceId, actorUserId: userId, name });
  const add = (tagIds: string[]) =>
    createTransaction(data, {
      financialSpaceId: spaceId,
      createdByUserId: userId,
      type: 'expense',
      status: 'paid',
      description: 'Aluguel',
      amountMinor: 150_000,
      financialDate: '2026-10-05',
      categoryId: housing,
      subcategoryId: null,
      tagIds,
    });
  return { userId, spaceId, tag, add };
}

describe('tag persistence', () => {
  it('stores tags on transactions, sorted by name, and filters by tag', async () => {
    const { spaceId, tag, add } = await setUp();
    const trip = await tag('viagem');
    const home = await tag('Casa');
    await add([trip.id, home.id]);
    await add([]);

    const page = await data.repositories.transactions.list({
      financialSpaceId: spaceId,
      state: 'active',
      limit: 10,
      cursor: null,
      tagId: trip.id,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.tags.map((item) => item.name)).toEqual(['Casa', 'viagem']);
  });

  it('keeps names unique per space ignoring case and blocks deleting used tags', async () => {
    const { userId, spaceId, tag, add } = await setUp();
    const trip = await tag('Viagem');
    await add([trip.id]);

    await expect(tag('VIAGEM')).rejects.toBeInstanceOf(TagNameTakenError);
    await expect(
      deleteTag(data, {
        financialSpaceId: spaceId,
        tagId: trip.id,
        actorUserId: userId,
        expectedVersion: 1,
      }),
    ).rejects.toBeInstanceOf(TagInUseError);
  });

  it('renames a tag everywhere and replaces tags on edit', async () => {
    const { userId, spaceId, tag, add } = await setUp();
    const trip = await tag('Viagem');
    const work = await tag('Trabalho');
    const created = await add([trip.id]);

    await updateTag(data, {
      financialSpaceId: spaceId,
      tagId: trip.id,
      actorUserId: userId,
      expectedVersion: 1,
      name: 'Férias',
    });
    const renamed = await data.repositories.transactions.findInSpace(spaceId, created.id);
    const edited = await updateTransaction(data, {
      financialSpaceId: spaceId,
      transactionId: created.id,
      actorUserId: userId,
      expectedVersion: 1,
      changes: {},
      tagIds: [work.id, trip.id],
    });

    expect(renamed?.tags.map((item) => item.name)).toEqual(['Férias']);
    expect(edited.tags.map((item) => item.name)).toEqual(['Férias', 'Trabalho']);
    expect(edited.version).toBe(2);
  });

  it('refuses a tag of another space at the database level', async () => {
    const first = await setUp();
    const second = await setUp();
    const foreign = await second.tag('Alheia');
    const transaction = await first.add([]);

    await expect(
      pool.query(
        'INSERT INTO transaction_tag (transaction_id, tag_id, financial_space_id) VALUES ($1, $2, $3)',
        [transaction.id, foreign.id, first.spaceId],
      ),
    ).rejects.toThrow(/transaction_tag_tag_in_space/);
  });
});
