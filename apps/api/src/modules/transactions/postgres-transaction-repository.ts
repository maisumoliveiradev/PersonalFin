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
}

const SELECT_WITH_CATEGORIES = `
  SELECT t.id, t.financial_space_id, t.type, t.status, t.description, t.amount_minor,
         t.currency, t.financial_date, t.category_id, c.name AS category_name,
         t.subcategory_id, s.name AS subcategory_name, t.created_by_user_id, t.created_at
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
  };
}

export function createPostgresTransactionRepository(db: Queryable): TransactionRepository {
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
  };
}
