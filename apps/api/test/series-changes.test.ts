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
  const health = categories.find((category) => category.name === 'Saúde')?.id;
  const series = (
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/recurrences`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Academia',
        amountMinor: 10_000,
        categoryId: health,
        frequency: 'monthly',
        nonBusinessDayRule: 'keep',
        startDate: '2026-10-10',
      },
    })
  ).json().series;
  const base = `/financial-spaces/${spaceId}/recurrences/${series.id}`;
  return {
    patch: (payload: object, headers = asAna) =>
      server.inject({ method: 'PATCH', url: base, headers, payload }),
    end: (payload: object, headers = asAna) =>
      server.inject({ method: 'POST', url: `${base}/end`, headers, payload }),
  };
}

describe('series changes API', () => {
  it('updates defaults from an occurrence on', async () => {
    const { patch } = await setUp();

    const response = await patch({
      version: 1,
      fromOccurrenceDate: '2026-12-10',
      amountMinor: 12_000,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().series).toMatchObject({ amountMinor: 12_000, version: 2 });
    expect(response.json().occurrencesAffected).toBeGreaterThan(0);
  });

  it('ends a series', async () => {
    const { end } = await setUp();

    const response = await end({ version: 1, endDate: '2026-12-31' });

    expect(response.statusCode).toBe(200);
    expect(response.json().series.endDate).toBe('2026-12-31');
  });

  it.each([
    [{ fromOccurrenceDate: '2026-12-10', amountMinor: 1 }],
    [{ version: 1, amountMinor: 1 }],
    [{ version: 1, fromOccurrenceDate: '2026-12-10', frequency: 'weekly' }],
    [{ version: 1, fromOccurrenceDate: '2026-02-30' }],
  ])('rejects an invalid series edit %o', async (payload) => {
    const { patch } = await setUp();

    expect((await patch(payload)).statusCode).toBe(400);
  });

  it('hides the series from other users', async () => {
    const { patch, end } = await setUp();

    expect(
      (await patch({ version: 1, fromOccurrenceDate: '2026-12-10', amountMinor: 1 }, asBruno))
        .statusCode,
    ).toBe(404);
    expect((await end({ version: 1, endDate: '2026-12-31' }, asBruno)).statusCode).toBe(404);
  });
});
