import type { DataAccess } from '../../database/data-access.ts';
import { AppError, NotFoundError } from '../../http/errors.ts';
import { diffFields } from '../audit/audit-event.ts';
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
  changes: Partial<TransactionFields>;
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
  return data.transaction(async ({ transactions, categories, audit }) => {
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
    const changes = diffFields({ ...before }, { ...after });
    if (Object.keys(changes).length === 0) {
      return current;
    }

    await assertCategorySelection(categories, {
      financialSpaceId: input.financialSpaceId,
      ...after,
    });
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
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'financial_transaction',
      entityId: input.transactionId,
      action: 'update',
      actorUserId: input.actorUserId,
      changes,
    });
    return updated;
  });
}
