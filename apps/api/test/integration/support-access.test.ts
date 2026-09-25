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

describe('PostgreSQL support access', () => {
  it('grants read-only access only while active and records each access', async () => {
    const ownerId = await insertUser(pool, `${randomUUID()}@example.com`);
    const adminEmail = `${randomUUID()}@example.com`;
    const adminId = await insertUser(pool, adminEmail);
    const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: ownerId });
    const { financialSpaces, supportGrants } = data.repositories;

    expect(await supportGrants.findAdminByEmail(adminEmail)).toBeNull();
    await pool.query("INSERT INTO platform_admin (user_id, granted_by) VALUES ($1, 'test')", [
      adminId,
    ]);
    expect(await supportGrants.findAdminByEmail(adminEmail.toUpperCase())).toEqual({ id: adminId });
    expect(await financialSpaces.findSupportAccess(adminId, space.id)).toBeNull();

    const grant = await supportGrants.create({
      id: randomUUID(),
      financialSpaceId: space.id,
      grantedByUserId: ownerId,
      adminUserId: adminId,
      reason: 'Chamado 42',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const access = await financialSpaces.findSupportAccess(adminId, space.id);
    expect(access?.access).toEqual({
      role: 'support',
      permissions: ['view'],
      supportGrantId: grant.id,
    });

    await financialSpaces.recordSupportAccess(grant.id, adminId, space.id);
    const [listed] = await supportGrants.listForSpace(space.id);
    expect(listed).toMatchObject({ accessCount: 1, adminEmail });
    expect(listed?.lastAccessAt).not.toBeNull();

    await supportGrants.revoke(space.id, grant.id, ownerId);
    expect(await financialSpaces.findSupportAccess(adminId, space.id)).toBeNull();
    expect(await supportGrants.listActiveForAdmin(adminId)).toEqual([]);

    await expect(
      pool.query(
        `INSERT INTO support_grant (id, financial_space_id, granted_by_user_id, admin_user_id, reason, expires_at)
         VALUES ($1, $2, $3, $4, 'Longo demais', now() + interval '8 days')`,
        [randomUUID(), space.id, ownerId, adminId],
      ),
    ).rejects.toThrow(/support_grant_expiry_window/);
  });
});
