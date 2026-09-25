import type { Month } from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { AppError, NotFoundError } from '../../http/errors.ts';
import { type AuditContext, diffFields } from '../audit/audit-event.ts';
import {
  InvalidCardPurchaseError,
  resolvePurchaseInvoice,
} from '../cards/card-invoice-management.ts';
import { assertTagSelection } from '../tags/tag-management.ts';
import { assertCategorySelection } from './category-selection.ts';
import {
  type FinancialTransaction,
  type TransactionFields,
  transactionFields,
} from './transaction.ts';

export interface UpdateTransactionInput {
  financialSpaceId: string;
  transactionId: string;
  actorUserId: string;
  expectedVersion: number;
  changes: Partial<Omit<TransactionFields, 'cardInvoiceId'>>;
  invoiceMonth?: Month;
  tagIds?: readonly string[];
  syncContext?: AuditContext;
}

export class TransactionNotFoundError extends NotFoundError {
  constructor() {
    super('TRANSACTION_NOT_FOUND', 'Transaction not found');
  }
}

export class VersionConflictError extends AppError {
  override name = 'VersionConflictError';

  constructor() {
    super(409, 'VERSION_CONFLICT', 'The record was changed by someone else; reload and try again');
  }
}

export class TransactionDeletedError extends AppError {
  override name = 'TransactionDeletedError';

  constructor() {
    super(409, 'TRANSACTION_DELETED', 'Deleted transactions cannot be edited; restore it first');
  }
}

export async function updateTransaction(
  data: DataAccess,
  input: UpdateTransactionInput,
): Promise<FinancialTransaction> {
  return data.transaction(async (repositories) => {
    const { transactions, categories, audit } = repositories;
    const current = await transactions.findInSpace(input.financialSpaceId, input.transactionId, {
      lock: true,
    });
    if (current === null) {
      throw new TransactionNotFoundError();
    }
    if (current.deletedAt !== null) {
      throw new TransactionDeletedError();
    }
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }

    const before = transactionFields(current);
    const after: TransactionFields = { ...before, ...input.changes };
    if (current.cardPurchase === null) {
      if (input.invoiceMonth !== undefined) {
        throw new InvalidCardPurchaseError('Only card purchases have an invoice');
      }
    } else {
      if (after.type !== 'expense' || after.status !== 'pending') {
        throw new InvalidCardPurchaseError(
          'Card purchases are expenses whose status follows the invoice',
        );
      }
      if (input.invoiceMonth !== undefined) {
        const card = await repositories.cards.findInSpace(
          input.financialSpaceId,
          current.cardPurchase.cardId,
        );
        if (card === null) {
          throw new InvalidCardPurchaseError('The card of this purchase no longer exists');
        }
        const invoice = await resolvePurchaseInvoice(
          repositories,
          card,
          after.financialDate,
          input.invoiceMonth,
        );
        after.cardInvoiceId = invoice.id;
      }
    }
    const tagsBefore = current.tags.map((tag) => tag.id).sort();
    const tagsAfter = input.tagIds === undefined ? tagsBefore : [...new Set(input.tagIds)].sort();
    if (input.tagIds !== undefined) {
      await assertTagSelection(repositories, input.financialSpaceId, tagsAfter, tagsBefore);
    }
    const changes = diffFields(
      { ...before, tagIds: tagsBefore.join(',') },
      { ...after, tagIds: tagsAfter.join(',') },
    );
    if (Object.keys(changes).length === 0) {
      return current;
    }

    await assertCategorySelection(
      categories,
      { financialSpaceId: input.financialSpaceId, ...after },
      { categoryId: before.categoryId, subcategoryId: before.subcategoryId },
    );
    const updated = await transactions.update({
      financialSpaceId: input.financialSpaceId,
      transactionId: input.transactionId,
      expectedVersion: input.expectedVersion,
      fields: after,
      updatedByUserId: input.actorUserId,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    if (changes.tagIds !== undefined) {
      await repositories.tags.setForTransaction(
        input.financialSpaceId,
        input.transactionId,
        tagsAfter,
      );
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'financial_transaction',
      entityId: input.transactionId,
      action: 'update',
      actorUserId: input.actorUserId,
      changes,
      context: input.syncContext ?? null,
    });
    if (changes.tagIds === undefined) {
      return updated;
    }
    return (await transactions.findInSpace(input.financialSpaceId, input.transactionId)) ?? updated;
  });
}
