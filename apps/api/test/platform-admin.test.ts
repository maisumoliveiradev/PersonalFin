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

describe('platform administration', () => {
  it('restricts the overview to platform administrators', async () => {
    const denied = await server.inject({ method: 'GET', url: '/admin/overview', headers: asBruno });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe('PLATFORM_ADMIN_REQUIRED');

    repositories.platformAdmins.admins.add(bruno.id);
    const allowed = await server.inject({
      method: 'GET',
      url: '/admin/overview',
      headers: asBruno,
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toMatchObject({ users: { total: 2 }, database: { migrations: 29 } });
    const me = await server.inject({ method: 'GET', url: '/me', headers: asBruno });
    expect(me.json().platformAdmin).toBe(true);
  });

  it('never gives a platform administrator access to financial spaces', async () => {
    const spaceId: string = (
      await server.inject({
        method: 'POST',
        url: '/financial-spaces',
        headers: asAna,
        payload: { name: 'Casa' },
      })
    ).json().id;
    repositories.platformAdmins.admins.add(bruno.id);

    const response = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asBruno,
    });

    expect(response.statusCode).toBe(404);
  });
});
