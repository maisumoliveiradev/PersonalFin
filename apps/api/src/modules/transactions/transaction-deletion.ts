import type { DataAccess } from '../../database/data-access.ts';
import { AppError } from '../../http/errors.ts';
import type { FinancialTransaction } from './transaction.ts';
import { TransactionNotFoundError, VersionConflictError } from './update-transaction.ts';

export interface TransactionDeletionInput {
  financialSpaceId: string;
  transactionId: string;
  actorUserId: string;
  expectedVersion: number;
}

export class TransactionDeletionStateError extends AppError {
  override name = 'TransactionDeletionStateError';

  constructor(deleted: boolean) {
    super(
      409,
      deleted ? 'TRANSACTION_ALREADY_DELETED' : 'TRANSACTION_NOT_DELETED',
      deleted ? 'The transaction is already deleted' : 'The transaction is not deleted',
    );
  }
}

async function changeDeletion(
  data: DataAccess,
  input: TransactionDeletionInput,
  deleted: boolean,
): Promise<FinancialTransaction> {
  return data.transaction(async ({ transactions, audit }) => {
    const current = await transactions.findInSpace(input.financialSpaceId, input.transactionId, {
      lock: true,
    });
    if (current === null) {
      throw new TransactionNotFoundError();
    }
    if ((current.deletedAt !== null) === deleted) {
      throw new TransactionDeletionStateError(deleted);
    }
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    const deletedAtBefore = current.deletedAt?.toISOString() ?? null;
    const changed = await transactions.setDeleted({
      financialSpaceId: input.financialSpaceId,
      transactionId: input.transactionId,
      expectedVersion: input.expectedVersion,
      deleted,
      actorUserId: input.actorUserId,
    });
    if (changed === null) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'financial_transaction',
      entityId: input.transactionId,
      action: deleted ? 'delete' : 'restore',
      actorUserId: input.actorUserId,
      changes: {
        deletedAt: {
          before: deletedAtBefore,
          after: changed.deletedAt?.toISOString() ?? null,
        },
      },
    });
    return changed;
  });
}

export function deleteTransaction(data: DataAccess, input: TransactionDeletionInput) {
  return changeDeletion(data, input, true);
}

export function restoreTransaction(data: DataAccess, input: TransactionDeletionInput) {
  return changeDeletion(data, input, false);
}
