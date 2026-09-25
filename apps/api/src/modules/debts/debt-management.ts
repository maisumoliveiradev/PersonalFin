import { randomUUID } from 'node:crypto';

import {
  DEFAULT_CURRENCY,
  type DebtPaymentKind,
  type FinancialDate,
  type PrepaymentMode,
  type PrepaymentSimulation,
  simulatePrepayment,
  summarizeDebt,
} from '@personalfin/domain';

import type { DataAccess, Repositories } from '../../database/data-access.ts';
import { diffFields } from '../audit/audit-event.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import type { Debt, DebtPayment } from './debt.ts';
import {
  DebtNotFoundError,
  DebtOverpaymentError,
  DebtPaymentNotFoundError,
  InvalidDebtPlanError,
} from './debt-errors.ts';

export interface DebtDetail {
  debt: Debt;
  payments: DebtPayment[];
}

export function defaultInstallmentAmount(originalAmountMinor: number, count: number): number {
  return Math.max(Math.floor(originalAmountMinor / count), 1);
}

function assertPlan(originalAmountMinor: number, installmentAmountMinor: number): void {
  if (installmentAmountMinor > originalAmountMinor) {
    throw new InvalidDebtPlanError('The installment cannot exceed the original amount');
  }
}

async function requireDebt(
  repositories: Repositories,
  financialSpaceId: string,
  debtId: string,
): Promise<Debt> {
  const debt = await repositories.debts.findInSpace(financialSpaceId, debtId, { lock: true });
  if (debt === null) {
    throw new DebtNotFoundError();
  }
  return debt;
}

export interface CreateDebtInput {
  financialSpaceId: string;
  actorUserId: string;
  name: string;
  originalAmountMinor: number;
  installmentCount: number;
  installmentAmountMinor?: number;
  firstDueDate: FinancialDate;
}

export async function createDebt(data: DataAccess, input: CreateDebtInput): Promise<DebtDetail> {
  const installmentAmountMinor =
    input.installmentAmountMinor ??
    defaultInstallmentAmount(input.originalAmountMinor, input.installmentCount);
  assertPlan(input.originalAmountMinor, installmentAmountMinor);
  return data.transaction(async ({ debts, audit }) => {
    const debt = await debts.create({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      name: input.name,
      originalAmountMinor: input.originalAmountMinor,
      currency: DEFAULT_CURRENCY,
      installmentCount: input.installmentCount,
      installmentAmountMinor,
      firstDueDate: input.firstDueDate,
      createdByUserId: input.actorUserId,
    });
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'debt',
      entityId: debt.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: {
        name: { before: null, after: debt.name },
        originalAmountMinor: { before: null, after: debt.originalAmountMinor },
        installmentCount: { before: null, after: debt.installmentCount },
        installmentAmountMinor: { before: null, after: debt.installmentAmountMinor },
        firstDueDate: { before: null, after: debt.firstDueDate },
      },
    });
    return { debt, payments: [] };
  });
}

export interface UpdateDebtInput {
  financialSpaceId: string;
  debtId: string;
  actorUserId: string;
  expectedVersion: number;
  name?: string;
  installmentCount?: number;
  installmentAmountMinor?: number;
  firstDueDate?: FinancialDate;
  archived?: boolean;
}

export async function updateDebt(data: DataAccess, input: UpdateDebtInput): Promise<DebtDetail> {
  return data.transaction(async (repositories) => {
    const current = await requireDebt(repositories, input.financialSpaceId, input.debtId);
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    const payments = await repositories.debts.listPayments(input.financialSpaceId, current.id);
    const before = {
      name: current.name,
      installmentCount: current.installmentCount,
      installmentAmountMinor: current.installmentAmountMinor,
      firstDueDate: current.firstDueDate,
      archived: current.archivedAt !== null,
    };
    const after = {
      name: input.name ?? before.name,
      installmentCount: input.installmentCount ?? before.installmentCount,
      installmentAmountMinor: input.installmentAmountMinor ?? before.installmentAmountMinor,
      firstDueDate: input.firstDueDate ?? before.firstDueDate,
      archived: input.archived ?? before.archived,
    };
    assertPlan(current.originalAmountMinor, after.installmentAmountMinor);
    const paidInstallments = payments.filter((payment) => payment.kind === 'installment').length;
    if (after.installmentCount < paidInstallments) {
      throw new InvalidDebtPlanError(
        'The installment count cannot be lower than the installments already paid',
      );
    }
    const changes = diffFields(before, after);
    if (Object.keys(changes).length === 0) {
      return { debt: current, payments };
    }
    const updated = await repositories.debts.update({
      financialSpaceId: input.financialSpaceId,
      debtId: current.id,
      expectedVersion: input.expectedVersion,
      ...after,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'debt',
      entityId: current.id,
      action: 'update',
      actorUserId: input.actorUserId,
      changes,
    });
    return { debt: updated, payments };
  });
}

export interface RecordDebtPaymentInput {
  financialSpaceId: string;
  debtId: string;
  actorUserId: string;
  kind: DebtPaymentKind;
  amountMinor: number;
  paidOn: FinancialDate;
}

