import { randomUUID } from 'node:crypto';

import {
  DEFAULT_CURRENCY,
  installmentDate,
  type Month,
  shiftMonth,
  splitInstallments,
} from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { NotFoundError } from '../../http/errors.ts';
import { assertCategorySelection } from '../transactions/category-selection.ts';
import type { CreateTransactionInput } from '../transactions/create-transaction.ts';
import type { FinancialTransaction } from '../transactions/transaction.ts';
import {
  CardNotAvailableError,
  ensureInvoice,
  InvalidCardPurchaseError,
  resolvePurchaseInvoice,
} from './card-invoice-management.ts';

export class InstallmentPurchaseNotFoundError extends NotFoundError {
  constructor() {
    super('INSTALLMENT_PURCHASE_NOT_FOUND', 'Installment purchase not found');
  }
}

export interface InstallmentPurchaseInput extends Omit<CreateTransactionInput, 'card'> {
  card: { cardId: string; invoiceMonth?: Month };
  installments: number;
}

export async function createInstallmentPurchase(
  data: DataAccess,
  input: InstallmentPurchaseInput,
): Promise<FinancialTransaction[]> {
  if (input.type !== 'expense') {
    throw new InvalidCardPurchaseError('Card purchases must be expenses');
  }
  if (input.amountMinor < input.installments) {
    throw new InvalidCardPurchaseError('Each installment must be at least one minor unit');
  }
  const amounts = splitInstallments(input.amountMinor, input.installments);
  await assertCategorySelection(data.repositories.categories, input);
  return data.transaction(async (repositories) => {
    const card = await repositories.cards.findInSpace(input.financialSpaceId, input.card.cardId);
    if (card === null || card.archivedAt !== null) {
      throw new CardNotAvailableError();
    }
    const firstInvoice = await resolvePurchaseInvoice(
      repositories,
      card,
      input.financialDate,
      input.card.invoiceMonth,
    );
    const purchaseId = randomUUID();
    await repositories.installments.create({
      id: purchaseId,
      financialSpaceId: input.financialSpaceId,
      cardId: card.id,
      description: input.description,
      totalMinor: input.amountMinor,
      currency: DEFAULT_CURRENCY,
      installmentCount: input.installments,
      purchaseDate: input.financialDate,
      firstInvoiceMonth: firstInvoice.referenceMonth,
      createdByUserId: input.createdByUserId,
    });
    const created: FinancialTransaction[] = [];
    for (const [index, amountMinor] of amounts.entries()) {
      const invoice =
        index === 0
          ? firstInvoice
          : await ensureInvoice(repositories, card, shiftMonth(firstInvoice.referenceMonth, index));
      created.push(
        await repositories.transactions.create({
          id: randomUUID(),
          financialSpaceId: input.financialSpaceId,
          createdByUserId: input.createdByUserId,
          type: 'expense',
          status: 'pending',
          description: input.description,
          amountMinor,
          currency: DEFAULT_CURRENCY,
          financialDate: installmentDate(input.financialDate, index),
          categoryId: input.categoryId,
          subcategoryId: input.subcategoryId,
          cardInvoiceId: invoice.id,
          installment: { purchaseId, number: index + 1 },
        }),
      );
    }
    return created;
  });
}

export interface CancelInstallmentsInput {
  financialSpaceId: string;
  purchaseId: string;
  afterMonth: Month;
  actorUserId: string;
}

export async function cancelInstallments(
  data: DataAccess,
  input: CancelInstallmentsInput,
): Promise<number> {
  return data.transaction(async ({ installments, audit }) => {
    if (!(await installments.exists(input.financialSpaceId, input.purchaseId))) {
      throw new InstallmentPurchaseNotFoundError();
    }
    const ids = await installments.listCancellable(
      input.financialSpaceId,
      input.purchaseId,
      input.afterMonth,
    );
    await installments.softDelete(ids, input.actorUserId);
    for (const id of ids) {
      await audit.record({
        financialSpaceId: input.financialSpaceId,
        entityType: 'financial_transaction',
        entityId: id,
        action: 'delete',
        actorUserId: input.actorUserId,
        changes: { reason: { before: null, after: 'installments_cancelled' } },
      });
    }
    return ids.length;
  });
}
