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
      payload: { name: 'Casa' },
    })
  ).json().id;
  const base = `/financial-spaces/${spaceId}/debts`;
  const create = (payload: object) =>
    server.inject({ method: 'POST', url: base, headers: asAna, payload });
  return { spaceId, base, create };
}

const carLoan = {
  name: '  Financiamento   do carro ',
  originalAmountMinor: 1_200_000,
  installmentCount: 12,
  firstDueDate: '2026-10-10',
};

describe('debts', () => {
  it('creates a debt with a default installment and an initial summary', async () => {
    const { create } = await setUp();

    const response = await create(carLoan);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: 'Financiamento do carro',
      originalAmountMinor: 1_200_000,
      currency: 'BRL',
      installmentCount: 12,
      installmentAmountMinor: 100_000,
      archived: false,
      version: 1,
      payments: [],
      summary: {
        outstandingMinor: 1_200_000,
        remainingInstallments: 12,
        nextDueDate: '2026-10-10',
        progressTenths: 0,
        settled: false,
      },
    });
  });

  it('records payments, updates the summary, and removes payments', async () => {
    const { base, create } = await setUp();
    const debt = (await create(carLoan)).json();

    const paid = await server.inject({
      method: 'POST',
      url: `${base}/${debt.id}/payments`,
      headers: asAna,
      payload: { amountMinor: 100_000, paidOn: '2026-10-10' },
    });
    expect(paid.statusCode).toBe(201);
    expect(paid.json().summary).toMatchObject({
      paidMinor: 100_000,
      outstandingMinor: 1_100_000,
      paidInstallments: 1,
      remainingInstallments: 11,
      nextDueDate: '2026-11-10',
      progressTenths: 83,
    });

    const paymentId = paid.json().payments[0].id;
    const removed = await server.inject({
      method: 'DELETE',
      url: `${base}/${debt.id}/payments/${paymentId}`,
      headers: asAna,
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().summary.outstandingMinor).toBe(1_200_000);

    const list = await server.inject({ method: 'GET', url: base, headers: asAna });
    expect(list.json().items[0].summary.paidMinor).toBe(0);
    expect(repositories.audit.events.map((event) => `${event.entityType}:${event.action}`)).toEqual(
      ['debt:create', 'debt_payment:create', 'debt_payment:delete'],
    );
  });

  it('rejects payments above the outstanding balance', async () => {
    const { base, create } = await setUp();
    const debt = (
      await create({ ...carLoan, originalAmountMinor: 1000, installmentCount: 1 })
    ).json();

    const response = await server.inject({
      method: 'POST',
      url: `${base}/${debt.id}/payments`,
      headers: asAna,
      payload: { amountMinor: 1001, paidOn: '2026-10-10' },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('DEBT_OVERPAYMENT');
  });

  it('validates the plan on create and edit', async () => {
    const { base, create } = await setUp();
    const tooBig = await create({ ...carLoan, installmentAmountMinor: 1_200_001 });
    expect(tooBig.statusCode).toBe(422);
    expect((await create({ ...carLoan, installmentCount: 0 })).statusCode).toBe(400);

    const debt = (await create(carLoan)).json();
    await server.inject({
      method: 'POST',
      url: `${base}/${debt.id}/payments`,
      headers: asAna,
      payload: { amountMinor: 100_000, paidOn: '2026-10-10' },
    });
    const fewer = await server.inject({
      method: 'PATCH',
      url: `${base}/${debt.id}`,
      headers: asAna,
      payload: { version: 1, installmentCount: 0 },
    });
    expect(fewer.statusCode).toBe(400);
    const edited = await server.inject({
      method: 'PATCH',
      url: `${base}/${debt.id}`,
      headers: asAna,
      payload: { version: 1, name: 'Carro', archived: true },
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json()).toMatchObject({ name: 'Carro', archived: true, version: 2 });
    const stale = await server.inject({
      method: 'PATCH',
      url: `${base}/${debt.id}`,
      headers: asAna,
      payload: { version: 1, name: 'Outro' },
    });
    expect(stale.statusCode).toBe(409);
  });

  it('hides debts of spaces the caller cannot access', async () => {
    const { base, create } = await setUp();
    const debt = (await create(carLoan)).json();

    const response = await server.inject({
      method: 'GET',
      url: `${base}/${debt.id}`,
      headers: asBruno,
    });

    expect(response.statusCode).toBe(404);
  });
});
