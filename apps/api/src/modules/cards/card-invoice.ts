import type { CurrencyCode, FinancialDate, Month } from '@personalfin/domain';

export interface CardInvoice {
  id: string;
  cardId: string;
  financialSpaceId: string;
  referenceMonth: Month;
  closingDate: FinancialDate;
  dueDate: FinancialDate;
  version: number;
  totalMinor: number;
  paidMinor: number;
}

export type NewCardInvoice = Omit<CardInvoice, 'version' | 'totalMinor' | 'paidMinor'>;

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  financialSpaceId: string;
  amountMinor: number;
  currency: CurrencyCode;
  paidOn: FinancialDate;
  recordedByUserId: string;
  recordedAt: Date;
}

export type NewInvoicePayment = Omit<InvoicePayment, 'recordedAt'>;

export function outstandingMinor(invoice: Pick<CardInvoice, 'totalMinor' | 'paidMinor'>): number {
  return invoice.totalMinor - invoice.paidMinor;
}

export function isSettled(invoice: Pick<CardInvoice, 'totalMinor' | 'paidMinor'>): boolean {
  return invoice.totalMinor > 0 && invoice.paidMinor >= invoice.totalMinor;
}

export interface DueInvoice extends CardInvoice {
  cardName: string;
}
