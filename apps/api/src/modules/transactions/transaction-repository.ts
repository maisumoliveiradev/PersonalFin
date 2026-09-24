import type { FinancialTransaction, NewFinancialTransaction } from './transaction.ts';

export interface TransactionRepository {
  create(transaction: NewFinancialTransaction): Promise<FinancialTransaction>;
}
