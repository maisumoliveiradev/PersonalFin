import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { CardNameTakenError } from '../../src/modules/cards/card-errors.ts';
import {
  createCard,
  recordCardLimit,
  updateCard,
} from '../../src/modules/cards/card-management.ts';
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
  const { card } = await createCard(data, {
    financialSpaceId: space.id,
    actorUserId: userId,
    name: 'Nubank',
    closingDay: 31,
    dueDay: 7,
    limitMinor: 99_999_999_999,
    limitEffectiveFrom: '2026-01-01',
  });
  return { userId, spaceId: space.id, card };
}

describe('card persistence', () => {
  it('round-trips the card and the limit boundary', async () => {
    const { spaceId, card } = await setUp();

    const stored = await data.repositories.cards.findInSpace(spaceId, card.id);
    const limits = await data.repositories.cards.listLimitChanges(spaceId, card.id);

    expect(stored).toMatchObject({ name: 'Nubank', closingDay: 31, dueDay: 7, archivedAt: null });
    expect(limits.map((limit) => [limit.amountMinor, limit.effectiveFrom])).toEqual([
      [99_999_999_999, '2026-01-01'],
    ]);
  });

  it('orders limit history by effective date, then recording instant', async () => {
    const { userId, spaceId, card } = await setUp();
    const record = (amountMinor: number, effectiveFrom: string) =>
      recordCardLimit(data, {
        financialSpaceId: spaceId,
        cardId: card.id,
        actorUserId: userId,
        amountMinor,
        effectiveFrom,
      });
    await record(2, '2026-06-01');
    await record(3, '2026-03-01');
    const { limits } = await record(4, '2026-06-01');

    expect(limits.map((limit) => limit.amountMinor)).toEqual([4, 2, 3, 99_999_999_999]);
  });

  it('never overwrites or deletes limit history', async () => {
    const { spaceId, card } = await setUp();
    const [limit] = await data.repositories.cards.listLimitChanges(spaceId, card.id);

    await expect(
      pool.query('UPDATE card_limit_change SET amount_minor = 1 WHERE id = $1', [limit?.id]),
    ).rejects.toThrow(/append-only/);
    await expect(
      pool.query('DELETE FROM card_limit_change WHERE id = $1', [limit?.id]),
    ).rejects.toThrow(/append-only/);
  });

  it('keeps names unique per space, ignoring case', async () => {
    const { userId, spaceId, card } = await setUp();

    await expect(
      createCard(data, {
        financialSpaceId: spaceId,
        actorUserId: userId,
        name: 'NUBANK',
        closingDay: 1,
        dueDay: 1,
        limitMinor: 1,
        limitEffectiveFrom: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(CardNameTakenError);
    const other = await setUp();
    expect(other.card.name).toBe(card.name);
  });

  it('archives and audits changes with before and after values', async () => {
    const { userId, spaceId, card } = await setUp();

    const updated = await updateCard(data, {
      financialSpaceId: spaceId,
      cardId: card.id,
      actorUserId: userId,
      expectedVersion: 1,
      dueDay: 15,
      archived: true,
    });
    const events = await data.repositories.audit.listForEntity(spaceId, 'card', card.id);

    expect(updated).toMatchObject({ dueDay: 15, version: 2 });
    expect(updated.archivedAt).toBeInstanceOf(Date);
    expect(events.map((event) => event.action)).toEqual(['create', 'update']);
    expect(events[1]?.changes).toEqual({
      dueDay: { before: 7, after: 15 },
      archived: { before: false, after: true },
    });
  });

  it('rejects a limit change pointing to a card of another space', async () => {
    const first = await setUp();
    const second = await setUp();

    await expect(
      data.repositories.cards.recordLimitChange({
        id: randomUUID(),
        cardId: first.card.id,
        financialSpaceId: second.spaceId,
        amountMinor: 1,
        currency: 'BRL',
        effectiveFrom: '2026-01-01',
        recordedByUserId: second.userId,
      }),
    ).rejects.toThrow(/card_limit_change_card_in_same_space/);
  });
});
