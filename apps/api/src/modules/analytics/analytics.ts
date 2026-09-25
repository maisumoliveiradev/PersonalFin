import {
  type Change,
  compareAmounts,
  type Month,
  monthRange,
  shareTenths,
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

export interface BreakdownItem {
  id: string;
  name: string;
  amountMinor: number;
  shareTenths: number | null;
  previousAmountMinor: number;
}

export interface CategoryBreakdownItem extends BreakdownItem {
  subcategories: { id: string | null; name: string | null; amountMinor: number }[];
}

function rank<Item extends BreakdownItem>(items: Item[]): Item[] {
  return items.sort(
    (left, right) =>
      right.amountMinor - left.amountMinor ||
      right.previousAmountMinor - left.previousAmountMinor ||
      left.name.localeCompare(right.name),
  );
}

export async function getBreakdown(
  data: DataAccess,
  financialSpaceId: string,
  fromMonth: Month,
  months: number,
) {
  const current = {
    financialSpaceId,
    start: monthRange(fromMonth).start,
    endExclusive: monthRange(shiftMonth(fromMonth, months)).start,
  };
  const previous = {
    financialSpaceId,
    start: monthRange(shiftMonth(fromMonth, -months)).start,
    endExclusive: current.start,
  };
  const { analytics } = data.repositories;
  const [categoryRows, previousCategoryRows, tagRows, previousTagRows] = await Promise.all([
    analytics.realizedExpensesByCategory(current),
    analytics.realizedExpensesByCategory(previous),
    analytics.realizedExpensesByTag(current),
    analytics.realizedExpensesByTag(previous),
  ]);
  const sum = (rows: readonly { amountMinor: number }[]) =>
    rows.reduce((total, row) => total + row.amountMinor, 0);
  const totalMinor = sum(categoryRows);

  const categories = new Map<string, CategoryBreakdownItem>();
  const categoryOf = (id: string, name: string) => {
    const existing = categories.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const created: CategoryBreakdownItem = {
      id,
      name,
      amountMinor: 0,
      shareTenths: null,
      previousAmountMinor: 0,
      subcategories: [],
    };
    categories.set(id, created);
    return created;
  };
  for (const row of categoryRows) {
    const category = categoryOf(row.categoryId, row.categoryName);
    category.amountMinor += row.amountMinor;
    category.subcategories.push({
      id: row.subcategoryId,
      name: row.subcategoryName,
      amountMinor: row.amountMinor,
    });
  }
  for (const row of previousCategoryRows) {
    categoryOf(row.categoryId, row.categoryName).previousAmountMinor += row.amountMinor;
  }
  for (const category of categories.values()) {
    category.shareTenths = shareTenths(category.amountMinor, totalMinor);
    category.subcategories.sort((left, right) => right.amountMinor - left.amountMinor);
  }

  const tags = new Map<string, BreakdownItem>();
  const tagOf = (id: string, name: string) => {
    const existing = tags.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const created: BreakdownItem = {
      id,
      name,
      amountMinor: 0,
      shareTenths: null,
      previousAmountMinor: 0,
    };
    tags.set(id, created);
    return created;
  };
  for (const row of tagRows) {
    tagOf(row.tagId, row.name).amountMinor += row.amountMinor;
  }
  for (const row of previousTagRows) {
    tagOf(row.tagId, row.name).previousAmountMinor += row.amountMinor;
  }
  for (const tag of tags.values()) {
    tag.shareTenths = shareTenths(tag.amountMinor, totalMinor);
  }

  return {
    fromMonth,
    throughMonth: shiftMonth(fromMonth, months - 1),
    previousFromMonth: shiftMonth(fromMonth, -months),
    totalMinor,
    previousTotalMinor: sum(previousCategoryRows),
    categories: rank([...categories.values()]),
    tags: rank([...tags.values()]),
  };
}
