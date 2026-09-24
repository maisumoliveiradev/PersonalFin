import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildTestServer,
  createInMemoryRepositories,
  sessionCookie,
} from './support/test-server.ts';
import { ana, bruno, sessions } from './support/users.ts';

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

function createSpace(headers: Record<string, string>, payload: unknown) {
  return server.inject({
    method: 'POST',
    url: '/financial-spaces',
    headers,
    payload: payload as object,
  });
}

describe('POST /financial-spaces', () => {
  it('requires authentication', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/financial-spaces',
      payload: { name: 'Pessoal' },
    });

    expect(response.statusCode).toBe(401);
    expect(repositories.financialSpaces.spaces).toHaveLength(0);
  });

  it('creates an active space owned by the creator', async () => {
    const response = await createSpace(asAna, { name: 'Pessoal' });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: 'Pessoal',
      lifecycleState: 'active',
      role: 'owner',
    });
    expect(repositories.financialSpaces.spaces[0]?.ownerUserId).toBe(ana.id);
  });

  it('normalizes surrounding and repeated whitespace in the name', async () => {
    const response = await createSpace(asAna, { name: '  Casa   da  Família ' });

    expect(response.json()).toMatchObject({ name: 'Casa da Família' });
  });

  it.each([
    ['an empty name', { name: '' }],
    ['a whitespace-only name', { name: '   ' }],
    ['a name longer than 80 characters', { name: 'x'.repeat(81) }],
    ['a missing name', {}],
    ['a non-string name', { name: 42 }],
    ['an owner override', { name: 'Pessoal', ownerUserId: bruno.id }],
  ])('rejects %s', async (_case, payload) => {
    const response = await createSpace(asAna, payload);

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_FAILED');
    expect(repositories.financialSpaces.spaces).toHaveLength(0);
  });
});

describe('GET /financial-spaces', () => {
  it('lists only the spaces the user can access', async () => {
    await createSpace(asAna, { name: 'Pessoal da Ana' });
    await createSpace(asBruno, { name: 'Pessoal do Bruno' });

    const response = await server.inject({
      method: 'GET',
      url: '/financial-spaces',
      headers: asAna,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items.map((space: { name: string }) => space.name)).toEqual([
      'Pessoal da Ana',
    ]);
  });

  it('returns an empty list for a user without spaces', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/financial-spaces',
      headers: asAna,
    });

    expect(response.json()).toEqual({ items: [] });
  });
});

describe('GET /financial-spaces/:spaceId', () => {
  it('returns a space to its owner', async () => {
    const created = (await createSpace(asAna, { name: 'Pessoal' })).json();

    const response = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${created.id}`,
      headers: asAna,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(created);
  });

  it("hides another user's space as not found", async () => {
    const created = (await createSpace(asAna, { name: 'Pessoal' })).json();

    const response = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${created.id}`,
      headers: asBruno,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('FINANCIAL_SPACE_NOT_FOUND');
  });

  it('treats a malformed id as not found', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/financial-spaces/not-a-uuid',
      headers: asAna,
    });

    expect(response.statusCode).toBe(404);
  });
});
