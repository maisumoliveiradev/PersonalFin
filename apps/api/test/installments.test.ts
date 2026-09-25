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

interface InstallmentRow {
  amountMinor: number;
  financialDate: string;
  cardPurchase: { invoiceMonth: string };
  installment: { number: number; count: number };
}

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
  const card = (
    await server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/cards`,
      headers: asAna,
      payload: {
        name: 'Nubank',
        closingDay: 3,
        dueDay: 10,
        limitMinor: 500_000,
        limitEffectiveFrom: '2026-01-01',
      },
    })
  ).json();
  const buy = (payload: object) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/transactions`,
      headers: asAna,
      payload: {
        type: 'expense',
        description: 'Geladeira',
        amountMinor: 100_000,
        financialDate: '2026-10-31',
        categoryId: food,
        cardId: card.id,
        installments: 3,
        ...payload,
      },
    });
  const installments = async (): Promise<InstallmentRow[]> =>
    (
      await server.inject({
        method: 'GET',
        url: `/financial-spaces/${spaceId}/transactions?limit=200`,
        headers: asAna,
      })
    )
      .json()
      .items.filter((item: { installment: unknown }) => item.installment !== null)
      .sort(
        (left: InstallmentRow, right: InstallmentRow) =>
          left.installment.number - right.installment.number,
      );
  const cancel = (purchaseId: string, afterMonth: string, headers = asAna) =>
    server.inject({
      method: 'POST',
      url: `/financial-spaces/${spaceId}/installment-purchases/${purchaseId}/cancel`,
      headers,
      payload: { afterMonth },
    });
  return { buy, installments, cancel };
}

describe('installment purchases', () => {
  it('creates one card purchase per invoice with an exact split', async () => {
    const { buy, installments } = await setUp();

    const response = await buy({});

    expect(response.statusCode).toBe(201);
    expect(response.json().installment).toMatchObject({ number: 1, count: 3 });
    expect(
      (await installments()).map((item) => [
        item.installment.number,
        item.amountMinor,
        item.financialDate,
        item.cardPurchase.invoiceMonth,
      ]),
    ).toEqual([
      [1, 33_334, '2026-10-31', '2026-11'],
      [2, 33_333, '2026-11-30', '2026-12'],
      [3, 33_333, '2026-12-31', '2027-01'],
    ]);
  });

  it('starts from a chosen first invoice', async () => {
    const { buy, installments } = await setUp();

    await buy({ invoiceMonth: '2026-12', installments: 2 });

    expect((await installments()).map((item) => item.cardPurchase.invoiceMonth)).toEqual([
      '2026-12',
      '2027-01',
    ]);
  });

  it.each([
    [{ installments: 1 }, 400],
    [{ installments: 49 }, 400],
    [{ amountMinor: 2, installments: 3 }, 422],
    [{ cardId: undefined }, 422],
  ])('rejects %j', async (change, status) => {
    const { buy } = await setUp();

    expect((await buy(change)).statusCode).toBe(status);
  });

  it('cancels installments after an invoice month and keeps earlier ones', async () => {
    const { buy, installments, cancel } = await setUp();
    const first = (await buy({ installments: 4 })).json();

    const response = await cancel(first.installment.purchaseId, '2026-12');
    const again = await cancel(first.installment.purchaseId, '2026-12');

    expect(response.json()).toEqual({ cancelled: 2 });
    expect(again.json()).toEqual({ cancelled: 0 });
    expect((await installments()).map((item) => item.installment.number)).toEqual([1, 2]);
    expect(
      repositories.audit.events.filter(
        (event) => event.action === 'delete' && event.changes.reason !== undefined,
      ),
    ).toHaveLength(2);
  });

  it('hides installment purchases of other users', async () => {
    const { buy, cancel } = await setUp();
    const first = (await buy({})).json();

    expect((await cancel(first.installment.purchaseId, '2026-11', asBruno)).statusCode).toBe(404);
    expect((await cancel('00000000-0000-4000-8000-000000000000', '2026-11')).statusCode).toBe(404);
  });
});
