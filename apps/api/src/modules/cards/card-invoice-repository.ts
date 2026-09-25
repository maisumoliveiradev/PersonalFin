import type { FinancialDate, Month } from '@personalfin/domain';

import type {
  CardInvoice,
  DueInvoice,
  InvoicePayment,
  NewCardInvoice,
  NewInvoicePayment,
} from './card-invoice.ts';

export interface CardInvoiceDatesUpdate {
  financialSpaceId: string;
  invoiceId: string;
  expectedVersion: number;
  closingDate: FinancialDate;
  dueDate: FinancialDate;
}

export interface CardInvoiceRepository {
  findByMonth(
    financialSpaceId: string,
    cardId: string,
    referenceMonth: Month,
    options?: { lock: boolean },
  ): Promise<CardInvoice | null>;
  ensure(invoice: NewCardInvoice): Promise<CardInvoice>;
  updateDates(update: CardInvoiceDatesUpdate): Promise<CardInvoice | null>;
  listOpenDue(
    financialSpaceId: string,
    range: { start: FinancialDate; endExclusive: FinancialDate },
  ): Promise<DueInvoice[]>;
  recordPayment(payment: NewInvoicePayment): Promise<void>;
  listPayments(financialSpaceId: string, invoiceId: string): Promise<InvoicePayment[]>;
  deletePayment(
    financialSpaceId: string,
    invoiceId: string,
    paymentId: string,
    actorUserId: string,
  ): Promise<InvoicePayment | null>;
}
