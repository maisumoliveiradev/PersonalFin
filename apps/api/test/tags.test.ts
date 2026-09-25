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
  const food = categories.find((category) => category.name === 'Alimentação')?.id;
  const createTag = (name: string, headers = asAna) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/tags`,
      headers,
      payload: { name },
    });
  const patchTag = (tagId: string, payload: object) =>
    server.inject({
      method: 'PATCH',
      url: `/financial-spaces/${spaceId}/tags/${tagId}`,
      headers: asAna,
      payload,
    });
  const add = (payload: object) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Jantar',
        amountMinor: 8_000,
        financialDate: '2026-10-02',
        categoryId: food,
        ...payload,
      },
    });
  const list = async (query = '') =>
    (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/transactions?${query}`,
        headers: asAna,
      })
    ).json().items;
  return { spaceId, createTag, patchTag, add, list };
}

describe('tags', () => {
  it('creates tags with unique names per space, ignoring case', async () => {
    const { createTag } = await setUp();

    const created = await createTag('  Viagem   Europa ');
    const duplicate = await createTag('viagem europa');

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ name: 'Viagem Europa', archived: false, version: 1 });
    expect(duplicate.json().error.code).toBe('TAG_NAME_TAKEN');
  });

  it('labels transactions without changing amounts and filters by tag', async () => {
    const { spaceId, createTag, add, list } = await setUp();
    const trip = (await createTag('Viagem')).json();
    const work = (await createTag('Trabalho')).json();
    await add({ tagIds: [trip.id, work.id] });
    await add({ description: 'Mercado', amountMinor: 1_000 });

    const tagged = await list(`tagId=${trip.id}`);
    const dashboard = (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/dashboard?month=2026-10`,
        headers: asAna,
      })
    ).json();

    expect(tagged).toHaveLength(1);
    expect(tagged[0].tags.map((tag: { name: string }) => tag.name)).toEqual(['Trabalho', 'Viagem']);
    expect(dashboard.realizedExpenses).toBe(9_000);
  });

  it('replaces tags on edit and audits the change', async () => {
    const { spaceId, createTag, add } = await setUp();
    const trip = (await createTag('Viagem')).json();
    const work = (await createTag('Trabalho')).json();
    const created = (await add({ tagIds: [trip.id] })).json();

    const response = await server.inject({
      method: 'PATCH',
      url: `/financial-spaces/${spaceId}/transactions/${created.id}`,
      headers: asAna,
      payload: { version: 1, tagIds: [work.id] },
    });

    expect(response.json()).toMatchObject({ version: 2, tags: [{ name: 'Trabalho' }] });
    expect(repositories.audit.events.at(-1)?.changes.tagIds).toEqual({
      before: trip.id,
      after: work.id,
    });
  });

  it('keeps archived tags on transactions but not for new ones', async () => {
    const { createTag, patchTag, add } = await setUp();
    const trip = (await createTag('Viagem')).json();
    await add({ tagIds: [trip.id] });

    await patchTag(trip.id, { version: 1, archived: true });
    const rejected = await add({ tagIds: [trip.id] });

    expect(rejected.statusCode).toBe(422);
    expect(rejected.json().error.code).toBe('TAG_NOT_AVAILABLE');
  });

  it('deletes only never-used tags', async () => {
    const { spaceId, createTag, add } = await setUp();
    const used = (await createTag('Viagem')).json();
    const unused = (await createTag('Nunca')).json();
    await add({ tagIds: [used.id] });
    const remove = (tagId: string) =>
      server.inject({
        method: 'DELETE',
        url: `/financial-spaces/${spaceId}/tags/${tagId}?version=1`,
        headers: asAna,
      });

    expect((await remove(used.id)).json().error.code).toBe('TAG_IN_USE');
    expect((await remove(unused.id)).statusCode).toBe(204);
  });

  it('rejects more than 10 tags and tags of other spaces', async () => {
    const { add, createTag } = await setUp();
    const ids = [];
    for (let index = 0; index < 11; index += 1) {
      ids.push((await createTag(`Tag ${index}`)).json().id);
    }
    const otherSpace = (
      await server.inject({
        method: 'POST',
        url: '/financial-spaces',
        headers: asBruno,
        payload: { name: 'Bruno' },
      })
    ).json().id;
    const foreign = (
      await server.inject({
        method: 'POST',
        url: `/financial-spaces/${otherSpace}/tags`,
        headers: asBruno,
        payload: { name: 'Dele' },
      })
    ).json();

    expect((await add({ tagIds: ids })).statusCode).toBe(400);
    expect((await add({ tagIds: [foreign.id] })).json().error.code).toBe('TAG_NOT_AVAILABLE');
    expect((await createTag('Intruso', asBruno)).statusCode).toBe(404);
  });
});
