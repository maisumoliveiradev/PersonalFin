import type { SpacePermission } from '@personalfin/domain';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildTestServer,
  createInMemoryRepositories,
  sessionCookie,
} from './support/test-server.ts';
import { bruno, sessions } from './support/users.ts';

let repositories = createInMemoryRepositories();
let server = buildTestServer({ sessions, repositories });
const asAna = { cookie: sessionCookie('ana-token') };
const asBruno = { cookie: sessionCookie('bruno-token') };
const MISSING = '00000000-0000-4000-8000-000000000000';

beforeEach(async () => {
  await server.close();
  repositories = createInMemoryRepositories();
  server = buildTestServer({ sessions, repositories });
});

afterAll(async () => {
  await server.close();
});

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  permission: SpacePermission;
  payload?: object;
}

const ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '', permission: 'view' },
  { method: 'GET', path: '/categories', permission: 'view' },
  {
    method: 'POST',
    path: '/categories',
    permission: 'classify',
    payload: { name: 'X', kind: 'expense' },
  },
  {
    method: 'PATCH',
    path: `/categories/${MISSING}`,
    permission: 'classify',
    payload: { version: 1 },
  },
  { method: 'DELETE', path: `/categories/${MISSING}?version=1`, permission: 'classify' },
  { method: 'GET', path: '/tags', permission: 'view' },
  { method: 'POST', path: '/tags', permission: 'classify', payload: { name: 'X' } },
  { method: 'GET', path: '/transactions', permission: 'view' },
  { method: 'GET', path: `/transactions/${MISSING}`, permission: 'view' },
  { method: 'POST', path: '/transactions', permission: 'record', payload: {} },
  {
    method: 'PATCH',
    path: `/transactions/${MISSING}`,
    permission: 'record',
    payload: { version: 1 },
  },
  { method: 'DELETE', path: `/transactions/${MISSING}?version=1`, permission: 'record' },
  {
    method: 'POST',
    path: `/transactions/${MISSING}/restore`,
    permission: 'record',
    payload: { version: 1 },
  },
  { method: 'GET', path: '/balance-snapshots', permission: 'view' },
  { method: 'POST', path: '/balance-snapshots', permission: 'record', payload: {} },
  { method: 'GET', path: '/balance-reminder', permission: 'view' },
  {
    method: 'PUT',
    path: '/balance-reminder',
    permission: 'view',
    payload: { frequency: 'never', intervalDays: null },
  },
  { method: 'GET', path: '/dashboard?month=2026-10', permission: 'view' },
  { method: 'GET', path: '/projection?fromMonth=2026-10', permission: 'view' },
  { method: 'GET', path: '/commitments?from=2026-10-01', permission: 'view' },
  { method: 'GET', path: '/recurrences', permission: 'view' },
  { method: 'POST', path: '/recurrences', permission: 'plan', payload: {} },
  { method: 'PATCH', path: `/recurrences/${MISSING}`, permission: 'plan', payload: {} },
  { method: 'POST', path: `/recurrences/${MISSING}/end`, permission: 'plan', payload: {} },
  {
    method: 'POST',
    path: '/recurrences/materialize',
    permission: 'view',
    payload: { throughMonth: '2026-10' },
  },
  { method: 'GET', path: '/cards', permission: 'view' },
  { method: 'POST', path: '/cards', permission: 'plan', payload: {} },
  { method: 'GET', path: `/cards/${MISSING}`, permission: 'view' },
  { method: 'PATCH', path: `/cards/${MISSING}`, permission: 'plan', payload: { version: 1 } },
  { method: 'POST', path: `/cards/${MISSING}/limit-changes`, permission: 'plan', payload: {} },
  { method: 'GET', path: '/card-limits?on=2026-10-01', permission: 'view' },
  { method: 'GET', path: `/cards/${MISSING}/invoices/2026-10`, permission: 'view' },
  { method: 'GET', path: `/cards/${MISSING}/invoices?fromMonth=2026-10`, permission: 'view' },
  {
    method: 'PUT',
    path: `/cards/${MISSING}/invoices/2026-10/dates`,
    permission: 'plan',
    payload: {},
  },
  {
    method: 'POST',
    path: `/cards/${MISSING}/invoices/2026-10/payments`,
    permission: 'record',
    payload: {},
  },
  {
    method: 'DELETE',
    path: `/cards/${MISSING}/invoices/2026-10/payments/${MISSING}`,
    permission: 'record',
  },
  {
    method: 'POST',
    path: `/installment-purchases/${MISSING}/cancel`,
    permission: 'record',
    payload: {},
  },
  { method: 'GET', path: '/analytics/evolution?fromMonth=2026-10', permission: 'view' },
  { method: 'GET', path: '/analytics/comparison?month=2026-10', permission: 'view' },
  { method: 'GET', path: '/analytics/breakdown?fromMonth=2026-10', permission: 'view' },
  { method: 'GET', path: '/members', permission: 'view' },
  { method: 'GET', path: '/audit-events', permission: 'view_audit' },
  {
    method: 'PATCH',
    path: `/members/${MISSING}`,
    permission: 'manage_members',
    payload: { version: 1, permissions: [] },
  },
  { method: 'DELETE', path: `/members/${MISSING}?version=1`, permission: 'manage_members' },
  { method: 'GET', path: '/invitations', permission: 'manage_members' },
  {
    method: 'POST',
    path: '/invitations',
    permission: 'manage_members',
    payload: { email: 'carla@example.com', preset: 'viewer' },
  },
  { method: 'DELETE', path: `/invitations/${MISSING}`, permission: 'manage_members' },
  { method: 'GET', path: '/dashboard-preferences', permission: 'view' },
  {
    method: 'PUT',
    path: '/dashboard-preferences',
    permission: 'view',
    payload: { profile: 'basic', overrides: {} },
  },
  { method: 'GET', path: '/debts', permission: 'view' },
  { method: 'POST', path: '/debts', permission: 'plan', payload: {} },
  { method: 'GET', path: `/debts/${MISSING}`, permission: 'view' },
  { method: 'PATCH', path: `/debts/${MISSING}`, permission: 'plan', payload: { version: 1 } },
  { method: 'POST', path: `/debts/${MISSING}/payments`, permission: 'record', payload: {} },
  { method: 'DELETE', path: `/debts/${MISSING}/payments/${MISSING}`, permission: 'record' },
  { method: 'POST', path: `/debts/${MISSING}/simulations`, permission: 'view', payload: {} },
  { method: 'POST', path: `/debts/${MISSING}/prepayments`, permission: 'record', payload: {} },
  { method: 'GET', path: '/goals', permission: 'view' },
  { method: 'POST', path: '/goals', permission: 'plan', payload: {} },
  { method: 'GET', path: `/goals/${MISSING}`, permission: 'view' },
  { method: 'PATCH', path: `/goals/${MISSING}`, permission: 'plan', payload: { version: 1 } },
  { method: 'POST', path: `/goals/${MISSING}/progress`, permission: 'plan', payload: {} },
  { method: 'GET', path: '/reminders?today=2026-10-01', permission: 'view' },
  {
    method: 'POST',
    path: '/reminders/dismissals',
    permission: 'view',
    payload: { key: 'transaction:x', stage: 'before-0' },
  },
  { method: 'GET', path: '/reminder-settings', permission: 'view' },
  {
    method: 'PUT',
    path: '/reminder-settings',
    permission: 'view',
    payload: { offsets: [0], kinds: ['transactions'] },
  },
  { method: 'GET', path: '/imports', permission: 'view' },
  { method: 'POST', path: '/imports', permission: 'record', payload: {} },
  { method: 'GET', path: `/imports/${MISSING}`, permission: 'view' },
  { method: 'GET', path: `/imports/${MISSING}/rows`, permission: 'view' },
  { method: 'PUT', path: `/imports/${MISSING}/mapping`, permission: 'record', payload: {} },
  { method: 'PUT', path: `/imports/${MISSING}/decisions`, permission: 'record', payload: {} },
  { method: 'POST', path: `/imports/${MISSING}/confirm`, permission: 'record', payload: {} },
  { method: 'POST', path: `/imports/${MISSING}/undo`, permission: 'record', payload: {} },
  { method: 'POST', path: `/imports/${MISSING}/discard`, permission: 'record', payload: {} },
  { method: 'GET', path: '/exports/transactions?format=csv', permission: 'view' },
];

