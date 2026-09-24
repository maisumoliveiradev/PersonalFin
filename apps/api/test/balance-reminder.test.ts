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
  const url = `/financial-spaces/${spaceId}/balance-reminder`;
  return {
    get: (headers = asAna) => server.inject({ method: 'GET', url, headers }),
    put: (payload: object, headers = asAna) =>
      server.inject({ method: 'PUT', url, headers, payload }),
  };
}

describe('balance reminder setting', () => {
  it('defaults to every 7 days', async () => {
    const { get } = await setUp();

    expect((await get()).json()).toEqual({
      frequency: 'every_n_days',
      intervalDays: 7,
      isDefault: true,
    });
  });

  it.each([
    [{ frequency: 'daily', intervalDays: null }],
    [{ frequency: 'app_start', intervalDays: null }],
    [{ frequency: 'never', intervalDays: null }],
    [{ frequency: 'every_n_days', intervalDays: 30 }],
  ])('saves %o', async (setting) => {
    const { get, put } = await setUp();

    expect((await put(setting)).statusCode).toBe(200);
    expect((await get()).json()).toEqual({ ...setting, isDefault: false });
  });

  it.each([
    [{ frequency: 'every_n_days', intervalDays: 0 }],
    [{ frequency: 'every_n_days', intervalDays: 91 }],
    [{ frequency: 'every_n_days', intervalDays: null }],
    [{ frequency: 'daily', intervalDays: 2 }],
    [{ frequency: 'weekly', intervalDays: null }],
    [{ frequency: 'daily' }],
  ])('rejects %o', async (setting) => {
    const { put } = await setUp();

    expect((await put(setting)).statusCode).toBe(400);
  });

  it("does not expose or change another user's space", async () => {
    const { get, put } = await setUp();

    expect((await get(asBruno)).statusCode).toBe(404);
    expect((await put({ frequency: 'never', intervalDays: null }, asBruno)).statusCode).toBe(404);
  });
});
