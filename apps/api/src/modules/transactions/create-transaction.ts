import { randomUUID } from 'node:crypto';

import {
  type CurrencyCode,
  DEFAULT_CURRENCY,
  type FinancialDate,
  type TransactionStatus,
  type TransactionType,
} from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { AppError } from '../../http/errors.ts';
import type { FinancialTransaction } from './transaction.ts';

export interface CreateTransactionInput {
  financialSpaceId: string;
  createdByUserId: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amountMinor: number;
  financialDate: FinancialDate;
  categoryId: string;
  subcategoryId: string | null;
}

export class CategoryNotAvailableError extends AppError {
  override name = 'CategoryNotAvailableError';

  constructor() {
    super(
      422,
      'CATEGORY_NOT_AVAILABLE',
      'The category or subcategory is not available for this transaction type in this space',
    );
  }
}

const SPACE_CURRENCY: CurrencyCode = DEFAULT_CURRENCY;

export async function createTransaction(
  data: DataAccess,
  input: CreateTransactionInput,
): Promise<FinancialTransaction> {
  const { categories, transactions } = data.repositories;
  const category = await categories.findInSpace(input.financialSpaceId, input.categoryId);
  if (category === null || category.parentCategoryId !== null || category.kind !== input.type) {
    throw new CategoryNotAvailableError();
  }
  if (input.subcategoryId !== null) {
    const subcategory = await categories.findInSpace(input.financialSpaceId, input.subcategoryId);
    if (subcategory === null || subcategory.parentCategoryId !== category.id) {
      throw new CategoryNotAvailableError();
    }
  }
  return transactions.create({
    id: randomUUID(),
    currency: SPACE_CURRENCY,
    ...input,
  });
}
