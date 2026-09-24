import { randomUUID } from 'node:crypto';

import {
  candidateInvoiceMonths,
  defaultInvoiceDates,
  type FinancialDate,
  type Month,
} from '@personalfin/domain';

import type { DataAccess, Repositories } from '../../database/data-access.ts';
import { AppError } from '../../http/errors.ts';
import { diffFields } from '../audit/audit-event.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import type { Card } from './card.ts';
import { CardNotFoundError } from './card-errors.ts';
import type { CardInvoice } from './card-invoice.ts';

export class CardNotAvailableError extends AppError {
  override name = 'CardNotAvailableError';

  constructor() {
    super(422, 'CARD_NOT_AVAILABLE', 'The card does not exist in this space or is archived');
  }
}

export class InvalidCardPurchaseError extends AppError {
  override name = 'InvalidCardPurchaseError';

  constructor(message: string) {
    super(422, 'INVALID_CARD_PURCHASE', message);
  }
}

type InvoiceRepositories = Pick<Repositories, 'cardInvoices'>;

async function defaultMonthForPurchase(
  { cardInvoices }: InvoiceRepositories,
  card: Card,
  purchaseDate: FinancialDate,
): Promise<Month> {
  for (const month of candidateInvoiceMonths(purchaseDate)) {
    const stored = await cardInvoices.findByMonth(card.financialSpaceId, card.id, month);
    const closingDate = stored?.closingDate ?? defaultInvoiceDates(month, card).closingDate;
    if (closingDate > purchaseDate) {
      return month;
    }
  }
  throw new InvalidCardPurchaseError('No invoice of this card closes after the purchase date');
}

export function ensureInvoice(
  { cardInvoices }: InvoiceRepositories,
  card: Card,
  referenceMonth: Month,
): Promise<CardInvoice> {
  return cardInvoices.ensure({
    id: randomUUID(),
    cardId: card.id,
    financialSpaceId: card.financialSpaceId,
    referenceMonth,
    ...defaultInvoiceDates(referenceMonth, card),
  });
}

export async function resolvePurchaseInvoice(
  repositories: InvoiceRepositories,
  card: Card,
  purchaseDate: FinancialDate,
  requestedMonth: Month | undefined,
): Promise<CardInvoice> {
  if (
    requestedMonth !== undefined &&
    !candidateInvoiceMonths(purchaseDate).includes(requestedMonth)
  ) {
    throw new InvalidCardPurchaseError(
      'The invoice must be from the month before to two months after the purchase date',
    );
  }
  const month = requestedMonth ?? (await defaultMonthForPurchase(repositories, card, purchaseDate));
  return ensureInvoice(repositories, card, month);
}

export interface UpdateInvoiceDatesInput {
  financialSpaceId: string;
  cardId: string;
  referenceMonth: Month;
  actorUserId: string;
  expectedVersion: number | null;
  closingDate: FinancialDate;
  dueDate: FinancialDate;
}

export async function updateInvoiceDates(
  data: DataAccess,
  input: UpdateInvoiceDatesInput,
): Promise<CardInvoice> {
  return data.transaction(async (repositories) => {
    const { cards, cardInvoices, audit } = repositories;
    const card = await cards.findInSpace(input.financialSpaceId, input.cardId);
    if (card === null) {
      throw new CardNotFoundError();
    }
    let current = await cardInvoices.findByMonth(
      input.financialSpaceId,
      card.id,
      input.referenceMonth,
      { lock: true },
    );
    if (current === null) {
      if (input.expectedVersion !== null) {
        throw new VersionConflictError();
      }
      current = await ensureInvoice(repositories, card, input.referenceMonth);
    } else if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    const changes = diffFields(
      { closingDate: current.closingDate, dueDate: current.dueDate },
      { closingDate: input.closingDate, dueDate: input.dueDate },
    );
    if (Object.keys(changes).length === 0) {
      return current;
    }
    const updated = await cardInvoices.updateDates({
      financialSpaceId: input.financialSpaceId,
      invoiceId: current.id,
      expectedVersion: current.version,
      closingDate: input.closingDate,
      dueDate: input.dueDate,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'card_invoice',
      entityId: updated.id,
      action: 'update',
      actorUserId: input.actorUserId,
      changes,
    });
    return updated;
  });
}
