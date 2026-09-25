import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  InvitationEmailMismatchError,
  InvitationNotAvailableError,
} from '../../src/modules/members/invitation-management.ts';
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
  const guestEmail = `${randomUUID()}@example.com`;
  const guestId = await insertUser(pool, guestEmail);
  const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: ownerId });
  const invite = (email = guestEmail) =>
    createInvitation(data, {
      financialSpaceId: space.id,
      actorUserId: ownerId,
      email,
      permissions: ['record'],
      now: new Date(),
    });
  return { ownerId, guestId, guestEmail, space, invite };
}

describe('invitation persistence', () => {
  it('stores only the token hash and creates one membership on acceptance', async () => {
    const { guestId, guestEmail, space, invite } = await setUp();
    const { invitation, token } = await invite(guestEmail.toUpperCase());

    const stored = await pool.query<{ token_hash: string; email: string }>(
      'SELECT token_hash, email FROM space_invitation WHERE id = $1',
      [invitation.id],
    );
    await acceptInvitation(data, { token, userId: guestId, email: guestEmail, now: new Date() });
    const access = await data.repositories.financialSpaces.findAccessibleTo(guestId, space.id);

    expect(stored.rows[0]?.token_hash).not.toContain(token);
    expect(stored.rows[0]?.email).toBe(guestEmail);
    expect(access?.access).toEqual({ role: 'member', permissions: ['view', 'record'] });
    await expect(
      acceptInvitation(data, { token, userId: guestId, email: guestEmail, now: new Date() }),
    ).rejects.toBeInstanceOf(InvitationNotAvailableError);
  });

  it('refuses expired, cancelled, and mismatched acceptances', async () => {
    const { ownerId, guestId, guestEmail, space, invite } = await setUp();
    const first = await invite();
    await pool.query(
      `UPDATE space_invitation SET expires_at = now() - interval '1 second' WHERE id = $1`,
      [first.invitation.id],
    );
    const second = await invite();
    await cancelInvitation(data, {
      financialSpaceId: space.id,
      invitationId: second.invitation.id,
      actorUserId: ownerId,
    });
    const third = await invite();

    for (const token of [first.token, second.token]) {
      await expect(
        acceptInvitation(data, { token, userId: guestId, email: guestEmail, now: new Date() }),
      ).rejects.toBeInstanceOf(InvitationNotAvailableError);
    }
    await expect(
      acceptInvitation(data, {
        token: third.token,
        userId: ownerId,
        email: 'someone-else@example.com',
        now: new Date(),
      }),
    ).rejects.toBeInstanceOf(InvitationEmailMismatchError);
    expect(await data.repositories.financialSpaces.findAccessibleTo(guestId, space.id)).toBeNull();
  });

  it('audits creation, cancellation, and acceptance', async () => {
    const { ownerId, guestId, guestEmail, space, invite } = await setUp();
    const { invitation, token } = await invite();
    await acceptInvitation(data, { token, userId: guestId, email: guestEmail, now: new Date() });

    const events = await data.repositories.audit.listForEntity(
      space.id,
      'space_invitation',
      invitation.id,
    );

    expect(events.map((event) => [event.action, event.actorUserId])).toEqual([
      ['create', ownerId],
      ['update', guestId],
    ]);
  });
});
