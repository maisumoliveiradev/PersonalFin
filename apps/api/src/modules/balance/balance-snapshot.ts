import type { CurrencyCode, FinancialDate } from '@personalfin/domain';

export const BALANCE_NOTE_MAX_LENGTH = 140;

export interface BalanceSnapshot {
  id: string;
  financialSpaceId: string;
  amountMinor: number;
  currency: CurrencyCode;
  observedOn: FinancialDate;
  note: string | null;
  recordedByUserId: string;
  recordedAt: Date;
}

export type NewBalanceSnapshot = Omit<BalanceSnapshot, 'recordedAt'>;
