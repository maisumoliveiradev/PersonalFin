import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildTestServer,
  createInMemoryRepositories,
  sessionCookie,
} from './support/test-server.ts';
import { sessions } from './support/users.ts';

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
  const invite = (payload: object, headers = asAna) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/invitations`,
      headers,
      payload,
    });
  const accept = (token: string, headers = asBruno) =>
    server.inject({ method: 'POST', url: `/invitations/${token}/accept`, headers });
  return { spaceId, invite, accept };
}

describe('invitations', () => {
  it('creates a single-use invitation and never stores the token', async () => {
    const { invite } = await setUp();

    const response = await invite({ email: ' Bruno@Example.com ', preset: 'contributor' });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.invitation).toMatchObject({
      email: 'bruno@example.com',
      permissions: ['view', 'record'],
      status: 'pending',
    });
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(repositories.members.invitations)).not.toContain(body.token);
  });

  it('lets the invited user preview and accept, granting the permissions', async () => {
    const { spaceId, invite, accept } = await setUp();
    const { token } = (await invite({ email: 'bruno@example.com', preset: 'viewer' })).json();

    const preview = await server.inject({
      method: 'GET',
      url: `/invitations/${token}`,
      headers: asBruno,
    });
    const accepted = await accept(token);
    const space = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}`,
      headers: asBruno,
    });

    expect(preview.json()).toMatchObject({ spaceName: 'Casa', status: 'pending' });
    expect(accepted.json()).toEqual({ spaceId });
    expect(space.json()).toMatchObject({ role: 'member', permissions: ['view'] });
    expect((await accept(token)).statusCode).toBe(410);
  });

  it('refuses acceptance by another account', async () => {
    const { invite, accept } = await setUp();
    const { token } = (await invite({ email: 'carla@example.com', preset: 'viewer' })).json();

    const response = await accept(token);

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('INVITATION_EMAIL_MISMATCH');
  });

  it('never grants access through cancelled or expired invitations', async () => {
    const { spaceId, invite, accept } = await setUp();
    const cancelled = (await invite({ email: 'bruno@example.com', preset: 'viewer' })).json();
    await server.inject({
      method: 'DELETE',
      url: `/financial-spaces/${spaceId}/invitations/${cancelled.invitation.id}`,
      headers: asAna,
    });
    const expired = (await invite({ email: 'bruno@example.com', preset: 'viewer' })).json();
    const stored = repositories.members.invitations.find(
      (invitation) => invitation.id === expired.invitation.id,
    );
    if (stored !== undefined) {
      stored.expiresAt = new Date(Date.now() - 1_000);
    }

    expect((await accept(cancelled.token)).statusCode).toBe(410);
    expect((await accept(expired.token)).statusCode).toBe(410);
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

  it('rejects inviting someone who already has access or a duplicate pending invitation', async () => {
    const { invite } = await setUp();

    const owner = await invite({ email: 'ana@example.com', preset: 'viewer' });
    await invite({ email: 'bruno@example.com', preset: 'viewer' });
    const duplicate = await invite({ email: 'bruno@example.com', preset: 'viewer' });

    expect(owner.json().error.code).toBe('ALREADY_MEMBER');
    expect(duplicate.json().error.code).toBe('INVITATION_PENDING');
  });

  it.each([
    { email: 'bruno@example.com' },
    { email: 'not-an-email', preset: 'viewer' },
    { email: 'bruno@example.com', preset: 'viewer', permissions: ['view'] },
    { email: 'bruno@example.com', preset: 'owner' },
  ])('rejects %j', async (payload) => {
    const { invite } = await setUp();

    expect((await invite(payload)).statusCode).toBe(400);
  });

  it('returns 404 for unknown or malformed tokens', async () => {
    await setUp();

    for (const token of ['short', 'A'.repeat(43)]) {
      const response = await server.inject({
        method: 'GET',
        url: `/invitations/${token}`,
        headers: asBruno,
      });
      expect(response.json().error.code).toBe('INVITATION_NOT_FOUND');
    }
  });
});
