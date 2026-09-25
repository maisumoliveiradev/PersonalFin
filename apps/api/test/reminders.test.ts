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
const TODAY = '2026-10-10';

beforeEach(async () => {
  await server.close();
  repositories = createInMemoryRepositories();
  server = buildTestServer({ sessions, repositories });
});

afterAll(async () => {
  await server.close();
});

function call(method: 'GET' | 'POST' | 'PUT', url: string, payload?: object, headers = asAna) {
  return server.inject({ method, url, headers, ...(payload === undefined ? {} : { payload }) });
}

async function setUp() {
  const spaceId: string = (await call('POST', '/financial-spaces', { name: 'Casa' })).json().id;
  const base = `/financial-spaces/${spaceId}`;
  const categories = (await call('GET', `${base}/categories`)).json().items as {
    id: string;
    name: string;
  }[];
  const food = categories.find((category) => category.name === 'Alimentação')?.id;
  const expense = (description: string, financialDate: string, amountMinor = 1000) =>
    call('POST', `${base}/transactions`, {
      type: 'expense',
      status: 'pending',
      description,
      amountMinor,
      financialDate,
      categoryId: food,
    });
  const reminders = async (headers = asAna) =>
    (await call('GET', `${base}/reminders?today=${TODAY}`, undefined, headers)).json().items as {
      key: string;
      kind: string;
      stage: string;
      description: string;
      daysUntilDue: number;
      amountMinor: number;
    }[];
  return { spaceId, base, expense, reminders };
}

describe('in-app reminders', () => {
  it('uses the default offsets: on the day, three days before, and overdue', async () => {
    const { expense, reminders } = await setUp();
    await expense('Atrasada', '2026-10-01');
    await expense('Hoje', '2026-10-10');
    await expense('Em dois dias', '2026-10-12');
    await expense('Em três dias', '2026-10-13');
    await expense('Em quatro dias', '2026-10-14');

    const items = await reminders();

    expect(items.map((item) => [item.description, item.stage, item.daysUntilDue])).toEqual([
      ['Atrasada', 'overdue', -9],
      ['Hoje', 'before-0', 0],
      ['Em dois dias', 'before-3', 2],
      ['Em três dias', 'before-3', 3],
    ]);
  });

  it('brings a dismissed reminder back at its next stage', async () => {
    const { base, expense, reminders } = await setUp();
    await expense('Aluguel', '2026-10-12');
    const [first] = await reminders();

    const dismissed = await call('POST', `${base}/reminders/dismissals`, {
      key: first?.key,
      stage: 'before-3',
    });
    expect(dismissed.statusCode).toBe(204);
    expect(await reminders()).toEqual([]);

    const later = await call('GET', `${base}/reminders?today=2026-10-12`);
    expect(later.json().items).toMatchObject([{ description: 'Aluguel', stage: 'before-0' }]);
  });

  it('follows personal settings for offsets and kinds', async () => {
    const { base, spaceId, expense, reminders } = await setUp();
    repositories.financialSpaces.members.push({
      financialSpaceId: spaceId,
      userId: bruno.id,
      permissions: ['view'],
    });
    await expense('Escola', '2026-10-16');
    expect(await reminders()).toEqual([]);

    const saved = await call('PUT', `${base}/reminder-settings`, {
      offsets: [7, 1, 7],
      kinds: ['invoices', 'transactions'],
    });
    expect(saved.json()).toEqual({ offsets: [1, 7], kinds: ['transactions', 'invoices'] });
    expect((await reminders()).map((item) => item.stage)).toEqual(['before-7']);
    expect(await reminders(asBruno)).toEqual([]);
    expect((await call('GET', `${base}/reminder-settings`, undefined, asBruno)).json()).toEqual({
      offsets: [0, 3],
      kinds: ['transactions', 'invoices', 'debts', 'projection'],
    });

    await call('PUT', `${base}/reminder-settings`, { offsets: [7], kinds: ['invoices'] });
    expect(await reminders()).toEqual([]);
  });

  it('reminds debt installments and a negative projected balance', async () => {
    const { base, expense, reminders } = await setUp();
    await call('POST', `${base}/debts`, {
      name: 'Carro',
      originalAmountMinor: 120_000,
      installmentCount: 12,
      firstDueDate: '2026-10-11',
    });
    await call('POST', `${base}/balance-snapshots`, { amountMinor: 500, observedOn: '2026-10-01' });
    await expense('Conta grande', '2026-10-20', 2_000);

    const items = await reminders();

    expect(items).toMatchObject([
      { kind: 'debts', description: 'Carro', stage: 'before-3', amountMinor: 10_000 },
      { kind: 'projection', description: '2026-10', stage: 'before-0', amountMinor: -1_500 },
    ]);
  });

  it('rejects invalid dates, offsets, and stages', async () => {
    const { base } = await setUp();
    expect((await call('GET', `${base}/reminders?today=2026-13-01`)).statusCode).toBe(400);
    expect(
      (await call('PUT', `${base}/reminder-settings`, { offsets: [2], kinds: [] })).statusCode,
    ).toBe(400);
    expect(
      (await call('POST', `${base}/reminders/dismissals`, { key: 'x', stage: 'later' })).statusCode,
    ).toBe(400);
  });
});
