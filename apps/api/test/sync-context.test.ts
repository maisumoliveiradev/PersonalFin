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
  const categories = (
    await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/categories`,
      headers: asAna,
    })
  ).json().items as { id: string; name: string }[];
  const food = categories.find((category) => category.name === 'Alimentação');
  const created = (
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Mercado',
        amountMinor: 1000,
        financialDate: '2026-09-25',
        categoryId: food?.id,
      },
    })
  ).json();
  const url = `/financial-spaces/${spaceId}/transactions/${created.id}`;
  const history = async () =>
    (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/audit-events`,
        headers: asAna,
      })
    ).json().items;
  return { url, history };
}

describe('offline sync context in the audit history', () => {
  it('records the resolution of an edit, a deletion, and a restore', async () => {
    const { url, history } = await setUp();

    const edited = await server.inject({
      method: 'PATCH',
      url,
      headers: asAna,
      payload: {
        version: 1,
        description: 'Supermercado',
        sync: { resolution: 'auto_merged', baseVersion: 1 },
      },
    });
    expect(edited.statusCode).toBe(200);
    const deleted = await server.inject({
      method: 'DELETE',
      url: `${url}?version=2&syncResolution=deleted_anyway&syncBaseVersion=1`,
      headers: asAna,
    });
    expect(deleted.statusCode).toBe(200);
    const restored = await server.inject({
      method: 'POST',
      url: `${url}/restore`,
      headers: asAna,
      payload: { version: 3, sync: { resolution: 'restored', baseVersion: 2 } },
    });
    expect(restored.statusCode).toBe(200);

    const contexts = (await history()).map(
      (item: { action: string; context: unknown }) => [item.action, item.context] as const,
    );
    expect(contexts).toEqual([
      ['restore', { source: 'offline_sync', resolution: 'restored', baseVersion: 2 }],
      ['delete', { source: 'offline_sync', resolution: 'deleted_anyway', baseVersion: 1 }],
      ['update', { source: 'offline_sync', resolution: 'auto_merged', baseVersion: 1 }],
    ]);
  });

  it('keeps a null context for ordinary changes', async () => {
    const { url, history } = await setUp();
    await server.inject({
      method: 'PATCH',
      url,
      headers: asAna,
      payload: { version: 1, description: 'Feira' },
    });
    expect((await history())[0].context).toBeNull();
  });

  it('rejects unknown resolutions and incomplete deletion context', async () => {
    const { url } = await setUp();
    const unknown = await server.inject({
      method: 'PATCH',
      url,
      headers: asAna,
      payload: { version: 1, description: 'Feira', sync: { resolution: 'mine', baseVersion: 1 } },
    });
    expect(unknown.statusCode).toBe(400);
    const incomplete = await server.inject({
      method: 'DELETE',
      url: `${url}?version=1&syncResolution=deleted_anyway`,
      headers: asAna,
    });
    expect(incomplete.statusCode).toBe(400);
  });
});
