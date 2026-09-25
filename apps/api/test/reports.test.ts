import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { buildMonthlyReport } from '../src/modules/reports/monthly-report.ts';
import {
  buildTestServer,
  createInMemoryDataAccess,
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

function call(method: 'GET' | 'POST', url: string, payload?: object) {
  return server.inject({
    method,
    url,
    headers: asAna,
    ...(payload === undefined ? {} : { payload }),
  });
}

async function setUp(count: number) {
  const spaceId: string = (await call('POST', '/financial-spaces', { name: 'Casa' })).json().id;
  const base = `/financial-spaces/${spaceId}`;
  const categories = (await call('GET', `${base}/categories`)).json().items as {
    id: string;
    name: string;
  }[];
  const food = categories.find((category) => category.name === 'Alimentação')?.id;
  for (let index = 0; index < count; index += 1) {
    await call('POST', `${base}/transactions`, {
      type: 'expense',
      description: `Compra ${index + 1}`,
      amountMinor: 1_000 + index,
      financialDate: '2026-10-05',
      categoryId: food,
    });
  }
  return { spaceId, base };
}

describe('monthly PDF report', () => {
  it('returns a PDF attachment for the month', async () => {
    const { base } = await setUp(2);

    const response = await call('GET', `${base}/reports/monthly?month=2026-10`);

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="relatorio-2026-10.pdf"',
    );
    expect(response.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('continues the transaction list on new pages', async () => {
    const { spaceId } = await setUp(120);
    const data = createInMemoryDataAccess(repositories);

    const pdf = await buildMonthlyReport(data, {
      financialSpaceId: spaceId,
      spaceName: 'Casa',
      month: '2026-10',
      generatedAt: new Date('2026-10-31T12:00:00Z'),
      compress: false,
    });

    const pages = pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? [];
    expect(pages.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects an invalid month', async () => {
    const { base } = await setUp(0);
    expect((await call('GET', `${base}/reports/monthly?month=2026-13`)).statusCode).toBe(400);
  });
});
