import type {
  CurrencyCode,
  FinancialDate,
  TransactionStatus,
  TransactionType,
} from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { FinancialTransaction } from './transaction.ts';
import type { TransactionRepository } from './transaction-repository.ts';

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
}

const SELECT_WITH_CATEGORIES = `
  SELECT t.id, t.financial_space_id, t.type, t.status, t.description, t.amount_minor,
         t.currency, t.financial_date, t.category_id, c.name AS category_name,
         t.subcategory_id, s.name AS subcategory_name, t.created_by_user_id, t.created_at,
         t.version
  FROM financial_transaction t
  JOIN category c ON c.id = t.category_id
  LEFT JOIN category s ON s.id = t.subcategory_id`;

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
  };
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
           financial_date, category_id, subcategory_id, created_by_user_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
        ],
      );
      const { rows } = await db.query<TransactionRow>(
        `${SELECT_WITH_CATEGORIES} WHERE t.id = $1 AND t.financial_space_id = $2`,
        [transaction.id, transaction.financialSpaceId],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Created transaction could not be read back');
      }
      return toTransaction(row);
    },

    findInSpace,

    async update({ financialSpaceId, transactionId, expectedVersion, fields, updatedByUserId }) {
      const result = await db.query(
        `UPDATE financial_transaction SET
           type = $4, status = $5, description = $6, amount_minor = $7, financial_date = $8,
           category_id = $9, subcategory_id = $10, updated_by_user_id = $11,
           version = version + 1, updated_at = now()
         WHERE financial_space_id = $1 AND id = $2 AND version = $3`,
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
        ],
      );
      if (result.rowCount !== 1) {
        return null;
      }
      return findInSpace(financialSpaceId, transactionId);
    },

    async listRecentForSpace(financialSpaceId, limit) {
      const { rows } = await db.query<TransactionRow>(
        `${SELECT_WITH_CATEGORIES}
         WHERE t.financial_space_id = $1
         ORDER BY t.financial_date DESC, t.created_at DESC, t.id DESC
         LIMIT $2`,
        [financialSpaceId, limit],
      );
      return rows.map(toTransaction);
    },
  };
}
