import { adjustToBusinessDay } from './business-days.ts';
import type { FinancialDate } from './financial-date.ts';
import { type Month, monthOf, monthRange, shiftMonth } from './month.ts';

export const CARD_NAME_MAX_LENGTH = 60;
export const MIN_CARD_DAY = 1;
export const MAX_CARD_DAY = 31;

export function isValidCardDay(day: number): boolean {
  return Number.isInteger(day) && day >= MIN_CARD_DAY && day <= MAX_CARD_DAY;
}

export function cardDayInMonth(month: Month, day: number): FinancialDate {
  const { start, endExclusive } = monthRange(month);
  const lastDay = new Date(`${endExclusive}T00:00:00Z`);
  lastDay.setUTCDate(0);
  const clamped = Math.min(day, lastDay.getUTCDate());
  return `${start.slice(0, 8)}${String(clamped).padStart(2, '0')}`;
}

export interface CardLimitEntry {
  amountMinor: number;
  effectiveFrom: FinancialDate;
  recordedAt: string;
}

export function currentCardLimit<Entry extends CardLimitEntry>(
  limits: readonly Entry[],
  on: FinancialDate,
): Entry | null {
  let current: Entry | null = null;
  for (const entry of limits) {
    if (entry.effectiveFrom > on) {
      continue;
    }
    if (
      current === null ||
      entry.effectiveFrom > current.effectiveFrom ||
      (entry.effectiveFrom === current.effectiveFrom && entry.recordedAt > current.recordedAt)
    ) {
      current = entry;
    }
  }
  return current;
}

export interface CardSchedule {
  closingDay: number;
  dueDay: number;
}

export interface InvoiceDates {
  closingDate: FinancialDate;
  dueDate: FinancialDate;
}

export function defaultInvoiceDates(referenceMonth: Month, schedule: CardSchedule): InvoiceDates {
  const closingMonth =
    schedule.dueDay <= schedule.closingDay ? shiftMonth(referenceMonth, -1) : referenceMonth;
  return {
    closingDate: cardDayInMonth(closingMonth, schedule.closingDay),
    dueDate: adjustToBusinessDay(cardDayInMonth(referenceMonth, schedule.dueDay), 'next'),
  };
}

export function candidateInvoiceMonths(purchaseDate: FinancialDate): Month[] {
  const month = monthOf(purchaseDate);
  return [-1, 0, 1, 2].map((delta) => shiftMonth(month, delta));
}

export function defaultInvoiceMonth(purchaseDate: FinancialDate, schedule: CardSchedule): Month {
  const candidates = candidateInvoiceMonths(purchaseDate);
  const match = candidates.find(
    (month) => defaultInvoiceDates(month, schedule).closingDate > purchaseDate,
  );
  if (match === undefined) {
    throw new RangeError('No invoice closes after the purchase date');
  }
  return match;
}
