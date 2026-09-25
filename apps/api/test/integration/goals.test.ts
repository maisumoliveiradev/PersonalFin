import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createGoal, updateGoal } from '../../src/modules/goals/goal-management.ts';
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

describe('PostgreSQL goals', () => {
  it('isolates global goals by owner and keeps an append-only progress history', async () => {
    const ana = await insertUser(pool, `${randomUUID()}@example.com`);
    const bruno = await insertUser(pool, `${randomUUID()}@example.com`);
    const { goal } = await createGoal(data, {
      scope: { kind: 'global', ownerUserId: ana },
      actorUserId: ana,
      name: 'Reserva',
      targetAmountMinor: 99_999_999_999,
      targetDate: '2027-12-31',
    });

    expect(await data.repositories.goals.list({ kind: 'global', ownerUserId: bruno })).toEqual([]);
    expect(
      await data.repositories.goals.find({ kind: 'global', ownerUserId: bruno }, goal.id),
    ).toBeNull();

    const { goal: updated, progress } = await updateGoal(data, {
      scope: { kind: 'global', ownerUserId: ana },
      goalId: goal.id,
      actorUserId: ana,
      expectedVersion: 1,
      accumulatedMinor: 99_999_999_999,
    });
    expect(updated).toMatchObject({ accumulatedMinor: 99_999_999_999, version: 2 });
    expect(updated.targetDate).toBe('2027-12-31');
    expect(progress.map((entry) => entry.accumulatedMinor)).toEqual([99_999_999_999]);
    await expect(
      pool.query('UPDATE goal_progress SET accumulated_minor = 0 WHERE goal_id = $1', [goal.id]),
    ).rejects.toThrow(/append-only/);
  });

  it('audits space goals in the space history', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: userId });
    const scope = { kind: 'space' as const, financialSpaceId: space.id };
    const { goal } = await createGoal(data, {
      scope,
      actorUserId: userId,
      name: 'Carro',
      targetAmountMinor: 5_000,
      targetDate: null,
    });
    await updateGoal(data, {
      scope,
      goalId: goal.id,
      actorUserId: userId,
      expectedVersion: 1,
      accumulatedMinor: 100,
    });

    const history = await data.repositories.audit.listForSpace(space.id, 10, null);
    expect(history.items.map((event) => `${event.entityType}:${event.action}`)).toEqual([
      'goal:update',
      'goal:create',
    ]);
  });
});
