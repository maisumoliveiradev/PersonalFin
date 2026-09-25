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

function call(method: 'GET' | 'POST' | 'PUT', url: string, payload?: object) {
  return server.inject({
    method,
    url,
    headers: asAna,
    ...(payload === undefined ? {} : { payload }),
  });
}

const CSV = [
  'Data;Descrição;Valor;Categoria;Situação',
  '05/10/2026;Padaria;-12,50;Alimentação;Pago',
  '06/10/2026;Salário;5.000,00;Salário;Recebido',
  '07/10/2026;Algo novo;-30,00;Categoria inexistente;Pago',
  '31/02/2026;Data ruim;-1,00;Alimentação;Pago',
  '08/10/2026;Mercado;-99,90;alimentacao;Pendente',
  '08/10/2026;Mercado de novo;-99,90;Alimentação;Pago',
].join('\r\n');

async function setUp(content = CSV, encoding: BufferEncoding = 'latin1') {
  const spaceId: string = (await call('POST', '/financial-spaces', { name: 'Casa' })).json().id;
  const base = `/financial-spaces/${spaceId}`;
  const categories = (await call('GET', `${base}/categories`)).json().items as {
    id: string;
    name: string;
  }[];
  const categoryId = (name: string) => categories.find((category) => category.name === name)?.id;
  const created = await call('POST', `${base}/imports`, {
    fileName: 'extrato.csv',
    format: 'csv',
    contentBase64: Buffer.from(content, encoding).toString('base64'),
  });
  return { base, created, categoryId, importUrl: `${base}/imports/${created.json().id}` };
}

function mapping(fallbackExpense: string | null) {
  return {
    hasHeader: true,
    columns: {
      date: 0,
      description: 1,
      amount: 2,
      type: null,
      category: 3,
      subcategory: null,
      status: 4,
    },
    dateFormat: 'DMY',
    decimalSeparator: ',',
    amountSign: 'negative_is_expense',
    fallbackCategoryIds: { expense: fallbackExpense, income: null },
    defaultStatus: 'paid',
  };
}

describe('imports', () => {
  it('reads a Latin-1 semicolon CSV into a draft and keeps its first rows', async () => {
    const { created } = await setUp();

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      fileName: 'extrato.csv',
      format: 'csv',
      status: 'draft',
      rowCount: 7,
      mapping: null,
      counts: null,
    });
    expect(created.json().firstRows[0]).toEqual([
      'Data',
      'Descrição',
      'Valor',
      'Categoria',
      'Situação',
    ]);
  });

  it('validates every row with the explicit mapping and flags duplicates', async () => {
    const { importUrl, created } = await setUp();

    const mapped = await call('PUT', `${importUrl}/mapping`, {
      version: 1,
      mapping: mapping(null),
    });

    expect(mapped.statusCode).toBe(200);
    expect(mapped.json().counts).toEqual({
      total: 7,
      valid: 4,
      invalid: 3,
      duplicates: 1,
      undecidedDuplicates: 1,
      toImport: 3,
    });
    const invalid = (await call('GET', `${importUrl}/rows?filter=invalid`)).json().items;
    expect(
      invalid.map((row: { rowNumber: number; errors: string[] }) => [row.rowNumber, row.errors]),
    ).toEqual([
      [1, ['header']],
      [4, ['category_unmatched']],
      [5, ['date_invalid']],
    ]);
    const [duplicate] = (await call('GET', `${importUrl}/rows?filter=duplicates`)).json().items;
    expect(duplicate).toMatchObject({ rowNumber: 7, duplicateOf: { kind: 'row', rowNumber: 6 } });
    const [bread] = (await call('GET', `${importUrl}/rows?filter=importable`)).json().items;
    expect(bread.parsed).toMatchObject({
      type: 'expense',
      status: 'paid',
      description: 'Padaria',
      amountMinor: 1250,
      financialDate: '2026-10-05',
      warnings: [],
    });
    expect(created.json().id).toBeDefined();
  });

  it('uses the chosen fallback category and marks the row', async () => {
    const { importUrl, categoryId } = await setUp();
    const mapped = await call('PUT', `${importUrl}/mapping`, {
      version: 1,
      mapping: mapping(categoryId('Outros gastos') ?? categoryId('Alimentação') ?? null),
    });
    expect(mapped.json().counts.valid).toBe(5);
    const rows = (await call('GET', `${importUrl}/rows?filter=importable`)).json().items;
    expect(rows.find((row: { rowNumber: number }) => row.rowNumber === 4).parsed.warnings).toEqual([
      'category_fallback',
    ]);
  });

  it('requires a decision for duplicates, then imports, and can be undone', async () => {
    const { base, importUrl } = await setUp();
    await call('PUT', `${importUrl}/mapping`, { version: 1, mapping: mapping(null) });

    const early = await call('POST', `${importUrl}/confirm`, { version: 2 });
    expect(early.json().error.code).toBe('IMPORT_DUPLICATES_UNDECIDED');

    const decided = await call('PUT', `${importUrl}/decisions`, { version: 2, all: 'skip' });
    expect(decided.json().counts).toMatchObject({ undecidedDuplicates: 0, toImport: 3 });

    const confirmed = await call('POST', `${importUrl}/confirm`, { version: 3 });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json()).toMatchObject({ status: 'imported', importedCount: 3 });
    const list = (await call('GET', `${base}/transactions`)).json().items;
    expect(list.map((item: { description: string }) => item.description).sort()).toEqual([
      'Mercado',
      'Padaria',
      'Salário',
    ]);
    expect(repositories.audit.events.at(-1)).toMatchObject({
      entityType: 'import_batch',
      action: 'create',
      changes: { importedCount: { after: 3 }, skippedDuplicates: { after: 1 } },
    });

    const again = await call('PUT', `${importUrl}/mapping`, { version: 4, mapping: mapping(null) });
    expect(again.json().error.code).toBe('IMPORT_NOT_DRAFT');

    const undone = await call('POST', `${importUrl}/undo`, { version: 4 });
    expect(undone.json()).toMatchObject({ status: 'undone' });
    expect((await call('GET', `${base}/transactions`)).json().items).toEqual([]);
    expect((await call('GET', `${base}/transactions?state=deleted`)).json().items).toHaveLength(3);
  });

  it('flags rows that match existing transactions', async () => {
    const { base, importUrl, categoryId } = await setUp();
    await call('POST', `${base}/transactions`, {
      type: 'expense',
      description: 'Padaria da esquina',
      amountMinor: 1250,
      financialDate: '2026-10-05',
      categoryId: categoryId('Alimentação'),
    });
    await call('PUT', `${importUrl}/mapping`, { version: 1, mapping: mapping(null) });
    const duplicates = (await call('GET', `${importUrl}/rows?filter=duplicates`)).json().items;
    expect(duplicates[0]).toMatchObject({
      rowNumber: 2,
      duplicateOf: { kind: 'transaction', description: 'Padaria da esquina' },
    });
  });

  it('rejects unreadable, empty, and oversized input', async () => {
    const { base } = await setUp();
    const empty = await call('POST', `${base}/imports`, {
      fileName: 'vazio.csv',
      format: 'csv',
      contentBase64: Buffer.from('\r\n\r\n').toString('base64'),
    });
    expect(empty.json().error.code).toBe('IMPORT_FILE_EMPTY');
    const broken = await call('POST', `${base}/imports`, {
      fileName: 'x.xlsx',
      format: 'xlsx',
      contentBase64: Buffer.from('not a spreadsheet').toString('base64'),
    });
    expect(broken.json().error.code).toBe('IMPORT_FILE_UNREADABLE');
  });
});
