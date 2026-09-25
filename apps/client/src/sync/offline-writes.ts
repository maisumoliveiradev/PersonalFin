import type { CreateTransactionRequest, Transaction } from '@personalfin/api-contract';
import { onlineManager } from '@tanstack/react-query';

import { ApiRequestError } from '../api/api-client';
import type { EntrySummary } from './outbox';
import { enqueue } from './sync-engine';
import { type TransactionChanges, transactionSyncFields } from './transaction-sync-fields';

export function isOffline(): boolean {
  return !onlineManager.isOnline();
}

export function isNetworkFailure(error: unknown): boolean {
  return !(error instanceof ApiRequestError);
}

function summaryOf(transaction: Transaction): EntrySummary {
  return {
    type: transaction.type,
    description: transaction.description,
    amountMinor: transaction.amountMinor,
    financialDate: transaction.financialDate,
  };
}

export function queueCreate(
  spaceId: string,
  request: CreateTransactionRequest & { id: string },
): Promise<void> {
  return enqueue({
    spaceId,
    transactionId: request.id,
    operation: { kind: 'create', request },
    summary: {
      type: request.type,
      description: request.description,
      amountMinor: request.amountMinor,
      financialDate: request.financialDate,
    },
  });
}

export function queueUpdate(
  spaceId: string,
  transaction: Transaction,
  changes: TransactionChanges,
): Promise<void> {
  return enqueue({
    spaceId,
    transactionId: transaction.id,
    operation: {
      kind: 'update',
      baseVersion: transaction.version,
      base: transactionSyncFields(transaction),
      changes,
    },
    summary: {
      ...summaryOf(transaction),
      ...(changes.description === undefined ? {} : { description: changes.description }),
      ...(changes.amountMinor === undefined ? {} : { amountMinor: changes.amountMinor }),
      ...(changes.financialDate === undefined ? {} : { financialDate: changes.financialDate }),
    },
  });
}

export function queueDelete(spaceId: string, transaction: Transaction): Promise<void> {
  return enqueue({
    spaceId,
    transactionId: transaction.id,
    operation: {
      kind: 'delete',
      baseVersion: transaction.version,
      base: transactionSyncFields(transaction),
    },
    summary: summaryOf(transaction),
  });
}
