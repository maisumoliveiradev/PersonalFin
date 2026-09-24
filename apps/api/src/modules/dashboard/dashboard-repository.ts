import type { FinancialDate } from '@personalfin/domain';

import type {
  CategoryTotal,
  FlowTotals,
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
  pendingTotals(range: DashboardRange): Promise<FlowTotals>;
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
