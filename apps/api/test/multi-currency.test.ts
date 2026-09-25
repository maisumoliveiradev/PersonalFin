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

function call(method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) {
  return server.inject({
    method,
    url,
    headers: asAna,
    ...(payload === undefined ? {} : { payload }),
  });
}

async function setUp() {
  const spaceId: string = (await call('POST', '/financial-spaces', { name: 'Viagem' })).json().id;
  const base = `/financial-spaces/${spaceId}`;
  const categories = (await call('GET', `${base}/categories`)).json().items as {
    id: string;
    name: string;
  }[];
  const food = categories.find((category) => category.name === 'Alimentação')?.id;
  const expense = (payload: object) =>
    call('POST', `${base}/transactions`, {
      type: 'expense',
      description: 'Jantar em Nova York',
      financialDate: '2026-10-05',
      categoryId: food,
      ...payload,
    });
  return { base, expense };
}

describe('multi-currency transactions (DR-004, DR-098)', () => {
  it('converts with the given rate and keeps the original amount and rate', async () => {
    const { expense } = await setUp();

    const response = await expense({
      foreign: { currency: 'USD', amountMinor: 1_001, rate: '5.4321' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      amountMinor: 5_438,
      currency: 'BRL',
      original: { currency: 'USD', amountMinor: 1_001, rate: '5.4321', rateSource: 'manual' },
    });
  });

  it('uses the latest recorded rate on or before the date, or asks for one', async () => {
    const { base, expense } = await setUp();
    expect(
      (await expense({ foreign: { currency: 'EUR', amountMinor: 1_000 } })).json().error.code,
    ).toBe('EXCHANGE_RATE_REQUIRED');
    await call('POST', `${base}/exchange-rates`, {
      currency: 'EUR',
      rateDate: '2026-10-01',
      rate: '6.10',
    });
    await call('POST', `${base}/exchange-rates`, {
      currency: 'EUR',
      rateDate: '2026-10-10',
      rate: '6.50',
    });

    const response = await expense({ foreign: { currency: 'EUR', amountMinor: 1_000 } });

    expect(response.json()).toMatchObject({ amountMinor: 6_100, original: { rate: '6.1' } });
    const latest = await call('GET', `${base}/exchange-rates/latest?currency=EUR&on=2026-10-31`);
    expect(latest.json().rate).toMatchObject({ rate: '6.5', rateDate: '2026-10-10' });
    const list = await call('GET', `${base}/exchange-rates?currency=EUR`);
    expect(list.json().items.map((rate: { rate: string }) => rate.rate)).toEqual(['6.5', '6.1']);
  });

  it('preserves the applied rate when new rates are recorded later', async () => {
    const { base, expense } = await setUp();
    await call('POST', `${base}/exchange-rates`, {
      currency: 'USD',
      rateDate: '2026-10-01',
      rate: '5',
    });
    const created = (await expense({ foreign: { currency: 'USD', amountMinor: 1_000 } })).json();
    await call('POST', `${base}/exchange-rates`, {
      currency: 'USD',
      rateDate: '2026-10-01',
      rate: '6',
    });

    const reread = await call('GET', `${base}/transactions/${created.id}`);
    expect(reread.json()).toMatchObject({ amountMinor: 5_000, original: { rate: '5' } });
  });

  it('edits the original amount, converts to base only explicitly, and audits it', async () => {
    const { base, expense } = await setUp();
    const created = (
      await expense({ foreign: { currency: 'USD', amountMinor: 1_000, rate: '5' } })
    ).json();
    const url = `${base}/transactions/${created.id}`;

    const blocked = await call('PATCH', url, { version: 1, amountMinor: 4_000 });
    expect(blocked.json().error.code).toBe('FOREIGN_AMOUNT_REQUIRED');

    const edited = await call('PATCH', url, {
      version: 1,
      foreign: { currency: 'USD', amountMinor: 2_000, rate: '5' },
    });
    expect(edited.json()).toMatchObject({ amountMinor: 10_000, original: { amountMinor: 2_000 } });
    expect(repositories.audit.events.at(-1)?.changes).toMatchObject({
      amountMinor: { before: 5_000, after: 10_000 },
      originalAmountMinor: { before: 1_000, after: 2_000 },
    });

    const based = await call('PATCH', url, { version: 2, foreign: null });
    expect(based.json()).toMatchObject({ amountMinor: 10_000, original: null });
  });

  it('rejects ambiguous requests', async () => {
    const { expense } = await setUp();
    expect((await expense({})).statusCode).toBe(400);
    expect(
      (await expense({ amountMinor: 100, foreign: { currency: 'USD', amountMinor: 1, rate: '5' } }))
        .statusCode,
    ).toBe(400);
    expect(
      (await expense({ foreign: { currency: 'BRL', amountMinor: 1, rate: '1' } })).statusCode,
    ).toBe(400);
    expect(
      (await expense({ foreign: { currency: 'USD', amountMinor: 1, rate: '0' } })).statusCode,
    ).toBe(400);
    expect(
      (await expense({ foreign: { currency: 'USD', amountMinor: 1, rate: '0.1' } })).json().error
        .code,
    ).toBe('CONVERTED_AMOUNT_ZERO');
  });
});
