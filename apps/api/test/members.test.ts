import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildTestServer,
  createInMemoryRepositories,
  sessionCookie,
} from './support/test-server.ts';
import { ana, bruno, sessions } from './support/users.ts';

let repositories = createInMemoryRepositories();
let server = buildTestServer({ sessions, repositories });
const asAna = { cookie: sessionCookie('ana-token') };
const asBruno = { cookie: sessionCookie('bruno-token') };

beforeEach(async () => {
  await server.close();
  repositories = createInMemoryRepositories();
  server = buildTestServer({ sessions, repositories });
});

afterAll(async () => {
  await server.close();
});

async function setUp() {
  const spaceId: string = (
    await server.inject({
      method: 'POST',
      url: '/financial-spaces',
      headers: asAna,
      payload: { name: 'Casa' },
    })
  ).json().id;
  const { token } = (
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/invitations`,
      headers: asAna,
      payload: { email: bruno.email, preset: 'contributor' },
    })
  ).json();
  await server.inject({ method: 'POST', url: `/invitations/${token}/accept`, headers: asBruno });
  const list = async (headers = asAna) =>
    (
      await server.inject({ method: 'GET', url: `/financial-spaces/${spaceId}/members`, headers })
    ).json().items;
  return { spaceId, list };
}

describe('member management', () => {
  it('lists the owner and members', async () => {
    const { list } = await setUp();

    expect(await list(asBruno)).toEqual([
      expect.objectContaining({ userId: ana.id, role: 'owner', version: null }),
      expect.objectContaining({
        userId: bruno.id,
        role: 'member',
        permissions: ['view', 'record'],
        version: 1,
      }),
    ]);
  });

  it('changes permissions with version checks and keeps view', async () => {
    const { spaceId, list } = await setUp();
    const patch = (payload: object) =>
      server.inject({
        method: 'PATCH',
        url: `/financial-spaces/${spaceId}/members/${bruno.id}`,
        headers: asAna,
        payload,
      });

    const changed = await patch({ version: 1, permissions: ['classify'] });
    const stale = await patch({ version: 1, permissions: [] });

    expect(changed.statusCode).toBe(204);
    expect(stale.statusCode).toBe(409);
    expect((await list())[1].permissions).toEqual(['view', 'classify']);
  });

  it('removes a member who then loses access, keeping their records', async () => {
    const { spaceId } = await setUp();
    const categories = (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/categories`,
        headers: asBruno,
      })
    ).json().items;
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asBruno,
      payload: {
        type: 'expense',
        description: 'Compra do Bruno',
        amountMinor: 1_000,
        financialDate: '2026-10-01',
        categoryId: categories[0].id,
      },
    });

    const removed = await server.inject({
      method: 'DELETE',
      url: `/financial-spaces/${spaceId}/members/${bruno.id}?version=1`,
      headers: asAna,
    });
    const access = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}`,
      headers: asBruno,
    });
    const transactions = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
    });

    expect(removed.statusCode).toBe(204);
    expect(access.statusCode).toBe(404);
    expect(
      transactions.json().items.map((item: { description: string }) => item.description),
    ).toEqual(['Compra do Bruno']);
  });

  it('lets a member leave but never the owner', async () => {
    const { spaceId } = await setUp();
    const leave = (headers: { cookie: string }) =>
      server.inject({ method: 'POST', url: `/financial-spaces/${spaceId}/leave`, headers });

    const ownerLeaves = await leave(asAna);
    const memberLeaves = await leave(asBruno);
    const removeOwner = await server.inject({
      method: 'DELETE',
      url: `/financial-spaces/${spaceId}/members/${ana.id}?version=1`,
      headers: asAna,
    });

    expect(ownerLeaves.json().error.code).toBe('OWNER_CANNOT_LEAVE');
    expect(memberLeaves.statusCode).toBe(204);
    expect(removeOwner.json().error.code).toBe('OWNER_CANNOT_LEAVE');
    expect(
      (
        await server.inject({
          method: 'GET',
          url: `/financial-spaces/${spaceId}`,
          headers: asBruno,
        })
      ).statusCode,
    ).toBe(404);
  });

  it('requires manage_members to change or remove members', async () => {
    const { spaceId } = await setUp();

    const response = await server.inject({
      method: 'DELETE',
      url: `/financial-spaces/${spaceId}/members/${bruno.id}?version=1`,
      headers: asBruno,
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('ownership transfer', () => {
  it('makes the member the Owner and the previous Owner an administrator', async () => {
    const { spaceId, list } = await setUp();

    const response = await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/ownership-transfer`,
      headers: asAna,
      payload: { newOwnerUserId: bruno.id },
    });
    const brunoView = (
      await server.inject({ method: 'GET', url: `/financial-spaces/${spaceId}`, headers: asBruno })
    ).json();
    const members = await list(asBruno);

    expect(response.statusCode).toBe(204);
    expect(brunoView).toMatchObject({ role: 'owner' });
    expect(
      members.map((member: { userId: string; role: string }) => [member.userId, member.role]),
    ).toEqual([
      [bruno.id, 'owner'],
      [ana.id, 'member'],
    ]);
    expect(members[1].permissions).toHaveLength(6);
  });

  it('lets only the Owner transfer, and only to an active member', async () => {
    const { spaceId } = await setUp();
    const transfer = (headers: { cookie: string }, newOwnerUserId: string) =>
      server.inject({
        method: 'POST',
        url: `/financial-spaces/${spaceId}/ownership-transfer`,
        headers,
        payload: { newOwnerUserId },
      });

    expect((await transfer(asBruno, bruno.id)).statusCode).toBe(403);
    expect((await transfer(asAna, '00000000-0000-4000-8000-000000000000')).json().error.code).toBe(
      'MEMBER_NOT_FOUND',
    );
  });
});
