import type {
  CurrencyCode,
  FinancialDate,
  TransactionStatus,
  TransactionType,
} from '@personalfin/domain';

export interface CategoryReference {
  id: string;
  name: string;
}

export interface FinancialTransaction {
  id: string;
  financialSpaceId: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  financialDate: FinancialDate;
  category: CategoryReference;
  subcategory: CategoryReference | null;
  createdByUserId: string;
  createdAt: Date;
  version: number;
}

export interface NewFinancialTransaction {
  id: string;
  financialSpaceId: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  financialDate: FinancialDate;
  categoryId: string;
  subcategoryId: string | null;
  createdByUserId: string;
}

export interface TransactionFields {
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amountMinor: number;
  financialDate: FinancialDate;
  categoryId: string;
  subcategoryId: string | null;
}

export function transactionFields(transaction: FinancialTransaction): TransactionFields {
  return {
    type: transaction.type,
    status: transaction.status,
    description: transaction.description,
    amountMinor: transaction.amountMinor,
    financialDate: transaction.financialDate,
    categoryId: transaction.category.id,
    subcategoryId: transaction.subcategory?.id ?? null,
  };
}
