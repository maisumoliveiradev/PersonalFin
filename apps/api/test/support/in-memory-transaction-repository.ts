import type { Category } from '../../src/modules/categories/category.ts';
import type {
  CardPurchaseReference,
  FinancialTransaction,
} from '../../src/modules/transactions/transaction.ts';
import {
  InvalidCursorError,
  type TransactionRepository,
} from '../../src/modules/transactions/transaction-repository.ts';

export function createInMemoryTransactionRepository(
  categories: readonly Category[],
  cardPurchase: (invoiceId: string) => CardPurchaseReference = () => {
    throw new Error('Card purchases are not configured');
  },
  installmentCount: (purchaseId: string) => number = () => {
    throw new Error('Installments are not configured');
  },
): TransactionRepository & { transactions: FinancialTransaction[] } {
  const transactions: FinancialTransaction[] = [];

  function reference(categoryId: string) {
    const category = categories.find((candidate) => candidate.id === categoryId);
    if (category === undefined) {
      throw new Error(`Unknown category ${categoryId}`);
    }
    return { id: category.id, name: category.name };
  }

  function find(financialSpaceId: string, transactionId: string) {
    return transactions.find(
      (transaction) =>
        transaction.financialSpaceId === financialSpaceId && transaction.id === transactionId,
    );
  }

  return {
    transactions,
    async create(transaction) {
      const {
        categoryId,
        subcategoryId,
        cardInvoiceId,
        installment,
        importBatchId: _importBatchId,
        original,
        ...rest
      } = transaction;
      const created: FinancialTransaction = {
        ...rest,
        original: original ?? null,
        attachmentCount: 0,
        installment:
          installment === undefined
            ? null
            : { ...installment, count: installmentCount(installment.purchaseId) },
        cardPurchase: cardInvoiceId == null ? null : cardPurchase(cardInvoiceId),
        tags: [],
        category: reference(categoryId),
        subcategory: subcategoryId === null ? null : reference(subcategoryId),
        createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, transactions.length)),
        version: 1,
        deletedAt: null,
        recurrenceSeriesId: null,
        occurrenceDate: null,
        individuallyModified: false,
      };
      transactions.push(created);
      return created;
    },
    async findOrigin(transactionId) {
      const transaction = transactions.find((item) => item.id === transactionId);
      return transaction === undefined
        ? null
        : {
            financialSpaceId: transaction.financialSpaceId,
            createdByUserId: transaction.createdByUserId,
          };
    },
    async findInSpace(financialSpaceId, transactionId) {
      return find(financialSpaceId, transactionId) ?? null;
    },
    async update({ financialSpaceId, transactionId, expectedVersion, fields }) {
      const current = find(financialSpaceId, transactionId);
      if (
        current === undefined ||
        current.version !== expectedVersion ||
        current.deletedAt !== null
      ) {
        return null;
      }
      const {
        categoryId,
        subcategoryId,
        cardInvoiceId,
        originalCurrency,
        originalAmountMinor,
        fxRate,
        fxRateSource,
        ...rest
      } = fields;
      Object.assign(current, rest, {
        original:
          originalCurrency === null ||
          originalAmountMinor === null ||
          fxRate === null ||
          fxRateSource === null
            ? null
            : {
                currency: originalCurrency,
                amountMinor: originalAmountMinor,
                rate: fxRate,
                rateSource: fxRateSource,
              },
        cardPurchase: cardInvoiceId === null ? null : cardPurchase(cardInvoiceId),
        individuallyModified: current.individuallyModified || current.recurrenceSeriesId !== null,
        category: reference(categoryId),
        subcategory: subcategoryId === null ? null : reference(subcategoryId),
        version: current.version + 1,
      });
      return current;
    },
    async setDeleted({ financialSpaceId, transactionId, expectedVersion, deleted }) {
      const current = find(financialSpaceId, transactionId);
      if (
        current === undefined ||
        current.version !== expectedVersion ||
        (current.deletedAt !== null) === deleted
      ) {
        return null;
      }
      current.deletedAt = deleted ? new Date() : null;
      if (deleted && current.recurrenceSeriesId !== null) {
        current.individuallyModified = true;
      }
      current.version += 1;
      return current;
    },
    async list(query) {
      const text = query.text?.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      const matches = transactions.filter(
        (transaction) =>
          transaction.financialSpaceId === query.financialSpaceId &&
          (query.state === 'active') === (transaction.deletedAt === null) &&
          (query.range === undefined ||
            (transaction.financialDate >= query.range.start &&
              transaction.financialDate < query.range.endExclusive)) &&
          (query.type === undefined || transaction.type === query.type) &&
          (query.tagId === undefined || transaction.tags.some((tag) => tag.id === query.tagId)) &&
          (query.cardInvoiceId === undefined ||
            transaction.cardPurchase?.invoiceId === query.cardInvoiceId) &&
          (query.excludeCardPurchases !== true || transaction.cardPurchase === null) &&
          (query.status === undefined || transaction.status === query.status) &&
          (query.categoryId === undefined ||
            transaction.category.id === query.categoryId ||
            transaction.subcategory?.id === query.categoryId) &&
          (text === undefined ||
            transaction.description
              .normalize('NFD')
              .replace(/\p{M}/gu, '')
              .toLowerCase()
              .includes(text)),
      );
      const sorted =
        query.state === 'active'
          ? matches.sort(
              (left, right) =>
                right.financialDate.localeCompare(left.financialDate) ||
                right.createdAt.getTime() - left.createdAt.getTime(),
            )
          : matches;
      const offset = query.cursor === null ? 0 : Number(query.cursor);
      if (!Number.isInteger(offset) || offset < 0) {
        throw new InvalidCursorError();
      }
      const items = sorted.slice(offset, offset + query.limit);
      const nextOffset = offset + items.length;
      return { items, nextCursor: nextOffset < sorted.length ? String(nextOffset) : null };
    },
  };
}
