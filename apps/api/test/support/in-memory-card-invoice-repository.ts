import type { Card } from '../../src/modules/cards/card.ts';
import type { CardInvoice } from '../../src/modules/cards/card-invoice.ts';
import type { CardInvoiceRepository } from '../../src/modules/cards/card-invoice-repository.ts';
import type {
  CardPurchaseReference,
  FinancialTransaction,
} from '../../src/modules/transactions/transaction.ts';

type StoredInvoice = Omit<CardInvoice, 'totalMinor'>;

export function createInMemoryCardInvoiceRepository(
  cards: readonly Card[],
  transactions: () => readonly FinancialTransaction[],
): CardInvoiceRepository & {
  invoices: StoredInvoice[];
  cardPurchase(invoiceId: string): CardPurchaseReference;
} {
  const invoices: StoredInvoice[] = [];

  function withTotal(invoice: StoredInvoice): CardInvoice {
    const totalMinor = transactions()
      .filter((item) => item.deletedAt === null && item.cardPurchase?.invoiceId === invoice.id)
      .reduce((total, item) => total + item.amountMinor, 0);
    return { ...invoice, totalMinor };
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
    cardPurchase(invoiceId) {
      const invoice = invoices.find((candidate) => candidate.id === invoiceId);
      if (invoice === undefined) {
        throw new Error(`Unknown invoice ${invoiceId}`);
      }
      return {
        cardId: invoice.cardId,
        cardName: cardName(invoice.cardId),
        invoiceId,
        invoiceMonth: invoice.referenceMonth,
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
        .filter((invoice) => invoice.totalMinor > 0)
        .sort(
          (left, right) =>
            left.dueDate.localeCompare(right.dueDate) ||
            left.cardName.localeCompare(right.cardName),
        );
    },
  };
}