async function shareWith(permissions: SpacePermission[]): Promise<string> {
  const spaceId: string = (
    await server.inject({
      method: 'POST',
      url: '/financial-spaces',
      headers: asAna,
      payload: { name: 'Casa' },
    })
  ).json().id;
  repositories.financialSpaces.members.push({
    financialSpaceId: spaceId,
    userId: bruno.id,
    permissions,
  });
  return spaceId;
}

function call(spaceId: string, endpoint: Endpoint, headers = asBruno) {
  return server.inject({
    method: endpoint.method,
    url: `/financial-spaces/${spaceId}${endpoint.path}`,
    headers,
    ...(endpoint.payload === undefined ? {} : { payload: endpoint.payload }),
  });
}

describe('space permissions', () => {
  it.each(ENDPOINTS.filter((endpoint) => endpoint.permission !== 'view'))(
    'a viewer is denied $method $path',
    async (endpoint) => {
      const spaceId = await shareWith(['view']);

      const response = await call(spaceId, endpoint);

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('PERMISSION_DENIED');
    },
  );

  it.each(ENDPOINTS)(
    'a member with $permission passes the check of $method $path',
    async (endpoint) => {
      const spaceId = await shareWith([endpoint.permission]);

      const response = await call(spaceId, endpoint);

      expect(response.statusCode).not.toBe(403);
      const body = String(response.headers['content-type']).startsWith('application/json')
        ? response.json()
        : null;
      expect(body?.error?.code).not.toBe('FINANCIAL_SPACE_NOT_FOUND');
    },
  );

  it.each(ENDPOINTS)('a non-member receives 404 for $method $path', async (endpoint) => {
    const spaceId = await shareWith(['view']);
    repositories.financialSpaces.members.length = 0;

    expect((await call(spaceId, endpoint)).statusCode).toBe(404);
  });

  it('lists shared spaces with the member role and permissions', async () => {
    const spaceId = await shareWith(['view', 'record']);

    const list = (
      await server.inject({ method: 'GET', url: '/financial-spaces', headers: asBruno })
    ).json();
    const owner = (
      await server.inject({ method: 'GET', url: `/financial-spaces/${spaceId}`, headers: asAna })
    ).json();

    expect(list.items).toEqual([
      expect.objectContaining({ id: spaceId, role: 'member', permissions: ['view', 'record'] }),
    ]);
    expect(owner).toMatchObject({ role: 'owner' });
    expect(owner.permissions).toHaveLength(6);
  });

  it('lets a contributor record what the owner then sees', async () => {
    const spaceId = await shareWith(['view', 'record']);
    const categories = (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/categories`,
        headers: asBruno,
      })
    ).json().items;

    const created = await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asBruno,
      payload: {
        type: 'expense',
        description: 'Mercado',
        amountMinor: 1_000,
        financialDate: '2026-10-01',
        categoryId: categories[0].id,
      },
    });
    const seen = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
    });

    expect(created.statusCode).toBe(201);
    expect(seen.json().items).toHaveLength(1);
  });
});
