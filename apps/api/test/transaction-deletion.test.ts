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
  const created = (
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Engano',
        amountMinor: 1000,
        financialDate: '2026-01-05',
        categoryId: categories.find((category) => category.name === 'Alimentação')?.id,
      },
    })
  ).json();
  const base = `/financial-spaces/${spaceId}/transactions`;
  const url = `${base}/${created.id}`;
  return {
    created,
    remove: (version: number, headers = asAna) =>
      server.inject({ method: 'DELETE', url: `${url}?version=${version}`, headers }),
    restore: (version: number, headers = asAna) =>
      server.inject({ method: 'POST', url: `${url}/restore`, headers, payload: { version } }),
    list: (state?: string) =>
      server.inject({
        method: 'GET',
        url: state === undefined ? base : `${base}?state=${state}`,
        headers: asAna,
      }),
    edit: (version: number) =>
      server.inject({
        method: 'PATCH',
        url,
        headers: asAna,
        payload: { version, description: 'x' },
      }),
  };
}

describe('transaction soft delete and restore', () => {
  it('moves a deleted transaction from the list to the trash and back on restore', async () => {
    const { created, remove, restore, list } = await setUp();

    const deleted = await remove(1);

    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toMatchObject({ id: created.id, version: 2 });
    expect(deleted.json().deletedAt).not.toBeNull();
    expect((await list()).json().items).toEqual([]);
    expect((await list('deleted')).json().items.map((item: { id: string }) => item.id)).toEqual([
      created.id,
    ]);

    const restored = await restore(2);

    expect(restored.statusCode).toBe(200);
    expect(restored.json()).toEqual({ ...created, version: 3, deletedAt: null });
    expect((await list()).json().items).toHaveLength(1);
    expect((await list('deleted')).json().items).toEqual([]);
  });

  it('audits delete and restore', async () => {
    const { created, remove, restore } = await setUp();

    await remove(1);
    await restore(2);

    expect(repositories.audit.events.map((event) => event.action)).toEqual(['delete', 'restore']);
    expect(repositories.audit.events[0]).toMatchObject({
      entityId: created.id,
      changes: { deletedAt: { before: null } },
    });
  });

  it('rejects deleting twice and restoring an active transaction', async () => {
    const { remove, restore } = await setUp();

    expect((await restore(1)).json().error.code).toBe('TRANSACTION_NOT_DELETED');
    await remove(1);
    const again = await remove(2);

    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('TRANSACTION_ALREADY_DELETED');
  });

  it('rejects a stale version', async () => {
    const { remove } = await setUp();

    const response = await remove(7);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('VERSION_CONFLICT');
  });

  it('does not allow editing a deleted transaction', async () => {
    const { remove, edit } = await setUp();
    await remove(1);

    const response = await edit(2);

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('TRANSACTION_DELETED');
  });

  it('requires the version and hides the transaction from other users', async () => {
    const { remove, restore, created } = await setUp();

    const missingVersion = await server.inject({
      method: 'DELETE',
      url: `/financial-spaces/x/transactions/${created.id}`,
      headers: asAna,
    });
    expect(missingVersion.statusCode).toBe(404);
    expect((await remove(1, asBruno)).statusCode).toBe(404);
    await remove(1);
    expect((await restore(2, asBruno)).statusCode).toBe(404);
  });

  it('rejects an unknown list state', async () => {
    const { list } = await setUp();

    expect((await list('archived')).statusCode).toBe(400);
  });
});
