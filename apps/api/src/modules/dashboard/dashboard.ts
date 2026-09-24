import type { CurrencyCode, FinancialDate, Month } from '@personalfin/domain';

export interface CategoryTotal {
  categoryId: string;
  name: string;
  amountMinor: number;
}

export interface ObservedBalance {
  amountMinor: number;
  observedOn: FinancialDate;
}

export interface MonthTotals {
  realizedIncome: number;
  realizedExpenses: number;
  forecastIncome: number;
  forecastExpenses: number;
}

export interface MonthlyDashboard extends MonthTotals {
  month: Month;
  currency: CurrencyCode;
  realizedNet: number;
  realizedExpensesByCategory: CategoryTotal[];
  observedBalance: ObservedBalance | null;
}

export function toSafeAmount(value: string | number | null): number {
  const amount = Number(value ?? 0);
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError('Aggregated amount exceeds the safe integer range');
  }
  return amount;
}
