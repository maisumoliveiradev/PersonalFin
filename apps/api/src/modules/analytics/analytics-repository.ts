import type { FinancialDate } from '@personalfin/domain';

export interface CategoryExpenseRow {
  categoryId: string;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  amountMinor: number;
}

export interface TagExpenseRow {
  tagId: string;
  name: string;
  amountMinor: number;
}

export interface AnalyticsRange {
  financialSpaceId: string;
  start: FinancialDate;
  endExclusive: FinancialDate;
}

export interface AnalyticsRepository {
  realizedExpensesByCategory(range: AnalyticsRange): Promise<CategoryExpenseRow[]>;
  realizedExpensesByTag(range: AnalyticsRange): Promise<TagExpenseRow[]>;
}
