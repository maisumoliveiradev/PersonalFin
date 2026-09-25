import type {
  CreateTransactionRequest,
  Transaction,
  UpdateTransactionRequest,
} from '@personalfin/api-contract';
import { changedFields, type SyncFields } from '@personalfin/domain';

export type TransactionChanges = Omit<UpdateTransactionRequest, 'version' | 'sync'>;

function joinTagIds(tagIds: readonly string[]): string {
  return [...tagIds].sort().join(',');
}

export function transactionSyncFields(transaction: Transaction): SyncFields {
  const fields: Record<string, string | number | null> = {
    type: transaction.type,
    description: transaction.description,
    amountMinor: transaction.amountMinor,
    financialDate: transaction.financialDate,
    categoryId: transaction.category.id,
    subcategoryId: transaction.subcategory?.id ?? null,
    tagIds: joinTagIds(transaction.tags.map((tag) => tag.id)),
  };
  if (transaction.cardPurchase === null) {
    fields.status = transaction.status;
  } else {
    fields.invoiceMonth = transaction.cardPurchase.invoiceMonth;
  }
  return fields;
}

export function changesSyncFields(changes: TransactionChanges): SyncFields {
  const fields: Record<string, string | number | null> = {};
  for (const [field, value] of Object.entries(changes)) {
    if (value === undefined) {
      continue;
    }
    fields[field] = Array.isArray(value) ? joinTagIds(value) : value;
  }
  return fields;
}

export function changesFromRequest(
  base: Transaction,
  request: CreateTransactionRequest,
): TransactionChanges {
  const { cardId: _cardId, installments: _installments, id: _id, ...candidate } = request;
  const baseFields = transactionSyncFields(base);
  const requested = changesSyncFields(candidate);
  const changes: Record<string, unknown> = {};
  for (const field of changedFields(baseFields, requested)) {
    if (field in baseFields) {
      changes[field] = candidate[field as keyof typeof candidate];
    }
  }
  return changes as TransactionChanges;
}
