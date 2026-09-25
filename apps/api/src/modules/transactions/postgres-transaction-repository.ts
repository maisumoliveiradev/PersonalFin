import type {
  CurrencyCode,
  FinancialDate,
  TransactionStatus,
  TransactionType,
} from '@personalfin/domain';
import { normalizeRate } from '@personalfin/domain';
import type { Queryable } from '../../database/pool.ts';

import type { FinancialTransaction, RateSource } from './transaction.ts';
import {
  InvalidCursorError,
  type TransactionListQuery,
  type TransactionRepository,
} from './transaction-repository.ts';

interface TransactionRow {
  id: string;
  financial_space_id: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amount_minor: string;
  currency: CurrencyCode;
  financial_date: FinancialDate;
  category_id: string;
  category_name: string;
  subcategory_id: string | null;
  subcategory_name: string | null;
  created_by_user_id: string;
  created_at: Date;
  version: number;
  deleted_at: Date | null;
  recurrence_series_id: string | null;
  occurrence_date: FinancialDate | null;
  individually_modified: boolean;
  card_invoice_id: string | null;
  card_id: string | null;
  card_name: string | null;
  invoice_month: FinancialDate | null;
  invoice_settled: boolean;
  installment_purchase_id: string | null;
  installment_number: number | null;
  installment_count: number | null;
  tags: { id: string; name: string }[];
  original_amount_minor: string | null;
  original_currency: CurrencyCode | null;
  fx_rate: string | null;
  fx_rate_source: RateSource | null;
}

interface CursorKeys {
  created_at_key: string;
  deleted_at_key: string | null;
}

type ListState = TransactionListQuery['state'];

const COLUMNS = `t.id, t.financial_space_id, t.type, t.status, t.description, t.amount_minor,
         t.currency, t.financial_date, t.category_id, c.name AS category_name,
         t.subcategory_id, s.name AS subcategory_name, t.created_by_user_id, t.created_at,
         t.version, t.deleted_at, t.recurrence_series_id, t.occurrence_date,
         t.individually_modified, t.card_invoice_id, ci.card_id, cd.name AS card_name,
         ci.reference_month AS invoice_month, t.installment_purchase_id, t.installment_number,
         ip.installment_count, t.original_amount_minor, t.original_currency, t.fx_rate::text AS fx_rate,
         t.fx_rate_source,
         COALESCE(cb.total_minor > 0 AND cb.paid_minor >= cb.total_minor, false) AS invoice_settled,
         COALESCE((
           SELECT json_agg(json_build_object('id', tg.id, 'name', tg.name) ORDER BY lower(tg.name))
           FROM transaction_tag tt JOIN tag tg ON tg.id = tt.tag_id
           WHERE tt.transaction_id = t.id
         ), '[]'::json) AS tags`;

const CURSOR_KEY_COLUMNS = `to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_key,
         to_char(t.deleted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS deleted_at_key`;

const FROM_WITH_CATEGORIES = `FROM financial_transaction t
  JOIN category c ON c.id = t.category_id
  LEFT JOIN category s ON s.id = t.subcategory_id
  LEFT JOIN card_invoice ci ON ci.id = t.card_invoice_id
  LEFT JOIN card cd ON cd.id = ci.card_id
  LEFT JOIN card_invoice_balance cb ON cb.invoice_id = t.card_invoice_id
  LEFT JOIN card_installment_purchase ip ON ip.id = t.installment_purchase_id`;

const SELECT_WITH_CATEGORIES = `SELECT ${COLUMNS} ${FROM_WITH_CATEGORIES}`;

const CURSOR_PART = /^[0-9A-Za-z:.-]+$/;
const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

function parseAmountMinor(value: string): number {
  const amountMinor = Number(value);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Stored amount exceeds the safe integer range');
  }
  return amountMinor;
}

