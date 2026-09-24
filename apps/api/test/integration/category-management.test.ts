import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '../../src/modules/categories/category-management.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
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
  return { userId, spaceId: space.id };
}

describe('category management persistence', () => {
  it('appends new categories after existing siblings and maps name conflicts', async () => {
    const { userId, spaceId } = await setUp();

    const pets = await createCategory(data, {
      financialSpaceId: spaceId,
      actorUserId: userId,
      name: 'Pets',
      kind: 'expense',
      parentCategoryId: null,
    });

    expect(pets.position).toBe(10);
    await expect(
      createCategory(data, {
        financialSpaceId: spaceId,
        actorUserId: userId,
        name: 'Pets',
        kind: 'expense',
        parentCategoryId: null,
      }),
    ).rejects.toMatchObject({ code: 'CATEGORY_NAME_TAKEN' });
  });

  it('archives and unarchives with audit events', async () => {
    const { userId, spaceId } = await setUp();
    const pets = await createCategory(data, {
      financialSpaceId: spaceId,
      actorUserId: userId,
      name: 'Pets',
      kind: 'expense',
      parentCategoryId: null,
    });

    const archived = await updateCategory(data, {
      financialSpaceId: spaceId,
      categoryId: pets.id,
      actorUserId: userId,
      expectedVersion: 1,
      archived: true,
    });
    const restored = await updateCategory(data, {
      financialSpaceId: spaceId,
      categoryId: pets.id,
      actorUserId: userId,
      expectedVersion: 2,
      archived: false,
    });

    expect(archived.archivedAt).not.toBeNull();
    expect(restored.archivedAt).toBeNull();
    const events = await data.repositories.audit.listForEntity(spaceId, 'category', pets.id);
    expect(events.map((event) => event.action)).toEqual(['create', 'update', 'update']);
  });

  it('blocks deleting a category used by a soft-deleted transaction', async () => {
    const { userId, spaceId } = await setUp();
    const pets = await createCategory(data, {
      financialSpaceId: spaceId,
      actorUserId: userId,
      name: 'Pets',
      kind: 'expense',
      parentCategoryId: null,
    });
    const transaction = await createTransaction(data, {
      financialSpaceId: spaceId,
      createdByUserId: userId,
      type: 'expense',
      status: 'paid',
      description: 'Ração',
      amountMinor: 5000,
      financialDate: '2026-02-01',
      categoryId: pets.id,
      subcategoryId: null,
    });
    await pool.query(
      'UPDATE financial_transaction SET deleted_at = now(), deleted_by_user_id = $2 WHERE id = $1',
      [transaction.id, userId],
    );

    await expect(
      deleteCategory(data, {
        financialSpaceId: spaceId,
        categoryId: pets.id,
        actorUserId: userId,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'CATEGORY_IN_USE' });
  });

  it('maps a foreign-key race on delete to CATEGORY_IN_USE', async () => {
    const { userId, spaceId } = await setUp();
    const pets = await createCategory(data, {
      financialSpaceId: spaceId,
      actorUserId: userId,
      name: 'Pets',
      kind: 'expense',
      parentCategoryId: null,
    });
    await createTransaction(data, {
      financialSpaceId: spaceId,
      createdByUserId: userId,
      type: 'expense',
      status: 'paid',
      description: 'Ração',
      amountMinor: 5000,
      financialDate: '2026-02-01',
      categoryId: pets.id,
      subcategoryId: null,
    });

    await expect(data.repositories.categories.delete(spaceId, pets.id, 1)).rejects.toMatchObject({
      code: 'CATEGORY_IN_USE',
    });
  });
});
