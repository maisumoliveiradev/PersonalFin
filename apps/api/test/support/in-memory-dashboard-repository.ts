import type { BalanceSnapshot } from '../../src/modules/balance/balance-snapshot.ts';
import type { DashboardRepository } from '../../src/modules/dashboard/dashboard-repository.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';

export function createInMemoryDashboardRepository(
  transactions: () => readonly FinancialTransaction[],
  snapshots: () => readonly BalanceSnapshot[],
  invoiceDueDate: (invoiceId: string) => string = () => '9999-12-31',
): DashboardRepository {
  function inRange(
    transaction: FinancialTransaction,
    range: { financialSpaceId: string; start: string; endExclusive: string },
  ) {
    const metricDate =
      transaction.cardPurchase === null
        ? transaction.financialDate
        : `${transaction.cardPurchase.invoiceMonth}-01`;
    return (
      transaction.financialSpaceId === range.financialSpaceId &&
      transaction.deletedAt === null &&
      metricDate >= range.start &&
      metricDate < range.endExclusive
    );
  }
  const sum = (items: readonly FinancialTransaction[]) =>
    items.reduce((total, item) => total + item.amountMinor, 0);

  return {
    async monthTotals(range) {
      const items = transactions().filter((transaction) => inRange(transaction, range));
      const pick = (type: string, status: string) =>
        sum(items.filter((item) => item.type === type && item.status === status));
      return {
        realizedIncome: pick('income', 'paid'),
        realizedExpenses: pick('expense', 'paid'),
        forecastIncome: pick('income', 'pending'),
        forecastExpenses: pick('expense', 'pending'),
      };
    },
    async realizedExpensesByCategory(range) {
      const totals = new Map<string, { categoryId: string; name: string; amountMinor: number }>();
      for (const item of transactions()) {
        if (inRange(item, range) && item.type === 'expense' && item.status === 'paid') {
          const current = totals.get(item.category.id) ?? {
            categoryId: item.category.id,
            name: item.category.name,
            amountMinor: 0,
          };
          current.amountMinor += item.amountMinor;
          totals.set(item.category.id, current);
        }
      }
      return [...totals.values()].sort(
        (left, right) =>
          right.amountMinor - left.amountMinor || left.name.localeCompare(right.name),
      );
    },
    async pendingTotals(range) {
      const items = transactions().filter(
        (item) =>
          item.financialSpaceId === range.financialSpaceId &&
          item.deletedAt === null &&
          item.status === 'pending' &&
          item.cardPurchase === null &&
          item.financialDate >= range.start &&
          item.financialDate < range.endExclusive,
      );
      return {
        income: sum(items.filter((item) => item.type === 'income')),
        expenses: sum(items.filter((item) => item.type === 'expense')),
      };
    },
    async projectionComponents(financialSpaceId, observedOn, endExclusive) {
      const active = transactions().filter(
        (item) =>
          item.financialSpaceId === financialSpaceId &&
          item.deletedAt === null &&
          item.cardPurchase === null &&
          item.financialDate < endExclusive,
      );
      const flow = (items: readonly FinancialTransaction[]) => ({
        income: sum(items.filter((item) => item.type === 'income')),
        expenses: sum(items.filter((item) => item.type === 'expense')),
      });
      return {
        afterObservation: flow(active.filter((item) => item.financialDate > observedOn)),
        pendingUpToObservation: flow(
          active.filter((item) => item.financialDate <= observedOn && item.status === 'pending'),
        ),
        openInvoices: sum(
          transactions().filter(
            (item) =>
              item.financialSpaceId === financialSpaceId &&
              item.deletedAt === null &&
              item.cardPurchase !== null &&
              invoiceDueDate(item.cardPurchase.invoiceId) < endExclusive,
          ),
        ),
      };
    },
    async observedBalanceBefore(financialSpaceId, endExclusive) {
      const latest = snapshots()
        .filter(
          (snapshot) =>
            snapshot.financialSpaceId === financialSpaceId && snapshot.observedOn < endExclusive,
        )
        .sort(
          (left, right) =>
            right.observedOn.localeCompare(left.observedOn) ||
            right.recordedAt.getTime() - left.recordedAt.getTime(),
        )[0];
      return latest === undefined
        ? null
        : { amountMinor: latest.amountMinor, observedOn: latest.observedOn };
    },
  };
}
