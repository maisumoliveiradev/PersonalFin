import type { AnalyticsRepository } from '../../src/modules/analytics/analytics-repository.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';

export function createInMemoryAnalyticsRepository(
  transactions: () => readonly FinancialTransaction[],
): AnalyticsRepository {
  function realizedExpenses(range: {
    financialSpaceId: string;
    start: string;
    endExclusive: string;
  }) {
    return transactions().filter((item) => {
      const metricDate =
        item.cardPurchase === null ? item.financialDate : `${item.cardPurchase.invoiceMonth}-01`;
      const paid =
        item.cardPurchase === null ? item.status === 'paid' : item.cardPurchase.invoiceSettled;
      return (
        item.financialSpaceId === range.financialSpaceId &&
        item.deletedAt === null &&
        item.type === 'expense' &&
        paid &&
        metricDate >= range.start &&
        metricDate < range.endExclusive
      );
    });
  }

  return {
    async realizedExpensesByCategory(range) {
      const rows = new Map<
        string,
        {
          categoryId: string;
          categoryName: string;
          subcategoryId: string | null;
          subcategoryName: string | null;
          amountMinor: number;
        }
      >();
      for (const item of realizedExpenses(range)) {
        const key = `${item.category.id}:${item.subcategory?.id ?? ''}`;
        const row = rows.get(key) ?? {
          categoryId: item.category.id,
          categoryName: item.category.name,
          subcategoryId: item.subcategory?.id ?? null,
          subcategoryName: item.subcategory?.name ?? null,
          amountMinor: 0,
        };
        row.amountMinor += item.amountMinor;
        rows.set(key, row);
      }
      return [...rows.values()];
    },
    async realizedExpensesByTag(range) {
      const rows = new Map<string, { tagId: string; name: string; amountMinor: number }>();
      for (const item of realizedExpenses(range)) {
        for (const tag of item.tags) {
          const row = rows.get(tag.id) ?? { tagId: tag.id, name: tag.name, amountMinor: 0 };
          row.amountMinor += item.amountMinor;
          rows.set(tag.id, row);
        }
      }
      return [...rows.values()];
    },
  };
}
