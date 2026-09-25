import type { Card } from '../../src/modules/cards/card.ts';
import type { CardInvoice, InvoicePayment } from '../../src/modules/cards/card-invoice.ts';
import type { CardInvoiceRepository } from '../../src/modules/cards/card-invoice-repository.ts';
import type {
  CardPurchaseReference,
  FinancialTransaction,
} from '../../src/modules/transactions/transaction.ts';

type StoredInvoice = Omit<CardInvoice, 'totalMinor' | 'paidMinor'>;
type StoredPayment = InvoicePayment & { deletedAt: Date | null };

export function createInMemoryCardInvoiceRepository(
  cards: readonly Card[],
  transactions: () => readonly FinancialTransaction[],
): CardInvoiceRepository & {
  invoices: StoredInvoice[];
  payments: StoredPayment[];
  cardPurchase(invoiceId: string): CardPurchaseReference;
  flows(
    financialSpaceId: string,
    observedOn: string,
    endExclusive: string,
  ): { openInvoices: number; invoicePayments: number };
  hasPayment(invoiceId: string): boolean;
} {
  const invoices: StoredInvoice[] = [];
  const payments: StoredPayment[] = [];

  function withTotal(invoice: StoredInvoice): CardInvoice {
    const totalMinor = transactions()
      .filter((item) => item.deletedAt === null && item.cardPurchase?.invoiceId === invoice.id)
      .reduce((total, item) => total + item.amountMinor, 0);
    const paidMinor = payments
      .filter((payment) => payment.invoiceId === invoice.id && payment.deletedAt === null)
      .reduce((total, payment) => total + payment.amountMinor, 0);
    return { ...invoice, totalMinor, paidMinor };
  }

  function find(financialSpaceId: string, cardId: string, referenceMonth: string) {
    return invoices.find(
      (invoice) =>
        invoice.financialSpaceId === financialSpaceId &&
        invoice.cardId === cardId &&
        invoice.referenceMonth === referenceMonth,
    );
  }

  function cardName(cardId: string) {
    return cards.find((card) => card.id === cardId)?.name ?? '';
  }

  return {
    invoices,
    payments,
    hasPayment(invoiceId) {
      return payments.some(
        (payment) => payment.invoiceId === invoiceId && payment.deletedAt === null,
      );
    },
    flows(financialSpaceId, observedOn, endExclusive) {
      const active = payments.filter(
        (payment) => payment.financialSpaceId === financialSpaceId && payment.deletedAt === null,
      );
      const openInvoices = invoices
        .filter(
          (invoice) =>
            invoice.financialSpaceId === financialSpaceId && invoice.dueDate < endExclusive,
        )
        .map((invoice) => {
          const paidBefore = active
            .filter((payment) => payment.invoiceId === invoice.id && payment.paidOn < endExclusive)
            .reduce((total, payment) => total + payment.amountMinor, 0);
          return Math.max(withTotal(invoice).totalMinor - paidBefore, 0);
        })
        .reduce((total, value) => total + value, 0);
      const invoicePayments = active
        .filter((payment) => payment.paidOn > observedOn && payment.paidOn < endExclusive)
        .reduce((total, payment) => total + payment.amountMinor, 0);
      return { openInvoices, invoicePayments };
    },
    async recordPayment(payment) {
      payments.push({
        ...payment,
        recordedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, payments.length)),
        deletedAt: null,
      });
    },
    async listPayments(financialSpaceId, invoiceId) {
      return payments
        .filter(
          (payment) =>
            payment.financialSpaceId === financialSpaceId &&
            payment.invoiceId === invoiceId &&
            payment.deletedAt === null,
        )
        .sort((left, right) => left.paidOn.localeCompare(right.paidOn));
    },
    async deletePayment(financialSpaceId, invoiceId, paymentId) {
      const payment = payments.find(
        (candidate) =>
          candidate.financialSpaceId === financialSpaceId &&
          candidate.invoiceId === invoiceId &&
          candidate.id === paymentId &&
          candidate.deletedAt === null,
      );
      if (payment === undefined) {
        return null;
      }
      payment.deletedAt = new Date();
      return payment;
    },
    cardPurchase(invoiceId) {
      const invoice = invoices.find((candidate) => candidate.id === invoiceId);
      if (invoice === undefined) {
        throw new Error(`Unknown invoice ${invoiceId}`);
      }
      const settled = () => {
        const current = withTotal(invoice);
        return current.totalMinor > 0 && current.paidMinor >= current.totalMinor;
      };
      return {
        cardId: invoice.cardId,
        cardName: cardName(invoice.cardId),
        invoiceId,
        invoiceMonth: invoice.referenceMonth,
        get invoiceSettled() {
          return settled();
        },
      };
    },
    async findByMonth(financialSpaceId, cardId, referenceMonth) {
      const invoice = find(financialSpaceId, cardId, referenceMonth);
      return invoice === undefined ? null : withTotal(invoice);
    },
    async ensure(invoice) {
      const existing = find(invoice.financialSpaceId, invoice.cardId, invoice.referenceMonth);
      if (existing !== undefined) {
        return withTotal(existing);
      }
      const stored = { ...invoice, version: 1 };
      invoices.push(stored);
      return withTotal(stored);
    },
    async updateDates({ financialSpaceId, invoiceId, expectedVersion, closingDate, dueDate }) {
      const invoice = invoices.find(
        (candidate) =>
          candidate.financialSpaceId === financialSpaceId &&
          candidate.id === invoiceId &&
          candidate.version === expectedVersion,
      );
      if (invoice === undefined) {
        return null;
      }
      Object.assign(invoice, { closingDate, dueDate, version: invoice.version + 1 });
      return withTotal(invoice);
    },
    async listOpenDue(financialSpaceId, range) {
      return invoices
        .filter(
          (invoice) =>
            invoice.financialSpaceId === financialSpaceId &&
            invoice.dueDate >= range.start &&
            invoice.dueDate < range.endExclusive,
        )
        .map((invoice) => ({ ...withTotal(invoice), cardName: cardName(invoice.cardId) }))
        .filter((invoice) => invoice.totalMinor > invoice.paidMinor)
        .sort(
          (left, right) =>
            left.dueDate.localeCompare(right.dueDate) ||
            left.cardName.localeCompare(right.cardName),
        );
    },
  };
}
