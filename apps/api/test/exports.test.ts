import { readSheet } from 'read-excel-file/node';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { decimalText } from '../src/modules/exports/transaction-export.ts';
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

function call(method: 'GET' | 'POST', url: string, payload?: object) {
  return server.inject({
    method,
    url,
    headers: asAna,
    ...(payload === undefined ? {} : { payload }),
  });
}

async function setUp() {
  const spaceId: string = (await call('POST', '/financial-spaces', { name: 'Casa' })).json().id;
  const base = `/financial-spaces/${spaceId}`;
  const categories = (await call('GET', `${base}/categories`)).json().items as {
    id: string;
    name: string;
  }[];
  const categoryId = (name: string) => categories.find((category) => category.name === name)?.id;
  for (const [type, description, amountMinor, financialDate, category] of [
    ['expense', 'Padaria; "pão"', 1_250, '2026-10-05', 'Alimentação'],
    ['income', 'Salário', 500_000, '2026-10-01', 'Receitas'],
    ['expense', 'Aluguel', 150_000, '2026-11-05', 'Moradia'],
  ] as const) {
    await call('POST', `${base}/transactions`, {
      type,
      description,
      amountMinor,
      financialDate,
      categoryId: categoryId(category),
    });
  }
  return { base };
}

describe('transaction exports', () => {
  it('formats amounts exactly with a decimal comma', () => {
    expect(decimalText(5)).toBe('0,05');
    expect(decimalText(123_456)).toBe('1234,56');
    expect(decimalText(-1_250)).toBe('-12,50');
    expect(decimalText(99_999_999_999)).toBe('999999999,99');
  });

  it('exports the filtered month as a pt-BR CSV', async () => {
    const { base } = await setUp();

    const response = await call('GET', `${base}/exports/transactions?format=csv&month=2026-10`);

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="lancamentos-2026-10.csv"',
    );
    const lines = response.body.replace(/^﻿/, '').trim().split('\r\n');
    expect(lines[0]).toBe(
      'Data;Tipo;Descrição;Categoria;Subcategoria;Valor;Valor com sinal;Moeda;Situação;Tags;Cartão;Fatura;Parcela;ID;Moeda original;Valor original;Cotação',
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(
      /^01\/10\/2026;Receita;Salário;Receitas;;5000,00;5000,00;BRL;Recebido;;;;;/,
    );
    expect(lines[2]).toMatch(
      /^05\/10\/2026;Despesa;"Padaria; ""pão""";Alimentação;;12,50;-12,50;BRL;Pago;;;;;/,
    );
  });

  it('exports XLSX that the importer reads back exactly', async () => {
    const { base } = await setUp();

    const response = await call('GET', `${base}/exports/transactions?format=xlsx&type=expense`);

    expect(response.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const rows = await readSheet(response.rawPayload, { parseNumber: (value: string) => value });
    expect(rows).toHaveLength(3);
    expect(rows[1]?.slice(0, 7)).toEqual([
      new Date('2026-10-05T00:00:00Z'),
      'Despesa',
      'Padaria; "pão"',
      'Alimentação',
      null,
      '12.5',
      '-12.5',
    ]);

    const imported = await call('POST', `${base}/imports`, {
      fileName: 'lancamentos.xlsx',
      format: 'xlsx',
      contentBase64: response.rawPayload.toString('base64'),
    });
    expect(imported.statusCode).toBe(201);
    expect(imported.json().firstRows[1].slice(0, 3)).toEqual([
      '2026-10-05',
      'Despesa',
      'Padaria; "pão"',
    ]);
  });

  it('rejects conflicting period filters', async () => {
    const { base } = await setUp();
    const response = await call(
      'GET',
      `${base}/exports/transactions?format=csv&month=2026-10&from=2026-10-01`,
    );
    expect(response.statusCode).toBe(400);
  });
});
