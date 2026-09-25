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
import { AppError } from '../../http/errors.ts';
import {
  CardNotAvailableError,
  InvalidCardPurchaseError,
  resolvePurchaseInvoice,
} from '../cards/card-invoice-management.ts';
import { assertTagSelection } from '../tags/tag-management.ts';
import { assertCategorySelection } from './category-selection.ts';
import type { FinancialTransaction } from './transaction.ts';

export interface CreateTransactionInput {
  id?: string;
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
  tagIds?: readonly string[];
}

const SPACE_CURRENCY: CurrencyCode = DEFAULT_CURRENCY;

export class TransactionIdConflictError extends AppError {
  override name = 'TransactionIdConflictError';

  constructor() {
    super(409, 'TRANSACTION_ID_CONFLICT', 'The transaction id is already in use');
  }
}

export interface CreatedTransaction {
  transaction: FinancialTransaction;
  replayed: boolean;
}

async function findReplay(
  data: DataAccess,
  input: CreateTransactionInput,
): Promise<FinancialTransaction | null> {
  if (input.id === undefined) {
    return null;
  }
  const origin = await data.repositories.transactions.findOrigin(input.id);
  if (origin === null) {
    return null;
  }
  if (
    origin.financialSpaceId !== input.financialSpaceId ||
    origin.createdByUserId !== input.createdByUserId
  ) {
    throw new TransactionIdConflictError();
  }
  return data.repositories.transactions.findInSpace(input.financialSpaceId, input.id);
}

export async function createTransactionOnce(
  data: DataAccess,
  input: CreateTransactionInput,
): Promise<CreatedTransaction> {
  const existing = await findReplay(data, input);
  if (existing !== null) {
    return { transaction: existing, replayed: true };
  }
  return { transaction: await createTransaction(data, input), replayed: false };
}

export async function createTransaction(
  data: DataAccess,
  input: CreateTransactionInput,
): Promise<FinancialTransaction> {
  await assertCategorySelection(data.repositories.categories, input);
  const { card: cardSelection, tagIds = [], id: requestedId, ...fields } = input;
  if (cardSelection !== undefined && fields.type !== 'expense') {
    throw new InvalidCardPurchaseError('Card purchases must be expenses');
  }
  return data.transaction(async (repositories) => {
    await assertTagSelection(repositories, input.financialSpaceId, tagIds);
    let cardFields = {};
    if (cardSelection !== undefined) {
      const card = await repositories.cards.findInSpace(
        input.financialSpaceId,
        cardSelection.cardId,
      );
      if (card === null || card.archivedAt !== null) {
        throw new CardNotAvailableError();
      }
      const invoice = await resolvePurchaseInvoice(
        repositories,
        card,
        fields.financialDate,
        cardSelection.invoiceMonth,
      );
      cardFields = { status: 'pending', cardInvoiceId: invoice.id };
    }
    const created = await repositories.transactions.create({
      id: requestedId ?? randomUUID(),
      currency: SPACE_CURRENCY,
      ...fields,
      ...cardFields,
    });
    if (tagIds.length === 0) {
      return created;
    }
    await repositories.tags.setForTransaction(input.financialSpaceId, created.id, tagIds);
    return (
      (await repositories.transactions.findInSpace(input.financialSpaceId, created.id)) ?? created
    );
  });
}