export async function recordDebtPaymentIn(
  repositories: Repositories,
  input: RecordDebtPaymentInput,
): Promise<DebtDetail> {
  const debt = await requireDebt(repositories, input.financialSpaceId, input.debtId);
  const payments = await repositories.debts.listPayments(input.financialSpaceId, debt.id);
  const { outstandingMinor } = summarizeDebt(debt, payments);
  if (input.amountMinor > outstandingMinor) {
    throw new DebtOverpaymentError();
  }
  const payment = await repositories.debts.recordPayment({
    id: randomUUID(),
    debtId: debt.id,
    financialSpaceId: input.financialSpaceId,
    kind: input.kind,
    amountMinor: input.amountMinor,
    paidOn: input.paidOn,
    recordedByUserId: input.actorUserId,
  });
  await repositories.audit.record({
    financialSpaceId: input.financialSpaceId,
    entityType: 'debt_payment',
    entityId: payment.id,
    action: 'create',
    actorUserId: input.actorUserId,
    changes: {
      debtId: { before: null, after: debt.id },
      kind: { before: null, after: payment.kind },
      amountMinor: { before: null, after: payment.amountMinor },
      paidOn: { before: null, after: payment.paidOn },
    },
  });
  return { debt, payments: [...payments, payment] };
}

export function recordDebtPayment(
  data: DataAccess,
  input: RecordDebtPaymentInput,
): Promise<DebtDetail> {
  return data.transaction((repositories) => recordDebtPaymentIn(repositories, input));
}

function simulate(
  debt: Debt,
  payments: readonly DebtPayment[],
  amountMinor: number,
  mode: PrepaymentMode,
): PrepaymentSimulation {
  if (amountMinor > summarizeDebt(debt, payments).outstandingMinor) {
    throw new DebtOverpaymentError();
  }
  return simulatePrepayment(debt, payments, amountMinor, mode);
}

export async function simulateDebtPrepayment(
  data: DataAccess,
  input: { financialSpaceId: string; debtId: string; amountMinor: number; mode: PrepaymentMode },
): Promise<PrepaymentSimulation> {
  const debt = await data.repositories.debts.findInSpace(input.financialSpaceId, input.debtId);
  if (debt === null) {
    throw new DebtNotFoundError();
  }
  const payments = await data.repositories.debts.listPayments(input.financialSpaceId, debt.id);
  return simulate(debt, payments, input.amountMinor, input.mode);
}

export interface ConfirmPrepaymentInput {
  financialSpaceId: string;
  debtId: string;
  actorUserId: string;
  expectedVersion: number;
  amountMinor: number;
  mode: PrepaymentMode;
  paidOn: FinancialDate;
}

export async function confirmDebtPrepayment(
  data: DataAccess,
  input: ConfirmPrepaymentInput,
): Promise<DebtDetail> {
  return data.transaction(async (repositories) => {
    const debt = await requireDebt(repositories, input.financialSpaceId, input.debtId);
    if (debt.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    const payments = await repositories.debts.listPayments(input.financialSpaceId, debt.id);
    const simulation = simulate(debt, payments, input.amountMinor, input.mode);
    const { payments: withPrepayment } = await recordDebtPaymentIn(repositories, {
      financialSpaceId: input.financialSpaceId,
      debtId: debt.id,
      actorUserId: input.actorUserId,
      kind: 'prepayment',
      amountMinor: input.amountMinor,
      paidOn: input.paidOn,
    });
    const changes = diffFields(
      {
        installmentCount: debt.installmentCount,
        installmentAmountMinor: debt.installmentAmountMinor,
        prepaymentMode: null,
      },
      { ...simulation.plan, prepaymentMode: input.mode },
    );
    const updated = await repositories.debts.update({
      financialSpaceId: input.financialSpaceId,
      debtId: debt.id,
      expectedVersion: input.expectedVersion,
      name: debt.name,
      firstDueDate: debt.firstDueDate,
      archived: debt.archivedAt !== null,
      ...simulation.plan,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'debt',
      entityId: debt.id,
      action: 'update',
      actorUserId: input.actorUserId,
      changes,
    });
    return { debt: updated, payments: withPrepayment };
  });
}

export async function removeDebtPayment(
  data: DataAccess,
  input: { financialSpaceId: string; debtId: string; paymentId: string; actorUserId: string },
): Promise<DebtDetail> {
  return data.transaction(async (repositories) => {
    const debt = await requireDebt(repositories, input.financialSpaceId, input.debtId);
    const removed = await repositories.debts.deletePayment(
      input.financialSpaceId,
      debt.id,
      input.paymentId,
      input.actorUserId,
    );
    if (removed === null) {
      throw new DebtPaymentNotFoundError();
    }
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'debt_payment',
      entityId: removed.id,
      action: 'delete',
      actorUserId: input.actorUserId,
      changes: { amountMinor: { before: removed.amountMinor, after: null } },
    });
    return {
      debt,
      payments: await repositories.debts.listPayments(input.financialSpaceId, debt.id),
    };
  });
}
