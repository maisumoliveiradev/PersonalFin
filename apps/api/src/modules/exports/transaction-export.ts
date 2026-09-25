import writeXlsxFile from 'write-excel-file/node';

import type { DataAccess } from '../../database/data-access.ts';
import { AppError } from '../../http/errors.ts';
import type { FinancialTransaction } from '../transactions/transaction.ts';
import type { TransactionListQuery } from '../transactions/transaction-repository.ts';

export const EXPORT_FORMATS = ['csv', 'xlsx'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const MAX_EXPORT_ROWS = 50_000;
const PAGE_SIZE = 200;

export class ExportTooLargeError extends AppError {
  override name = 'ExportTooLargeError';

  constructor() {
    super(
      422,
      'EXPORT_TOO_LARGE',
      `Export at most ${MAX_EXPORT_ROWS} transactions; narrow the filters`,
    );
  }
}

export async function collectTransactions(
  data: DataAccess,
  query: Omit<TransactionListQuery, 'limit' | 'cursor' | 'state'>,
): Promise<FinancialTransaction[]> {
  const result: FinancialTransaction[] = [];
  let cursor: string | null = null;
  do {
    const page = await data.repositories.transactions.list({
      ...query,
      state: 'active',
      limit: PAGE_SIZE,
      cursor,
    });
    result.push(...page.items);
    if (result.length > MAX_EXPORT_ROWS) {
      throw new ExportTooLargeError();
    }
    cursor = page.nextCursor;
  } while (cursor !== null);
  return result.sort(
    (left, right) =>
      left.financialDate.localeCompare(right.financialDate) ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );
}

const HEADER = [
  'Data',
  'Tipo',
  'Descrição',
  'Categoria',
  'Subcategoria',
  'Valor',
  'Valor com sinal',
  'Moeda',
  'Situação',
  'Tags',
  'Cartão',
  'Fatura',
  'Parcela',
  'ID',
];

export function decimalText(amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const digits = String(Math.abs(amountMinor)).padStart(3, '0');
  return `${sign}${digits.slice(0, -2)},${digits.slice(-2)}`;
}

function displayDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

function statusText(transaction: FinancialTransaction): string {
  const settled =
    transaction.cardPurchase === null
      ? transaction.status === 'paid'
      : transaction.cardPurchase.invoiceSettled;
  if (!settled) {
    return 'Pendente';
  }
  return transaction.type === 'income' ? 'Recebido' : 'Pago';
}

interface ExportRow {
  date: string;
  type: string;
  description: string;
  category: string;
  subcategory: string;
  amountMinor: number;
  signedMinor: number;
  currency: string;
  status: string;
  tags: string;
  card: string;
  invoice: string;
  installment: string;
  id: string;
}

function toExportRow(transaction: FinancialTransaction): ExportRow {
  return {
    date: transaction.financialDate,
    type: transaction.type === 'income' ? 'Receita' : 'Despesa',
    description: transaction.description,
    category: transaction.category.name,
    subcategory: transaction.subcategory?.name ?? '',
    amountMinor: transaction.amountMinor,
    signedMinor: transaction.type === 'income' ? transaction.amountMinor : -transaction.amountMinor,
    currency: transaction.currency,
    status: statusText(transaction),
    tags: transaction.tags.map((tag) => tag.name).join(', '),
    card: transaction.cardPurchase?.cardName ?? '',
    invoice: transaction.cardPurchase?.invoiceMonth ?? '',
    installment:
      transaction.installment === null
        ? ''
        : `${transaction.installment.number}/${transaction.installment.count}`,
    id: transaction.id,
  };
}

function csvField(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function transactionsToCsv(transactions: readonly FinancialTransaction[]): Buffer {
  const lines = [HEADER.join(';')];
  for (const row of transactions.map(toExportRow)) {
    lines.push(
      [
        displayDate(row.date),
        row.type,
        row.description,
        row.category,
        row.subcategory,
        decimalText(row.amountMinor),
        decimalText(row.signedMinor),
        row.currency,
        row.status,
        row.tags,
        row.card,
        row.invoice,
        row.installment,
        row.id,
      ]
        .map(csvField)
        .join(';'),
    );
  }
  return Buffer.from(`﻿${lines.join('\r\n')}\r\n`, 'utf8');
}

const MONEY_FORMAT = '#,##0.00';

export async function transactionsToXlsx(
  transactions: readonly FinancialTransaction[],
): Promise<Buffer> {
  const header = HEADER.map((value) => ({ value, fontWeight: 'bold' as const }));
  const rows = transactions
    .map(toExportRow)
    .map((row) => [
      { value: new Date(`${row.date}T00:00:00Z`), type: Date, format: 'dd/mm/yyyy' },
      row.type,
      row.description,
      row.category,
      row.subcategory,
      { value: row.amountMinor / 100, type: Number, format: MONEY_FORMAT },
      { value: row.signedMinor / 100, type: Number, format: MONEY_FORMAT },
      row.currency,
      row.status,
      row.tags,
      row.card,
      row.invoice,
      row.installment,
      row.id,
    ]);
  return writeXlsxFile([header, ...rows], { sheet: 'Lançamentos' }).toBuffer();
}
