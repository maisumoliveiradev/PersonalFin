import type {
  FinancialTransaction,
  NewFinancialTransaction,
  TransactionFields,
} from './transaction.ts';

export interface TransactionUpdate {
  financialSpaceId: string;
  transactionId: string;
  expectedVersion: number;
  fields: TransactionFields;
  updatedByUserId: string;
}

export interface TransactionRepository {
  create(transaction: NewFinancialTransaction): Promise<FinancialTransaction>;
  listRecentForSpace(financialSpaceId: string, limit: number): Promise<FinancialTransaction[]>;
  findInSpace(
    financialSpaceId: string,
    transactionId: string,
    options?: { lock: boolean },
  ): Promise<FinancialTransaction | null>;
  update(update: TransactionUpdate): Promise<FinancialTransaction | null>;
}
