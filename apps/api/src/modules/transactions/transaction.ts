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
