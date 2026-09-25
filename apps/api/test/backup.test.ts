import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { SPACE_TABLES } from '../src/modules/backup/backup.ts';
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

describe('portable backup', () => {
  it('downloads a versioned JSON of every accessible space, deleted records included', async () => {
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
    const created = (
      await server.inject({
        method: 'POST',
        url: `/financial-spaces/${spaceId}/transactions`,
        headers: asAna,
        payload: {
          type: 'expense',
          description: 'Padaria',
          amountMinor: 1250,
          financialDate: '2026-10-05',
          categoryId: categories.find((category) => category.name === 'Alimentação')?.id,
        },
      })
    ).json();
    await server.inject({
      method: 'DELETE',
      url: `/financial-spaces/${spaceId}/transactions/${created.id}?version=1`,
      headers: asAna,
    });

    const response = await server.inject({ method: 'GET', url: '/me/backup', headers: asAna });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="personalfin-backup-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    const backup = response.json();
    expect(backup).toMatchObject({
      format: 'personalfin-backup',
      formatVersion: 1,
      user: { email: 'ana@example.com' },
      spaces: [{ id: spaceId, name: 'Casa', role: 'owner' }],
      globalGoals: [],
    });
    expect(Object.keys(backup.spaces[0].tables)).toEqual(
      expect.arrayContaining([...SPACE_TABLES, 'dashboard_preference', 'reminder_setting']),
    );
    expect(backup.spaces[0].tables.financial_transaction).toMatchObject([
      { id: created.id, amount_minor: 1250 },
    ]);
    expect(backup.spaces[0].tables.financial_transaction[0].deleted_at).not.toBeNull();
    expect(Object.keys(backup.spaces[0].tables)).not.toContain('space_invitation');
    expect(Object.keys(backup.spaces[0].tables)).not.toContain('financial_space_member');
  });

  it('contains only the caller data', async () => {
    await server.inject({
      method: 'POST',
      url: '/financial-spaces',
      headers: asAna,
      payload: { name: 'Casa' },
    });
    const response = await server.inject({ method: 'GET', url: '/me/backup', headers: asBruno });
    expect(response.json().spaces).toEqual([]);
  });

  it('requires a session', async () => {
    expect((await server.inject({ method: 'GET', url: '/me/backup' })).statusCode).toBe(401);
  });
});
