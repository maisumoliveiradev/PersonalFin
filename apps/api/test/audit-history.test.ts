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

async function setUp() {
  const spaceId: string = (
    await server.inject({
      method: 'POST',
      url: '/financial-spaces',
      headers: asAna,
      payload: { name: 'Casa' },
    })
  ).json().id;
  for (const name of ['Viagem', 'Casa', 'Trabalho']) {
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/tags`,
      headers: asAna,
      payload: { name },
    });
  }
  const history = (query: string, headers = asAna) =>
    server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/audit-events?${query}`,
      headers,
    });
  return { spaceId, history };
}

describe('space audit history', () => {
  it('lists events newest first with the actor name and pages through them', async () => {
    const { history } = await setUp();

    const first = (await history('limit=2')).json();
    const second = (await history(`limit=2&cursor=${first.nextCursor}`)).json();

    expect(
      first.items.map((item: { changes: { name: { after: string } } }) => item.changes.name.after),
    ).toEqual(['Trabalho', 'Casa']);
    expect(first.items[0]).toMatchObject({ actorName: 'Ana', entityType: 'tag', action: 'create' });
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });

  it('requires view_audit', async () => {
    const { spaceId, history } = await setUp();
    repositories.financialSpaces.members.push({
      financialSpaceId: spaceId,
      userId: bruno.id,
      permissions: ['view', 'record'],
    });

    const denied = await history('', asBruno);
    repositories.financialSpaces.members[0]?.permissions.push('view_audit');
    const allowed = await history('', asBruno);

    expect(denied.statusCode).toBe(403);
    expect(allowed.statusCode).toBe(200);
  });

  it('rejects an invalid cursor', async () => {
    const { history } = await setUp();

    expect((await history('cursor=-5')).statusCode).toBe(400);
  });
});
