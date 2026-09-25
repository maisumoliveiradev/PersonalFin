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

export interface FlowTotals {
  income: number;
  expenses: number;
}

export interface ProjectionComponents {
  afterObservation: FlowTotals;
  pendingUpToObservation: FlowTotals;
  openInvoices: number;
  invoicePayments: number;
}

export interface Projection extends ProjectionComponents {
  amountMinor: number;
  base: ObservedBalance;
}

export interface MonthlyDashboard extends MonthTotals {
  month: Month;
  currency: CurrencyCode;
  realizedNet: number;
  realizedExpensesByCategory: CategoryTotal[];
  observedBalance: ObservedBalance | null;
  projection: Projection | null;
}

export function computeProjection(
  base: ObservedBalance,
  components: ProjectionComponents,
): Projection {
  const net = (flow: FlowTotals) => flow.income - flow.expenses;
  return {
    base,
    ...components,
    amountMinor:
      base.amountMinor +
      net(components.afterObservation) +
      net(components.pendingUpToObservation) -
      components.openInvoices -
      components.invoicePayments,
  };
}

export function toSafeAmount(value: string | number | null): number {
  const amount = Number(value ?? 0);
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError('Aggregated amount exceeds the safe integer range');
  }
  return amount;
}
