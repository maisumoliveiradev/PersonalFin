import type { FinancialDate } from './financial-date.ts';

export const BALANCE_REMINDER_FREQUENCIES = [
  'app_start',
  'daily',
  'every_n_days',
  'never',
] as const;

export type BalanceReminderFrequency = (typeof BALANCE_REMINDER_FREQUENCIES)[number];

export const MIN_REMINDER_INTERVAL_DAYS = 1;
export const MAX_REMINDER_INTERVAL_DAYS = 90;

export interface BalanceReminderSetting {
  frequency: BalanceReminderFrequency;
  intervalDays: number | null;
}

export const DEFAULT_BALANCE_REMINDER: BalanceReminderSetting = {
  frequency: 'every_n_days',
  intervalDays: 7,
};

export function isValidBalanceReminder(setting: BalanceReminderSetting): boolean {
  if (setting.frequency !== 'every_n_days') {
    return setting.intervalDays === null;
  }
  return (
    setting.intervalDays !== null &&
    Number.isInteger(setting.intervalDays) &&
    setting.intervalDays >= MIN_REMINDER_INTERVAL_DAYS &&
    setting.intervalDays <= MAX_REMINDER_INTERVAL_DAYS
  );
}

function dayNumber(date: FinancialDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Math.floor(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000);
}

export function daysBetween(from: FinancialDate, to: FinancialDate): number {
  return dayNumber(to) - dayNumber(from);
}

export interface BalanceReminderState {
  setting: BalanceReminderSetting;
  lastObservedOn: FinancialDate | null;
  today: FinancialDate;
}

export function isBalanceUpdateDue({
  setting,
  lastObservedOn,
  today,
}: BalanceReminderState): boolean {
  if (setting.frequency === 'never') {
    return false;
  }
  if (lastObservedOn === null) {
    return true;
  }
  const elapsed = daysBetween(lastObservedOn, today);
  switch (setting.frequency) {
    case 'app_start':
      return elapsed > 0;
    case 'daily':
      return elapsed >= 1;
    case 'every_n_days':
      return elapsed >= (setting.intervalDays ?? DEFAULT_BALANCE_REMINDER.intervalDays ?? 7);
  }
}
