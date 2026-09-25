import {
  addDays,
  DEFAULT_REMINDER_OFFSETS,
  daysBetween,
  type FinancialDate,
  monthOf,
  monthRange,
  REMINDER_KINDS,
  type ReminderKind,
  type ReminderStage,
  reminderStage,
  reminderWindowDays,
  summarizeDebt,
  type TransactionType,
} from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { outstandingMinor } from '../cards/card-invoice.ts';
import { getProjection } from '../dashboard/get-dashboard.ts';
import { dismissalKey, type ReminderSettings } from './reminder-repository.ts';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  offsets: [...DEFAULT_REMINDER_OFFSETS],
  kinds: [...REMINDER_KINDS],
};

const OVERDUE_LOOKBACK_DAYS = 90;
const TRANSACTION_LIMIT = 200;

export interface ReminderItem {
  key: string;
  kind: ReminderKind;
  stage: ReminderStage;
  dueDate: FinancialDate;
  daysUntilDue: number;
  description: string;
  amountMinor: number;
  transactionType: TransactionType | null;
}

interface Candidate extends Omit<ReminderItem, 'stage' | 'daysUntilDue'> {
  fixedStage?: ReminderStage;
}

async function candidates(
  data: DataAccess,
  financialSpaceId: string,
  kinds: ReadonlySet<ReminderKind>,
  today: FinancialDate,
  windowDays: number,
): Promise<Candidate[]> {
  const range = {
    start: addDays(today, -OVERDUE_LOOKBACK_DAYS),
    endExclusive: addDays(today, windowDays + 1),
  };
  const inRange = (date: FinancialDate) => date >= range.start && date < range.endExclusive;
  const { repositories } = data;
  const [transactions, invoices, debts, payments, projection] = await Promise.all([
    kinds.has('transactions')
      ? repositories.transactions.list({
          financialSpaceId,
          state: 'active',
          status: 'pending',
          excludeCardPurchases: true,
          range,
          limit: TRANSACTION_LIMIT,
          cursor: null,
        })
      : null,
    kinds.has('invoices') ? repositories.cardInvoices.listOpenDue(financialSpaceId, range) : [],
    kinds.has('debts') ? repositories.debts.listForSpace(financialSpaceId) : [],
    kinds.has('debts') ? repositories.debts.listPayments(financialSpaceId) : [],
    kinds.has('projection') ? getProjection(data, financialSpaceId, monthOf(today)) : null,
  ]);
  const result: Candidate[] = [];
  for (const transaction of transactions?.items ?? []) {
    result.push({
      key: `transaction:${transaction.id}`,
      kind: 'transactions',
      dueDate: transaction.financialDate,
      description: transaction.description,
      amountMinor: transaction.amountMinor,
      transactionType: transaction.type,
    });
  }
  for (const invoice of invoices) {
    const amountMinor = outstandingMinor(invoice);
    if (amountMinor > 0) {
      result.push({
        key: `invoice:${invoice.cardId}:${invoice.referenceMonth}`,
        kind: 'invoices',
        dueDate: invoice.dueDate,
        description: invoice.cardName,
        amountMinor,
        transactionType: 'expense',
      });
    }
  }
  for (const debt of debts) {
    const summary = summarizeDebt(
      debt,
      payments.filter((payment) => payment.debtId === debt.id),
    );
    if (debt.archivedAt !== null || summary.nextDueDate === null || !inRange(summary.nextDueDate)) {
      continue;
    }
    result.push({
      key: `debt:${debt.id}:${summary.nextDueDate}`,
      kind: 'debts',
      dueDate: summary.nextDueDate,
      description: debt.name,
      amountMinor:
        summary.remainingInstallments === 1
          ? (summary.lastInstallmentMinor ?? debt.installmentAmountMinor)
          : debt.installmentAmountMinor,
      transactionType: 'expense',
    });
  }
  if (projection !== null && projection.amountMinor < 0) {
    const month = monthOf(today);
    result.push({
      key: `projection:${month}`,
      kind: 'projection',
      dueDate: addDays(monthRange(month).endExclusive, -1),
      description: month,
      amountMinor: projection.amountMinor,
      transactionType: null,
      fixedStage: 'before-0',
    });
  }
  return result;
}

export async function getReminders(
  data: DataAccess,
  userId: string,
  financialSpaceId: string,
  today: FinancialDate,
): Promise<ReminderItem[]> {
  const settings =
    (await data.repositories.reminders.findSettings(userId, financialSpaceId)) ??
    DEFAULT_REMINDER_SETTINGS;
  const [found, dismissed] = await Promise.all([
    candidates(
      data,
      financialSpaceId,
      new Set(settings.kinds),
      today,
      reminderWindowDays(settings.offsets),
    ),
    data.repositories.reminders.listDismissals(userId, financialSpaceId),
  ]);
  const items: ReminderItem[] = [];
  for (const { fixedStage, ...candidate } of found) {
    const daysUntilDue = daysBetween(today, candidate.dueDate);
    const stage = fixedStage ?? reminderStage(daysUntilDue, settings.offsets);
    if (stage === null || dismissed.has(dismissalKey(candidate.key, stage))) {
      continue;
    }
    items.push({ ...candidate, stage, daysUntilDue });
  }
  return items.sort(
    (left, right) =>
      Number(right.stage === 'overdue') - Number(left.stage === 'overdue') ||
      left.dueDate.localeCompare(right.dueDate) ||
      left.key.localeCompare(right.key),
  );
}
