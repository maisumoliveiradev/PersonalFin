export const TRANSACTION_TYPES = ['expense', 'income'] as const;
export const TRANSACTION_STATUSES = ['paid', 'pending'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const DEFAULT_TRANSACTION_STATUS: TransactionStatus = 'paid';
export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 140;

export function normalizeTransactionDescription(description: string): string {
  return description.trim().replace(/\s+/g, ' ');
}
