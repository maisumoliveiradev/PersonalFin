import { randomUUID } from 'node:crypto';

import {
  type CurrencyCode,
  DEFAULT_CURRENCY,
  type FinancialDate,
  type Month,
  type TransactionStatus,
  type TransactionType,
} from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import {
  CardNotAvailableError,
  InvalidCardPurchaseError,
  resolvePurchaseInvoice,
} from '../cards/card-invoice-management.ts';
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
  card?: { cardId: string; invoiceMonth?: Month };
}

const SPACE_CURRENCY: CurrencyCode = DEFAULT_CURRENCY;

export async function createTransaction(
  data: DataAccess,
  input: CreateTransactionInput,
): Promise<FinancialTransaction> {
  await assertCategorySelection(data.repositories.categories, input);
  const { card: cardSelection, ...fields } = input;
  if (cardSelection === undefined) {
    return data.repositories.transactions.create({
      id: randomUUID(),
      currency: SPACE_CURRENCY,
      ...fields,
    });
  }
  if (fields.type !== 'expense') {
    throw new InvalidCardPurchaseError('Card purchases must be expenses');
  }
  return data.transaction(async (repositories) => {
    const card = await repositories.cards.findInSpace(input.financialSpaceId, cardSelection.cardId);
    if (card === null || card.archivedAt !== null) {
      throw new CardNotAvailableError();
    }
    const invoice = await resolvePurchaseInvoice(
      repositories,
      card,
      fields.financialDate,
      cardSelection.invoiceMonth,
    );
    return repositories.transactions.create({
      id: randomUUID(),
      currency: SPACE_CURRENCY,
      ...fields,
      status: 'pending',
      cardInvoiceId: invoice.id,
    });
  });
}
