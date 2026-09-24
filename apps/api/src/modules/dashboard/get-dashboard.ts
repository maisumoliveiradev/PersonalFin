import { DEFAULT_CURRENCY, type Month, monthRange, shiftMonth } from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { computeProjection, type MonthlyDashboard, type Projection } from './dashboard.ts';

export async function getProjection(
  data: DataAccess,
  financialSpaceId: string,
  month: Month,
): Promise<Projection | null> {
  const { endExclusive } = monthRange(month);
  const base = await data.repositories.dashboard.observedBalanceBefore(
    financialSpaceId,
    endExclusive,
  );
  if (base === null) {
    return null;
  }
  const components = await data.repositories.dashboard.projectionComponents(
    financialSpaceId,
    base.observedOn,
    endExclusive,
  );
  return computeProjection(base, components);
}

export async function getMonthlyDashboard(
  data: DataAccess,
  financialSpaceId: string,
  month: Month,
): Promise<MonthlyDashboard> {
  const { dashboard } = data.repositories;
  const range = { financialSpaceId, ...monthRange(month) };
  const [totals, byCategory, observedBalance, projection] = await Promise.all([
    dashboard.monthTotals(range),
    dashboard.realizedExpensesByCategory(range),
    dashboard.observedBalanceBefore(financialSpaceId, range.endExclusive),
    getProjection(data, financialSpaceId, month),
  ]);
  return {
    month,
    currency: DEFAULT_CURRENCY,
    ...totals,
    realizedNet: totals.realizedIncome - totals.realizedExpenses,
    realizedExpensesByCategory: byCategory,
    observedBalance,
    projection,
  };
}

export async function getProjectionSeries(
  data: DataAccess,
  financialSpaceId: string,
  fromMonth: Month,
  months: number,
): Promise<{ month: Month; projectedBalance: number | null }[]> {
  const items: { month: Month; projectedBalance: number | null }[] = [];
  for (let offset = 0; offset < months; offset += 1) {
    const month = shiftMonth(fromMonth, offset);
    const projection = await getProjection(data, financialSpaceId, month);
    items.push({ month, projectedBalance: projection?.amountMinor ?? null });
  }
  return items;
}
