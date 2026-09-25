import type { CurrencyCode, DebtPaymentKind, FinancialDate } from '@personalfin/domain';

export interface Debt {
  id: string;
  financialSpaceId: string;
  name: string;
  originalAmountMinor: number;
  currency: CurrencyCode;
  installmentCount: number;
  installmentAmountMinor: number;
  firstDueDate: FinancialDate;
  archivedAt: Date | null;
  createdAt: Date;
  version: number;
}

export type NewDebt = Omit<Debt, 'archivedAt' | 'createdAt' | 'version'> & {
  createdByUserId: string;
};

export interface DebtPayment {
  id: string;
  debtId: string;
  financialSpaceId: string;
  kind: DebtPaymentKind;
  amountMinor: number;
  paidOn: FinancialDate;
  recordedAt: Date;
}

export type NewDebtPayment = Omit<DebtPayment, 'recordedAt'> & { recordedByUserId: string };

export function normalizeDebtName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
