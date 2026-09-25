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

function request(method: 'GET' | 'POST' | 'PATCH', url: string, headers = asAna, payload?: object) {
  return server.inject({ method, url, headers, ...(payload === undefined ? {} : { payload }) });
}

async function createSpace() {
  return (await request('POST', '/financial-spaces', asAna, { name: 'Casa' })).json().id as string;
}

describe('goals', () => {
  it('creates a global goal visible only to its owner', async () => {
    const created = await request('POST', '/goals', asAna, {
      name: ' Reserva   de emergência ',
      targetAmountMinor: 3_000_000,
      targetDate: '2027-12-31',
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      scope: 'global',
      name: 'Reserva de emergência',
      accumulatedMinor: 0,
      targetDate: '2027-12-31',
      summary: { remainingMinor: 3_000_000, progressTenths: 0, reached: false },
      progress: [],
    });
    expect((await request('GET', '/goals', asBruno)).json().items).toEqual([]);
    const other = await request('GET', `/goals/${created.json().id}`, asBruno);
    expect(other.statusCode).toBe(404);
    expect(repositories.audit.events).toEqual([]);
  });

  it('records progress in an append-only history', async () => {
    const goal = (
      await request('POST', '/goals', asAna, { name: 'Viagem', targetAmountMinor: 1_000 })
    ).json();

    const first = await request('POST', `/goals/${goal.id}/progress`, asAna, {
      version: 1,
      accumulatedMinor: 400,
    });
    const second = await request('POST', `/goals/${goal.id}/progress`, asAna, {
      version: 2,
      accumulatedMinor: 1_200,
    });

    expect(first.json().summary).toEqual({
      remainingMinor: 600,
      progressTenths: 400,
      reached: false,
    });
    expect(second.json()).toMatchObject({
      accumulatedMinor: 1_200,
      summary: { remainingMinor: 0, progressTenths: 1000, reached: true },
    });
    expect(
      second.json().progress.map((entry: { accumulatedMinor: number }) => entry.accumulatedMinor),
    ).toEqual([1_200, 400]);
    const stale = await request('POST', `/goals/${goal.id}/progress`, asAna, {
      version: 1,
      accumulatedMinor: 0,
    });
    expect(stale.statusCode).toBe(409);
  });

  it('keeps space goals in the space and audits their changes', async () => {
    const spaceId = await createSpace();
    const base = `/financial-spaces/${spaceId}/goals`;
    const goal = (
      await request('POST', base, asAna, { name: 'Carro', targetAmountMinor: 5_000 })
    ).json();
    await request('POST', `${base}/${goal.id}/progress`, asAna, {
      version: 1,
      accumulatedMinor: 100,
    });
    await request('PATCH', `${base}/${goal.id}`, asAna, { version: 2, archived: true });

    expect((await request('GET', base)).json().items).toMatchObject([
      { name: 'Carro', scope: 'space', archived: true, accumulatedMinor: 100 },
    ]);
    expect((await request('GET', '/goals')).json().items).toEqual([]);
    expect(repositories.audit.events.map((event) => `${event.entityType}:${event.action}`)).toEqual(
      ['goal:create', 'goal:update', 'goal:update'],
    );
    expect((await request('GET', `/goals/${goal.id}`)).statusCode).toBe(404);
  });

  it('validates input', async () => {
    expect(
      (await request('POST', '/goals', asAna, { name: '', targetAmountMinor: 1 })).statusCode,
    ).toBe(400);
    expect(
      (await request('POST', '/goals', asAna, { name: 'X', targetAmountMinor: 0 })).statusCode,
    ).toBe(400);
    const goal = (
      await request('POST', '/goals', asAna, { name: 'X', targetAmountMinor: 10 })
    ).json();
    const negative = await request('POST', `/goals/${goal.id}/progress`, asAna, {
      version: 1,
      accumulatedMinor: -1,
    });
    expect(negative.statusCode).toBe(400);
  });
});
