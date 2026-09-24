import type { FinancialDate, Month } from '@personalfin/domain';

export interface CardInvoice {
  id: string;
  cardId: string;
  financialSpaceId: string;
  referenceMonth: Month;
  closingDate: FinancialDate;
  dueDate: FinancialDate;
  version: number;
  totalMinor: number;
}

export type NewCardInvoice = Omit<CardInvoice, 'version' | 'totalMinor'>;

export interface DueInvoice extends CardInvoice {
  cardName: string;
}
