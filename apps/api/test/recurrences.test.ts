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
  const categories: { id: string; name: string }[] = (
    await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/categories`,
      headers: asAna,
    })
  ).json().items;
  const byName = (name: string) => categories.find((category) => category.name === name)?.id;
  const base = `/financial-spaces/${spaceId}/recurrences`;
  const valid = {
    type: 'expense',
    description: 'Academia',
    amountMinor: 9_990,
    categoryId: byName('Saúde'),
    frequency: 'monthly',
    nonBusinessDayRule: 'keep',
    startDate: '2026-10-05',
  };
  return {
    valid,
    byName,
    create: (payload: object, headers = asAna) =>
      server.inject({ method: 'POST', url: base, headers, payload }),
    list: (headers = asAna) => server.inject({ method: 'GET', url: base, headers }),
    materialize: (throughMonth: string) =>
      server.inject({
        method: 'POST',
        url: `${base}/materialize`,
        headers: asAna,
        payload: { throughMonth },
      }),
    transactions: (month: string) =>
      server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/transactions?month=${month}`,
        headers: asAna,
      }),
  };
}

describe('recurring series API', () => {
  it('creates a series whose occurrences appear as pending linked transactions', async () => {
    const { valid, create, transactions } = await setUp();

    const response = await create(valid);

    expect(response.statusCode).toBe(201);
    expect(response.json().series).toMatchObject({ description: 'Academia', frequency: 'monthly' });
    expect(response.json().occurrencesCreated).toBeGreaterThan(0);
    const october = (await transactions('2026-10')).json().items;
    expect(october).toEqual([
      expect.objectContaining({
        description: 'Academia',
        status: 'pending',
        financialDate: '2026-10-05',
        recurrenceSeriesId: response.json().series.id,
      }),
    ]);
  });

  it('lists series and audits creation', async () => {
    const { valid, create, list } = await setUp();
    await create(valid);

    expect((await list()).json().items).toHaveLength(1);
    expect(repositories.audit.events.at(-1)).toMatchObject({
      entityType: 'recurrence_series',
      action: 'create',
    });
  });

  it('materializes later months on request without duplicates', async () => {
    const { valid, create, materialize } = await setUp();
    await create(valid);

    const first = (await materialize('2040-01')).json().occurrencesCreated;
    const again = (await materialize('2040-01')).json().occurrencesCreated;

    expect(first).toBeGreaterThan(0);
    expect(again).toBe(0);
  });

  it.each([
    ['an end before the start', { endDate: '2026-10-01' }],
    ['an unknown frequency', { frequency: 'daily' }],
    ['an unknown rule', { nonBusinessDayRule: 'nearest' }],
    ['a zero amount', { amountMinor: 0 }],
    ['an invalid start', { startDate: '2026-02-30' }],
  ])('rejects %s', async (_case, override) => {
    const { valid, create } = await setUp();

    expect((await create({ ...valid, ...override })).statusCode).toBe(400);
  });

  it('rejects a category of the wrong kind', async () => {
    const { valid, create, byName } = await setUp();

    expect((await create({ ...valid, categoryId: byName('Receitas') })).statusCode).toBe(422);
  });

  it("hides another user's series", async () => {
    const { valid, create, list } = await setUp();
    await create(valid);

    expect((await list(asBruno)).statusCode).toBe(404);
    expect((await create(valid, asBruno)).statusCode).toBe(404);
  });
});
