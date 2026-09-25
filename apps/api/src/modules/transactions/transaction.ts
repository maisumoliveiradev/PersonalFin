import type {
  CurrencyCode,
  FinancialDate,
  Month,
  TransactionStatus,
  TransactionType,
} from '@personalfin/domain';

export interface CategoryReference {
  id: string;
  name: string;
}

export interface CardPurchaseReference {
  cardId: string;
  cardName: string;
  invoiceId: string;
  invoiceMonth: Month;
}

export interface InstallmentReference {
  purchaseId: string;
  number: number;
  count: number;
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
  deletedAt: Date | null;
  recurrenceSeriesId: string | null;
  occurrenceDate: FinancialDate | null;
  individuallyModified: boolean;
  cardPurchase: CardPurchaseReference | null;
  installment: InstallmentReference | null;
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
  cardInvoiceId?: string | null;
  installment?: { purchaseId: string; number: number };
}

export interface TransactionFields {
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amountMinor: number;
  financialDate: FinancialDate;
  categoryId: string;
  subcategoryId: string | null;
  cardInvoiceId: string | null;
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
    cardInvoiceId: transaction.cardPurchase?.invoiceId ?? null,
  };
}
