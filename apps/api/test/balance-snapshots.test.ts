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
  const url = `/financial-spaces/${spaceId}/balance-snapshots`;
  return {
    record: (payload: object, headers = asAna) =>
      server.inject({ method: 'POST', url, headers, payload }),
    list: (headers = asAna) => server.inject({ method: 'GET', url, headers }),
  };
}

describe('balance snapshots', () => {
  it('starts without a current balance', async () => {
    const { list } = await setUp();

    expect((await list()).json()).toEqual({ items: [], current: null, hasMore: false });
  });

  it('records snapshots as history and exposes the latest observed one as current', async () => {
    const { record, list } = await setUp();

    const first = await record({ amountMinor: 150_000, observedOn: '2026-02-01' });
    await record({ amountMinor: -2_550, observedOn: '2026-02-10', note: '  cheque especial ' });
    await record({ amountMinor: 0, observedOn: '2026-02-05' });

    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({ amountMinor: 150_000, currency: 'BRL', note: null });
    const body = (await list()).json();
    expect(body.items.map((item: { observedOn: string }) => item.observedOn)).toEqual([
      '2026-02-10',
      '2026-02-05',
      '2026-02-01',
    ]);
    expect(body.current).toMatchObject({ amountMinor: -2_550, note: 'cheque especial' });
  });

  it('uses the recording instant to order snapshots of the same day', async () => {
    const { record, list } = await setUp();
    await record({ amountMinor: 100, observedOn: '2026-02-10' });
    await record({ amountMinor: 200, observedOn: '2026-02-10' });

    expect((await list()).json().current.amountMinor).toBe(200);
  });

  it('does not create or change any transaction', async () => {
    const { record } = await setUp();

    await record({ amountMinor: 500, observedOn: '2026-02-01' });

    expect(repositories.transactions.transactions).toEqual([]);
  });

  it.each([
    ['a fractional amount', { amountMinor: 1.5, observedOn: '2026-02-01' }],
    ['an amount beyond the limit', { amountMinor: -100_000_000_000, observedOn: '2026-02-01' }],
    ['an invalid date', { amountMinor: 1, observedOn: '2026-02-30' }],
    ['a missing date', { amountMinor: 1 }],
    ['a long note', { amountMinor: 1, observedOn: '2026-02-01', note: 'x'.repeat(141) }],
    ['a currency override', { amountMinor: 1, observedOn: '2026-02-01', currency: 'USD' }],
  ])('rejects %s', async (_case, payload) => {
    const { record } = await setUp();

    expect((await record(payload)).statusCode).toBe(400);
  });

  it("hides another user's balance", async () => {
    const { record, list } = await setUp();
    await record({ amountMinor: 1, observedOn: '2026-02-01' });

    expect((await list(asBruno)).statusCode).toBe(404);
    expect((await record({ amountMinor: 1, observedOn: '2026-02-01' }, asBruno)).statusCode).toBe(
      404,
    );
  });
});
