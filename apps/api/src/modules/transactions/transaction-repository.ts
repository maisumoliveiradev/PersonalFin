import type { FinancialDate, TransactionStatus, TransactionType } from '@personalfin/domain';

import type {
  FinancialTransaction,
  NewFinancialTransaction,
  TransactionFields,
} from './transaction.ts';

export interface TransactionListQuery {
  financialSpaceId: string;
  state: 'active' | 'deleted';
  limit: number;
  cursor: string | null;
  range?: { start: FinancialDate; endExclusive: FinancialDate };
  type?: TransactionType;
  status?: TransactionStatus;
  categoryId?: string;
  text?: string;
  cardInvoiceId?: string;
  tagId?: string;
  excludeCardPurchases?: boolean;
}

export interface TransactionPage {
  items: FinancialTransaction[];
  nextCursor: string | null;
}

export class InvalidCursorError extends Error {
  override name = 'InvalidCursorError';
}

export interface TransactionDeletionChange {
  financialSpaceId: string;
  transactionId: string;
  expectedVersion: number;
  deleted: boolean;
  actorUserId: string;
}

export interface TransactionUpdate {
  financialSpaceId: string;
  transactionId: string;
  expectedVersion: number;
  fields: TransactionFields;
  updatedByUserId: string;
}

export interface TransactionRepository {
  create(transaction: NewFinancialTransaction): Promise<FinancialTransaction>;
  list(query: TransactionListQuery): Promise<TransactionPage>;
  findInSpace(
    financialSpaceId: string,
    transactionId: string,
    options?: { lock: boolean },
  ): Promise<FinancialTransaction | null>;
  update(update: TransactionUpdate): Promise<FinancialTransaction | null>;
  setDeleted(change: TransactionDeletionChange): Promise<FinancialTransaction | null>;
}
