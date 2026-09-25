import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildTestServer,
  createInMemoryRepositories,
  sessionCookie,
} from './support/test-server.ts';
import { bruno, sessions } from './support/users.ts';

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

function call(
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  headers: Record<string, string>,
  payload?: object,
) {
  return server.inject({ method, url, headers, ...(payload === undefined ? {} : { payload }) });
}

async function setUp() {
  const spaceId: string = (await call('POST', '/financial-spaces', asAna, { name: 'Casa' })).json()
    .id;
  repositories.platformAdmins.admins.add(bruno.id);
  const base = `/financial-spaces/${spaceId}`;
  const grant = (payload: object = {}) =>
    call('POST', `${base}/support-grants`, asAna, {
      adminEmail: bruno.email,
      reason: 'Chamado 42: saldo não confere',
      days: 2,
      ...payload,
    });
  return { spaceId, base, grant };
}

describe('support access (FR-016, DR-101)', () => {
  it('gives an administrator nothing without a grant', async () => {
    const { base } = await setUp();
    expect((await call('GET', `${base}/transactions`, asBruno)).statusCode).toBe(404);
  });

  it('lets the Owner authorize a named administrator for read-only access', async () => {
    const { base, grant } = await setUp();

    const created = await grant();

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      adminEmail: bruno.email,
      scope: 'view',
      status: 'active',
      accessCount: 0,
    });
    expect((await call('GET', `${base}/transactions`, asBruno)).statusCode).toBe(200);
    const space = await call('GET', base, asBruno);
    expect(space.json()).toMatchObject({ role: 'support', permissions: ['view'] });
    const write = await call('POST', `${base}/transactions`, asBruno, {});
    expect(write.statusCode).toBe(403);
    const personalWrite = await call('PUT', `${base}/dashboard-preferences`, asBruno, {
      profile: 'basic',
      overrides: {},
    });
    expect(personalWrite.statusCode).toBe(403);
    const mine = await call('GET', '/admin/support-grants', asBruno);
    expect(mine.json().items).toMatchObject([{ spaceName: 'Casa', status: 'active' }]);
  });

  it('records every access and shows it to the Owner', async () => {
    const { base, grant } = await setUp();
    await grant();
    await call('GET', `${base}/transactions`, asBruno);
    await call('GET', `${base}/categories`, asBruno);

    const list = await call('GET', `${base}/support-grants`, asAna);

    expect(list.json().items[0].accessCount).toBe(2);
    expect(list.json().items[0].lastAccessAt).not.toBeNull();
    const history = await call('GET', `${base}/audit-events`, asAna);
    expect(
      history
        .json()
        .items.filter((item: { action: string }) => item.action === 'access')
        .map((item: { entityType: string; actorName: string }) => [
          item.entityType,
          item.actorName,
        ]),
    ).toEqual([
      ['support_grant', 'Bruno'],
      ['support_grant', 'Bruno'],
    ]);
  });

  it('ends access on revocation, expiry, or loss of the administrator role', async () => {
    const { base, grant } = await setUp();
    const created = (await grant()).json();
    const revoked = await call('POST', `${base}/support-grants/${created.id}/revoke`, asAna);
    expect(revoked.json().status).toBe('revoked');
    expect((await call('GET', `${base}/transactions`, asBruno)).statusCode).toBe(404);

    await grant();
    const active = repositories.financialSpaces.supportGrants.at(-1);
    if (active !== undefined) {
      active.expiresAt = new Date(Date.now() - 1000);
    }
    expect((await call('GET', `${base}/transactions`, asBruno)).statusCode).toBe(404);

    await grant();
    repositories.platformAdmins.admins.delete(bruno.id);
    expect((await call('GET', `${base}/transactions`, asBruno)).statusCode).toBe(404);
  });

  it('accepts only platform administrators, a reason, and at most 7 days', async () => {
    const { grant } = await setUp();
    repositories.platformAdmins.admins.delete(bruno.id);
    expect((await grant()).json().error.code).toBe('SUPPORT_ADMIN_NOT_FOUND');
    repositories.platformAdmins.admins.add(bruno.id);
    expect((await grant({ reason: 'x' })).statusCode).toBe(400);
    expect((await grant({ days: 8 })).statusCode).toBe(400);
  });

  it('lets only the Owner manage support access', async () => {
    const { spaceId, base } = await setUp();
    repositories.platformAdmins.admins.delete(bruno.id);
    repositories.financialSpaces.members.push({
      financialSpaceId: spaceId,
      userId: bruno.id,
      permissions: ['view', 'manage_members'],
    });
    expect((await call('GET', `${base}/support-grants`, asBruno)).statusCode).toBe(403);
  });
});
