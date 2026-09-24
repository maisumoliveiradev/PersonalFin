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

const nubank = {
  name: 'Nubank',
  closingDay: 3,
  dueDay: 10,
  limitMinor: 500_000,
  limitEffectiveFrom: '2026-01-01',
};

async function createSpace(): Promise<string> {
  return (
    await server.inject({
      method: 'POST',
      url: '/financial-spaces',
      headers: asAna,
      payload: { name: 'Pessoal' },
    })
  ).json().id;
}

function createCard(spaceId: string, payload: object, headers = asAna) {
  return server.inject({
    method: 'POST',
    url: `/financial-spaces/${spaceId}/cards`,
    headers,
    payload,
  });
}

describe('cards', () => {
  it('creates a card with its first limit and audits it', async () => {
    const spaceId = await createSpace();

    const response = await createCard(spaceId, { ...nubank, name: '  Nubank   Roxo ' });

    expect(response.statusCode).toBe(201);
    const card = response.json();
    expect(card).toMatchObject({
      name: 'Nubank Roxo',
      closingDay: 3,
      dueDay: 10,
      archived: false,
      version: 1,
      limits: [{ amountMinor: 500_000, currency: 'BRL', effectiveFrom: '2026-01-01' }],
    });
    expect(repositories.audit.events).toContainEqual(
      expect.objectContaining({ entityType: 'card', entityId: card.id, action: 'create' }),
    );
  });

  it.each([
    { name: '' },
    { closingDay: 0 },
    { dueDay: 32 },
    { closingDay: 2.5 },
    { limitMinor: 0 },
    { limitMinor: -100 },
    { limitEffectiveFrom: '2026-02-30' },
  ])('rejects %j', async (change) => {
    const spaceId = await createSpace();

    expect((await createCard(spaceId, { ...nubank, ...change })).statusCode).toBe(400);
  });

  it('rejects a name already used in the space, ignoring case', async () => {
    const spaceId = await createSpace();
    await createCard(spaceId, nubank);

    const response = await createCard(spaceId, { ...nubank, name: 'NUBANK' });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CARD_NAME_TAKEN');
  });

  it('appends limit changes without overwriting earlier values', async () => {
    const spaceId = await createSpace();
    const card = (await createCard(spaceId, nubank)).json();

    const response = await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/cards/${card.id}/limit-changes`,
      headers: asAna,
      payload: { amountMinor: 750_000, effectiveFrom: '2026-06-01' },
    });

    expect(response.statusCode).toBe(201);
    expect(
      response
        .json()
        .limits.map((limit: { amountMinor: number; effectiveFrom: string }) => [
          limit.amountMinor,
          limit.effectiveFrom,
        ]),
    ).toEqual([
      [750_000, '2026-06-01'],
      [500_000, '2026-01-01'],
    ]);
  });

  it('edits, archives, and rejects stale versions', async () => {
    const spaceId = await createSpace();
    const card = (await createCard(spaceId, nubank)).json();
    const patch = (payload: object) =>
      server.inject({
        method: 'PATCH',
        url: `/financial-spaces/${spaceId}/cards/${card.id}`,
        headers: asAna,
        payload,
      });

    const edited = await patch({ version: 1, closingDay: 28, dueDay: 5, archived: true });
    const stale = await patch({ version: 1, name: 'Outro' });

    expect(edited.json()).toMatchObject({ closingDay: 28, dueDay: 5, archived: true, version: 2 });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('VERSION_CONFLICT');
  });

  it('lists active cards before archived ones', async () => {
    const spaceId = await createSpace();
    const inter = (await createCard(spaceId, { ...nubank, name: 'Inter' })).json();
    await createCard(spaceId, { ...nubank, name: 'Nubank' });
    await server.inject({
      method: 'PATCH',
      url: `/financial-spaces/${spaceId}/cards/${inter.id}`,
      headers: asAna,
      payload: { version: 1, archived: true },
    });

    const list = await server.inject({
      method: 'GET',
      url: `/financial-spaces/${spaceId}/cards`,
      headers: asAna,
    });

    expect(list.json().items.map((card: { name: string }) => card.name)).toEqual([
      'Nubank',
      'Inter',
    ]);
  });

  it("hides another user's cards", async () => {
    const spaceId = await createSpace();
    const card = (await createCard(spaceId, nubank)).json();

    const requests = [
      server.inject({ method: 'GET', url: `/financial-spaces/${spaceId}/cards`, headers: asBruno }),
      server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/cards/${card.id}`,
        headers: asBruno,
      }),
      createCard(spaceId, nubank, asBruno),
      server.inject({
        method: 'POST',
        url: `/financial-spaces/${spaceId}/cards/${card.id}/limit-changes`,
        headers: asBruno,
        payload: { amountMinor: 1, effectiveFrom: '2026-01-01' },
      }),
    ];

    for (const response of await Promise.all(requests)) {
      expect(response.statusCode).toBe(404);
    }
  });

  it('returns 404 for an unknown or malformed card id', async () => {
    const spaceId = await createSpace();

    for (const cardId of ['not-a-uuid', '00000000-0000-4000-8000-000000000000']) {
      const response = await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/cards/${cardId}`,
        headers: asAna,
      });
      expect(response.json().error.code).toBe('CARD_NOT_FOUND');
    }
  });
});
