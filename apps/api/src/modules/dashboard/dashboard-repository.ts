import type { FinancialDate } from '@personalfin/domain';

import type {
  CategoryTotal,
  MonthTotals,
  ObservedBalance,
  ProjectionComponents,
} from './dashboard.ts';

export interface DashboardRange {
  financialSpaceId: string;
  start: FinancialDate;
  endExclusive: FinancialDate;
}

export interface DashboardRepository {
  monthTotals(range: DashboardRange): Promise<MonthTotals>;
  realizedExpensesByCategory(range: DashboardRange): Promise<CategoryTotal[]>;
  projectionComponents(
    financialSpaceId: string,
    observedOn: FinancialDate,
    endExclusive: FinancialDate,
  ): Promise<ProjectionComponents>;
  observedBalanceBefore(
    financialSpaceId: string,
    endExclusive: FinancialDate,
  ): Promise<ObservedBalance | null>;
}
