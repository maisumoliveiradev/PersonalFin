import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
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
  const ownerId = await insertUser(pool, `${randomUUID()}@example.com`);
  const memberId = await insertUser(pool, `${randomUUID()}@example.com`);
  const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: ownerId });
  const addMember = (userId: string, permissions: string[]) =>
    pool.query(
      `INSERT INTO financial_space_member (id, financial_space_id, user_id, permissions, added_by_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), space.id, userId, permissions, ownerId],
    );
  return { ownerId, memberId, space, addMember };
}

describe('space membership persistence', () => {
  it('gives members access with their permissions and the owner full access', async () => {
    const { ownerId, memberId, space, addMember } = await setUp();
    await addMember(memberId, ['view', 'record']);

    const asMember = await data.repositories.financialSpaces.findAccessibleTo(memberId, space.id);
    const asOwner = await data.repositories.financialSpaces.findAccessibleTo(ownerId, space.id);
    const listed = await data.repositories.financialSpaces.listAccessibleTo(memberId);

    expect(asMember?.access).toEqual({ role: 'member', permissions: ['view', 'record'] });
    expect(asOwner?.access.role).toBe('owner');
    expect(listed.map((item) => item.id)).toEqual([space.id]);
  });

  it('removes access when the membership is removed', async () => {
    const { ownerId, memberId, space, addMember } = await setUp();
    await addMember(memberId, ['view']);

    await pool.query(
      `UPDATE financial_space_member SET removed_at = now(), removed_by_user_id = $2
       WHERE user_id = $1`,
      [memberId, ownerId],
    );

    expect(await data.repositories.financialSpaces.findAccessibleTo(memberId, space.id)).toBeNull();
  });

  it('rejects invalid permission sets, duplicates, and the owner as member', async () => {
    const { ownerId, memberId, addMember } = await setUp();
    await addMember(memberId, ['view']);

    await expect(addMember(memberId, ['view'])).rejects.toThrow(
      /financial_space_member_active_unique/,
    );
    await expect(addMember(randomUUID(), ['record'])).rejects.toThrow();
    await expect(addMember(ownerId, ['view'])).rejects.toThrow(/owner is not a member/);
  });
});
