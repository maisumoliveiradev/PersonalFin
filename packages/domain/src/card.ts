import type { FinancialDate } from './financial-date.ts';
import { type Month, monthRange } from './month.ts';

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