function toTransaction(row: TransactionRow): FinancialTransaction {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    type: row.type,
    status: row.status,
    description: row.description,
    amountMinor: parseAmountMinor(row.amount_minor),
    currency: row.currency,
    financialDate: row.financial_date,
    category: { id: row.category_id, name: row.category_name },
    subcategory:
      row.subcategory_id === null || row.subcategory_name === null
        ? null
        : { id: row.subcategory_id, name: row.subcategory_name },
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    version: row.version,
    deletedAt: row.deleted_at,
    recurrenceSeriesId: row.recurrence_series_id,
    occurrenceDate: row.occurrence_date,
    individuallyModified: row.individually_modified,
    cardPurchase:
      row.card_invoice_id === null ||
      row.card_id === null ||
      row.card_name === null ||
      row.invoice_month === null
        ? null
        : {
            cardId: row.card_id,
            cardName: row.card_name,
            invoiceId: row.card_invoice_id,
            invoiceMonth: row.invoice_month.slice(0, 7),
            invoiceSettled: row.invoice_settled,
          },
    installment:
      row.installment_purchase_id === null ||
      row.installment_number === null ||
      row.installment_count === null
        ? null
        : {
            purchaseId: row.installment_purchase_id,
            number: row.installment_number,
            count: row.installment_count,
          },
    tags: row.tags,
    original:
      row.original_amount_minor === null ||
      row.original_currency === null ||
      row.fx_rate === null ||
      row.fx_rate_source === null
        ? null
        : {
            currency: row.original_currency,
            amountMinor: parseAmountMinor(row.original_amount_minor),
            rate: normalizeRate(row.fx_rate),
            rateSource: row.fx_rate_source,
          },
  };
}

function encodeCursor(row: TransactionRow & CursorKeys, state: ListState): string {
  const keys =
    state === 'active'
      ? [row.financial_date, row.created_at_key, row.id]
      : [row.deleted_at_key ?? '', row.id];
  return Buffer.from(JSON.stringify(keys)).toString('base64url');
}

function decodeCursor(cursor: string, state: ListState): string[] {
  let keys: unknown;
  try {
    keys = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursorError();
  }
  const expectedLength = state === 'active' ? 3 : 2;
  if (
    !Array.isArray(keys) ||
    keys.length !== expectedLength ||
    !keys.every((key) => typeof key === 'string' && CURSOR_PART.test(key))
  ) {
    throw new InvalidCursorError();
  }
  return keys;
}

