import {
  type Change,
  compareAmounts,
  type Month,
  monthRange,
  shiftMonth,
} from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import type { ObservedBalance } from '../dashboard/dashboard.ts';

export interface MetricSet {
  realizedIncome: number;
  realizedExpenses: number;
  realizedNet: number;
  forecastIncome: number;
  forecastExpenses: number;
}

export interface EvolutionItem {
  month: Month;
  realizedIncome: number;
  realizedExpenses: number;
  realizedNet: number;
  observedBalance: ObservedBalance | null;
}

async function metricSet(data: DataAccess, financialSpaceId: string, month: Month) {
  const totals = await data.repositories.dashboard.monthTotals({
    financialSpaceId,
    ...monthRange(month),
  });
  return { ...totals, realizedNet: totals.realizedIncome - totals.realizedExpenses };
}

export async function getEvolution(
  data: DataAccess,
  financialSpaceId: string,
  fromMonth: Month,
  months: number,
): Promise<EvolutionItem[]> {
  return Promise.all(
    Array.from({ length: months }, async (_, index) => {
      const month = shiftMonth(fromMonth, index);
      const [totals, observedBalance] = await Promise.all([
        metricSet(data, financialSpaceId, month),
        data.repositories.dashboard.observedBalanceBefore(
          financialSpaceId,
          monthRange(month).endExclusive,
        ),
      ]);
      return {
        month,
        realizedIncome: totals.realizedIncome,
        realizedExpenses: totals.realizedExpenses,
        realizedNet: totals.realizedNet,
        observedBalance,
      };
    }),
  );
}

const METRICS = [
  'realizedIncome',
  'realizedExpenses',
  'realizedNet',
  'forecastIncome',
  'forecastExpenses',
] as const;

export type MetricChanges = Record<(typeof METRICS)[number], Change>;

function changes(current: MetricSet, base: MetricSet): MetricChanges {
  const result = {} as MetricChanges;
  for (const metric of METRICS) {
    result[metric] = compareAmounts(current[metric], base[metric]);
  }
  return result;
}

export async function getComparison(data: DataAccess, financialSpaceId: string, month: Month) {
  const previousMonth = shiftMonth(month, -1);
  const previousYear = shiftMonth(month, -12);
  const [current, lastMonth, lastYear] = await Promise.all([
    metricSet(data, financialSpaceId, month),
    metricSet(data, financialSpaceId, previousMonth),
    metricSet(data, financialSpaceId, previousYear),
  ]);
  return {
    month,
    current,
    previousMonth: {
      month: previousMonth,
      values: lastMonth,
      changes: changes(current, lastMonth),
    },
    previousYear: { month: previousYear, values: lastYear, changes: changes(current, lastYear) },
  };
}
