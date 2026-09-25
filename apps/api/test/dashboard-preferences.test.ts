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
      payload: { name: 'Pessoal' },
    })
  ).json().id;
  const url = `/financial-spaces/${spaceId}/dashboard-preferences`;
  const get = (headers = asAna) => server.inject({ method: 'GET', url, headers });
  const put = (payload: object, headers = asAna) =>
    server.inject({ method: 'PUT', url, headers, payload });
  return { get, put };
}

describe('dashboard preferences', () => {
  it('defaults to the advanced profile with every section visible', async () => {
    const { get } = await setUp();

    const body = (await get()).json();

    expect(body).toMatchObject({ profile: 'advanced', overrides: {}, isDefault: true });
    expect(Object.values(body.sections).every(Boolean)).toBe(true);
  });

  it('saves a profile with overrides and drops redundant ones', async () => {
    const { get, put } = await setUp();

    await put({ profile: 'basic', overrides: { realized: true, projection: true } });
    const body = (await get()).json();

    expect(body).toMatchObject({
      profile: 'basic',
      overrides: { projection: true },
      isDefault: false,
      sections: { realized: true, forecast: false, projection: true, analytics: false },
    });
  });

  it.each([
    { profile: 'expert', overrides: {} },
    { profile: 'basic', overrides: { charts: true } },
  ])('rejects %j', async (payload) => {
    const { put } = await setUp();

    expect((await put(payload)).statusCode).toBe(400);
  });

  it('keeps preferences per user and hides other spaces', async () => {
    const { put } = await setUp();

    expect((await put({ profile: 'basic', overrides: {} }, asBruno)).statusCode).toBe(404);
  });
});
