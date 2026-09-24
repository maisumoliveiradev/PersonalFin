import { addDays, adjustToBusinessDay, type NonBusinessDayRule } from './business-days.ts';
import type { FinancialDate } from './financial-date.ts';
import { type Month, monthRange, shiftMonth } from './month.ts';

export const RECURRENCE_FREQUENCIES = ['monthly', 'weekly', 'yearly'] as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const RECURRENCE_HORIZON_MONTHS = 12;
export const MAX_MATERIALIZATION_MONTHS = 60;
const MAX_OCCURRENCES_PER_CALL = 5_000;

export interface RecurrenceSchedule {
  startDate: FinancialDate;
  endDate: FinancialDate | null;
  frequency: RecurrenceFrequency;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function ymd(year: number, month: number, day: number): FinancialDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function nthScheduledDate(schedule: RecurrenceSchedule, index: number): FinancialDate {
  const [startYear = 0, startMonth = 1, startDay = 1] = schedule.startDate.split('-').map(Number);
  if (schedule.frequency === 'weekly') {
    return addDays(schedule.startDate, index * 7);
  }
  const monthsToAdd = schedule.frequency === 'monthly' ? index : index * 12;
  const monthIndex = startMonth - 1 + monthsToAdd;
  const year = startYear + Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  return ymd(year, month, Math.min(startDay, lastDayOfMonth(year, month)));
}

export function scheduledDates(
  schedule: RecurrenceSchedule,
  through: FinancialDate,
): FinancialDate[] {
  const limit =
    schedule.endDate !== null && schedule.endDate < through ? schedule.endDate : through;
  const dates: FinancialDate[] = [];
  for (let index = 0; index < MAX_OCCURRENCES_PER_CALL; index += 1) {
    const date = nthScheduledDate(schedule, index);
    if (date > limit) {
      break;
    }
    dates.push(date);
  }
  return dates;
}

export interface Occurrence {
  occurrenceDate: FinancialDate;
  financialDate: FinancialDate;
}

export function occurrencesThrough(
  schedule: RecurrenceSchedule & { nonBusinessDayRule: NonBusinessDayRule },
  through: FinancialDate,
): Occurrence[] {
  return scheduledDates(schedule, through).map((occurrenceDate) => ({
    occurrenceDate,
    financialDate: adjustToBusinessDay(occurrenceDate, schedule.nonBusinessDayRule),
  }));
}

export function lastDayOf(month: Month): FinancialDate {
  return addDays(monthRange(month).endExclusive, -1);
}

export function defaultMaterializationEnd(currentMonth: Month): FinancialDate {
  return lastDayOf(shiftMonth(currentMonth, RECURRENCE_HORIZON_MONTHS));
}

export function maxMaterializationEnd(currentMonth: Month): FinancialDate {
  return lastDayOf(shiftMonth(currentMonth, MAX_MATERIALIZATION_MONTHS));
}
