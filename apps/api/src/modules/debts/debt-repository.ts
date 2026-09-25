import type { Debt, DebtPayment, NewDebt, NewDebtPayment } from './debt.ts';

export interface DebtUpdate {
  financialSpaceId: string;
  debtId: string;
  expectedVersion: number;
  name: string;
  installmentCount: number;
  installmentAmountMinor: number;
  firstDueDate: string;
  archived: boolean;
}

export interface DebtRepository {
  listForSpace(financialSpaceId: string): Promise<Debt[]>;
  findInSpace(
    financialSpaceId: string,
    debtId: string,
    options?: { lock: boolean },
  ): Promise<Debt | null>;
  create(debt: NewDebt): Promise<Debt>;
  update(update: DebtUpdate): Promise<Debt | null>;
  listPayments(financialSpaceId: string, debtId?: string): Promise<DebtPayment[]>;
  recordPayment(payment: NewDebtPayment): Promise<DebtPayment>;
  deletePayment(
    financialSpaceId: string,
    debtId: string,
    paymentId: string,
    actorUserId: string,
  ): Promise<DebtPayment | null>;
}
