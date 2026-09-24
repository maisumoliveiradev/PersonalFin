import { randomUUID } from 'node:crypto';

import {
  type CurrencyCode,
  DEFAULT_CURRENCY,
  type FinancialDate,
  type TransactionStatus,
  type TransactionType,
} from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { assertCategorySelection } from './category-selection.ts';
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

const SPACE_CURRENCY: CurrencyCode = DEFAULT_CURRENCY;

export async function createTransaction(
  data: DataAccess,
  input: CreateTransactionInput,
): Promise<FinancialTransaction> {
  await assertCategorySelection(data.repositories.categories, input);
  return data.repositories.transactions.create({
    id: randomUUID(),
    currency: SPACE_CURRENCY,
    ...input,
  });
}
