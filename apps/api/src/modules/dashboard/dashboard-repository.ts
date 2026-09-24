import type { FinancialDate } from '@personalfin/domain';

import type { CategoryTotal, MonthTotals, ObservedBalance } from './dashboard.ts';

export interface DashboardRange {
  financialSpaceId: string;
  start: FinancialDate;
  endExclusive: FinancialDate;
}

export interface DashboardRepository {
  monthTotals(range: DashboardRange): Promise<MonthTotals>;
  realizedExpensesByCategory(range: DashboardRange): Promise<CategoryTotal[]>;
  observedBalanceBefore(
    financialSpaceId: string,
    endExclusive: FinancialDate,
  ): Promise<ObservedBalance | null>;
}
