import type { CurrencyCode, FinancialDate } from '@personalfin/domain';

export interface Card {
  id: string;
  financialSpaceId: string;
  name: string;
  closingDay: number;
  dueDay: number;
  archivedAt: Date | null;
  version: number;
}

export type NewCard = Omit<Card, 'archivedAt' | 'version'> & { createdByUserId: string };

export interface CardLimitChange {
  id: string;
  cardId: string;
  financialSpaceId: string;
  amountMinor: number;
  currency: CurrencyCode;
  effectiveFrom: FinancialDate;
  recordedByUserId: string;
  recordedAt: Date;
}

export type NewCardLimitChange = Omit<CardLimitChange, 'recordedAt'>;

export function normalizeCardName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
