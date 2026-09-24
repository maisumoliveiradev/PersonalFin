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
  const userId = await insertUser(pool, `${randomUUID()}@example.com`);
  const space = await createFinancialSpace(data, { name: 'Pessoal', ownerUserId: userId });
  const record = (amountMinor: number, observedOn: string) =>
    data.repositories.balanceSnapshots.record({
      id: randomUUID(),
      financialSpaceId: space.id,
      amountMinor,
      currency: 'BRL',
      observedOn,
      note: null,
      recordedByUserId: userId,
    });
  return { spaceId: space.id, record };
}

describe('balance snapshot persistence', () => {
  it('round-trips negative, zero, and boundary amounts and keeps the date', async () => {
    const { record } = await setUp();

    expect((await record(-99_999_999_999, '2026-01-01')).amountMinor).toBe(-99_999_999_999);
    expect((await record(0, '2026-12-31')).observedOn).toBe('2026-12-31');
  });

  it('orders by observed date, then recording instant', async () => {
    const { spaceId, record } = await setUp();
    await record(1, '2026-02-10');
    await record(2, '2026-02-01');
    await record(3, '2026-02-10');

    const snapshots = await data.repositories.balanceSnapshots.listForSpace(spaceId, 10);

    expect(snapshots.map((snapshot) => snapshot.amountMinor)).toEqual([3, 1, 2]);
  });

  it('never overwrites or deletes history', async () => {
    const { record } = await setUp();
    const snapshot = await record(500, '2026-02-01');

    await expect(
      pool.query('UPDATE balance_snapshot SET amount_minor = 1 WHERE id = $1', [snapshot.id]),
    ).rejects.toThrow(/append-only/);
    await expect(
      pool.query('DELETE FROM balance_snapshot WHERE id = $1', [snapshot.id]),
    ).rejects.toThrow(/append-only/);
  });
});
