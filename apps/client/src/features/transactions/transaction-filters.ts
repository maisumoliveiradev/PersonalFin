import type { TransactionStatus, TransactionType } from '@personalfin/api-contract';
import {
  financialDateFromLocalClock,
  isValidMonth,
  type Month,
  monthOf,
} from '@personalfin/domain';

export interface TransactionFilters {
  month: Month;
  type?: TransactionType;
  status?: TransactionStatus;
  categoryId?: string;
  tagId?: string;
  q?: string;
}

export function currentMonth(): Month {
  return monthOf(financialDateFromLocalClock(new Date()));
}

export function monthFromParam(value: string | undefined): Month {
  return value !== undefined && isValidMonth(value) ? value : currentMonth();
}

export function hasOptionalFilters(filters: TransactionFilters): boolean {
  return (
    filters.type !== undefined ||
    filters.status !== undefined ||
    filters.categoryId !== undefined ||
    filters.tagId !== undefined ||
    filters.q !== undefined
  );
}
