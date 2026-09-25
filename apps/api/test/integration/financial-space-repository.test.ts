import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabasePool } from '../../src/database/pool.ts';
import { OWNER_ACCESS } from '../../src/modules/financial-spaces/financial-space.ts';
import { createPostgresFinancialSpaceRepository } from '../../src/modules/financial-spaces/postgres-financial-space-repository.ts';
import { createMigratedTestPool } from './database.ts';
import { insertUser } from './fixtures.ts';

let pool: DatabasePool;

beforeAll(async () => {
  pool = await createMigratedTestPool();
});

afterAll(async () => {
  await pool.end();
});

describe('PostgreSQL financial space repository', () => {
  it('persists a space owned by its creator and isolates it from other users', async () => {
    const repository = createPostgresFinancialSpaceRepository(pool);
    const owner = await insertUser(pool, 'owner@example.com');
    const stranger = await insertUser(pool, 'stranger@example.com');

    const space = await repository.create({
      id: randomUUID(),
      name: 'Pessoal',
      ownerUserId: owner,
    });

    expect(space).toMatchObject({ name: 'Pessoal', ownerUserId: owner, lifecycleState: 'active' });
    expect(await repository.listAccessibleTo(owner)).toEqual([{ ...space, access: OWNER_ACCESS }]);
    expect(await repository.findAccessibleTo(owner, space.id)).toEqual({
      ...space,
      access: OWNER_ACCESS,
    });
    expect(await repository.listAccessibleTo(stranger)).toEqual([]);
    expect(await repository.findAccessibleTo(stranger, space.id)).toBeNull();
  });

  it('rejects a space without an existing owner', async () => {
    const repository = createPostgresFinancialSpaceRepository(pool);

    await expect(
      repository.create({ id: randomUUID(), name: 'Órfão', ownerUserId: randomUUID() }),
    ).rejects.toThrow();
  });

  it.each(['', ' Pessoal', 'x'.repeat(81)])('rejects the invalid stored name %j', async (name) => {
    const owner = await insertUser(pool, `${randomUUID()}@example.com`);

    await expect(
      pool.query('INSERT INTO financial_space (id, name, owner_user_id) VALUES ($1, $2, $3)', [
        randomUUID(),
        name,
        owner,
      ]),
    ).rejects.toThrow(/check constraint/);
  });
});