export function createPostgresTransactionRepository(db: Queryable): TransactionRepository {
  async function findInSpace(
    financialSpaceId: string,
    transactionId: string,
    options?: { lock: boolean },
  ): Promise<FinancialTransaction | null> {
    const lock = options?.lock === true ? 'FOR UPDATE OF t' : '';
    const { rows } = await db.query<TransactionRow>(
      `${SELECT_WITH_CATEGORIES} WHERE t.financial_space_id = $1 AND t.id = $2 ${lock}`,
      [financialSpaceId, transactionId],
    );
    const [row] = rows;
    return row === undefined ? null : toTransaction(row);
  }

  return {
    async create(transaction) {
      await db.query(
        `INSERT INTO financial_transaction (
           id, financial_space_id, type, status, description, amount_minor, currency,
           financial_date, category_id, subcategory_id, created_by_user_id, card_invoice_id,
           installment_purchase_id, installment_number, import_batch_id,
           original_amount_minor, original_currency, fx_rate, fx_rate_source
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
           $16, $17, $18, $19)`,
        [
          transaction.id,
          transaction.financialSpaceId,
          transaction.type,
          transaction.status,
          transaction.description,
          String(transaction.amountMinor),
          transaction.currency,
          transaction.financialDate,
          transaction.categoryId,
          transaction.subcategoryId,
          transaction.createdByUserId,
          transaction.cardInvoiceId ?? null,
          transaction.installment?.purchaseId ?? null,
          transaction.installment?.number ?? null,
          transaction.importBatchId ?? null,
          transaction.original == null ? null : String(transaction.original.amountMinor),
          transaction.original?.currency ?? null,
          transaction.original?.rate ?? null,
          transaction.original?.rateSource ?? null,
        ],
      );
      const created = await findInSpace(transaction.financialSpaceId, transaction.id);
      if (created === null) {
        throw new Error('Created transaction could not be read back');
      }
      return created;
    },

    findInSpace,

    async findOrigin(transactionId) {
      const { rows } = await db.query<{ financial_space_id: string; created_by_user_id: string }>(
        'SELECT financial_space_id, created_by_user_id FROM financial_transaction WHERE id = $1',
        [transactionId],
      );
      const [row] = rows;
      return row === undefined
        ? null
        : { financialSpaceId: row.financial_space_id, createdByUserId: row.created_by_user_id };
    },

    async update({ financialSpaceId, transactionId, expectedVersion, fields, updatedByUserId }) {
      const result = await db.query(
        `UPDATE financial_transaction SET
           type = $4, status = $5, description = $6, amount_minor = $7, financial_date = $8,
           category_id = $9, subcategory_id = $10, updated_by_user_id = $11,
           card_invoice_id = $12,
           original_amount_minor = $13, original_currency = $14, fx_rate = $15, fx_rate_source = $16,
           individually_modified = individually_modified OR recurrence_series_id IS NOT NULL,
           version = version + 1, updated_at = now()
         WHERE financial_space_id = $1 AND id = $2 AND version = $3 AND deleted_at IS NULL`,
        [
          financialSpaceId,
          transactionId,
          expectedVersion,
          fields.type,
          fields.status,
          fields.description,
          String(fields.amountMinor),
          fields.financialDate,
          fields.categoryId,
          fields.subcategoryId,
          updatedByUserId,
          fields.cardInvoiceId,
          fields.originalAmountMinor === null ? null : String(fields.originalAmountMinor),
          fields.originalCurrency,
          fields.fxRate,
          fields.fxRateSource,
        ],
      );
      if (result.rowCount !== 1) {
        return null;
      }
      return findInSpace(financialSpaceId, transactionId);
    },

    async setDeleted({ financialSpaceId, transactionId, expectedVersion, deleted, actorUserId }) {
      const result = await db.query(
        deleted
          ? `UPDATE financial_transaction SET deleted_at = now(), deleted_by_user_id = $4,
               individually_modified = individually_modified OR recurrence_series_id IS NOT NULL,
               version = version + 1, updated_at = now()
             WHERE financial_space_id = $1 AND id = $2 AND version = $3 AND deleted_at IS NULL`
          : `UPDATE financial_transaction SET deleted_at = NULL, deleted_by_user_id = NULL,
               updated_by_user_id = $4, version = version + 1, updated_at = now()
             WHERE financial_space_id = $1 AND id = $2 AND version = $3 AND deleted_at IS NOT NULL`,
        [financialSpaceId, transactionId, expectedVersion, actorUserId],
      );
      if (result.rowCount !== 1) {
        return null;
      }
      return findInSpace(financialSpaceId, transactionId);
    },

    async list(query) {
      const values: unknown[] = [];
      const param = (value: unknown): string => {
        values.push(value);
        return `$${values.length}`;
      };
      const conditions = [
        `t.financial_space_id = ${param(query.financialSpaceId)}`,
        query.state === 'active' ? 't.deleted_at IS NULL' : 't.deleted_at IS NOT NULL',
      ];
      if (query.range !== undefined) {
        conditions.push(`t.financial_date >= ${param(query.range.start)}::date`);
        conditions.push(`t.financial_date < ${param(query.range.endExclusive)}::date`);
      }
      if (query.type !== undefined) {
        conditions.push(`t.type = ${param(query.type)}`);
      }
      if (query.status !== undefined) {
        conditions.push(`t.status = ${param(query.status)}`);
      }
      if (query.categoryId !== undefined) {
        const category = param(query.categoryId);
        conditions.push(`(t.category_id = ${category} OR t.subcategory_id = ${category})`);
      }
      if (query.tagId !== undefined) {
        conditions.push(
          `EXISTS (SELECT 1 FROM transaction_tag tt WHERE tt.transaction_id = t.id AND tt.tag_id = ${param(query.tagId)})`,
        );
      }
      if (query.cardInvoiceId !== undefined) {
        conditions.push(`t.card_invoice_id = ${param(query.cardInvoiceId)}`);
      }
      if (query.excludeCardPurchases === true) {
        conditions.push('t.card_invoice_id IS NULL');
      }
      if (query.text !== undefined) {
        const pattern = `%${query.text.replace(LIKE_SPECIAL_CHARACTERS, (character) => `\\${character}`)}%`;
        conditions.push(`unaccent(t.description) ILIKE unaccent(${param(pattern)}) ESCAPE '\\'`);
      }

      const cursor = query.cursor === null ? null : decodeCursor(query.cursor, query.state);
      const [first, second, third] = cursor ?? [];
      let order = 't.financial_date DESC, t.created_at DESC, t.id DESC';
      if (query.state === 'deleted') {
        order = 't.deleted_at DESC, t.id DESC';
        if (cursor !== null) {
          conditions.push(
            `(t.deleted_at, t.id) < (${param(first)}::timestamptz, ${param(second)}::uuid)`,
          );
        }
      } else if (cursor !== null) {
        conditions.push(
          `(t.financial_date, t.created_at, t.id) < (${param(first)}::date, ${param(second)}::timestamptz, ${param(third)}::uuid)`,
        );
      }

      const { rows } = await db.query<TransactionRow & CursorKeys>(
        `SELECT ${COLUMNS}, ${CURSOR_KEY_COLUMNS}
         ${FROM_WITH_CATEGORIES}
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${order}
         LIMIT ${param(query.limit + 1)}`,
        values,
      );
      const page = rows.slice(0, query.limit);
      const last = page.at(-1);
      return {
        items: page.map(toTransaction),
        nextCursor:
          rows.length > query.limit && last !== undefined ? encodeCursor(last, query.state) : null,
      };
    },
  };
}
