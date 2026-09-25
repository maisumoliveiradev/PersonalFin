import { installmentDate } from './card.ts';
import type { FinancialDate } from './financial-date.ts';

export const DEBT_NAME_MAX_LENGTH = 60;
export const MAX_DEBT_INSTALLMENTS = 600;
export const DEBT_PAYMENT_KINDS = ['installment', 'prepayment'] as const;

export type DebtPaymentKind = (typeof DEBT_PAYMENT_KINDS)[number];

export interface DebtPlan {
  originalAmountMinor: number;
  installmentCount: number;
  installmentAmountMinor: number;
  firstDueDate: FinancialDate;
}

export interface DebtPaymentFacts {
  kind: DebtPaymentKind;
  amountMinor: number;
}

export interface DebtSummary {
  paidMinor: number;
  outstandingMinor: number;
  paidInstallments: number;
  remainingInstallments: number;
  lastInstallmentMinor: number | null;
  nextDueDate: FinancialDate | null;
  progressTenths: number;
  settled: boolean;
}

export function isValidDebtInstallmentCount(count: number): boolean {
  return Number.isInteger(count) && count >= 1 && count <= MAX_DEBT_INSTALLMENTS;
}

export function summarizeDebt(plan: DebtPlan, payments: readonly DebtPaymentFacts[]): DebtSummary {
  const paidMinor = payments.reduce((total, payment) => total + payment.amountMinor, 0);
  const outstandingMinor = Math.max(plan.originalAmountMinor - paidMinor, 0);
  const paidInstallments = payments.filter((payment) => payment.kind === 'installment').length;
  const settled = outstandingMinor === 0;
  const remainingInstallments = settled
    ? 0
    : Math.max(
        Math.min(
          plan.installmentCount - paidInstallments,
          Math.ceil(outstandingMinor / plan.installmentAmountMinor),
        ),
        1,
      );
  const lastInstallmentMinor = settled
    ? null
    : outstandingMinor - (remainingInstallments - 1) * plan.installmentAmountMinor;
  return {
    paidMinor,
    outstandingMinor,
    paidInstallments,
    remainingInstallments,
    lastInstallmentMinor,
    nextDueDate: settled ? null : installmentDate(plan.firstDueDate, paidInstallments),
    progressTenths: Math.floor(
      (Math.min(paidMinor, plan.originalAmountMinor) * 1000) / plan.originalAmountMinor,
    ),
    settled,
  };
}
