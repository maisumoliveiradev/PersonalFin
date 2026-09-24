import { DEFAULT_CURRENCY, type Month, monthRange } from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import type { MonthlyDashboard } from './dashboard.ts';

export async function getMonthlyDashboard(
  data: DataAccess,
  financialSpaceId: string,
  month: Month,
): Promise<MonthlyDashboard> {
  const { dashboard } = data.repositories;
  const range = { financialSpaceId, ...monthRange(month) };
  const [totals, byCategory, observedBalance] = await Promise.all([
    dashboard.monthTotals(range),
    dashboard.realizedExpensesByCategory(range),
    dashboard.observedBalanceBefore(financialSpaceId, range.endExclusive),
  ]);
  return {
    month,
    currency: DEFAULT_CURRENCY,
    ...totals,
    realizedNet: totals.realizedIncome - totals.realizedExpenses,
    realizedExpensesByCategory: byCategory,
    observedBalance,
  };
}
