import type { FinancialDate } from './financial-date.ts';

export type Month = string;

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const MONTH_NAMES = {
  'pt-BR': [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
} as const;

export type MonthLocale = keyof typeof MONTH_NAMES;

function parts(month: Month): { year: number; monthNumber: number } {
  const match = MONTH_PATTERN.exec(month);
  if (match === null) {
    throw new RangeError(`Invalid month: ${month}`);
  }
  return { year: Number(match[1]), monthNumber: Number(match[2]) };
}

function toMonth(year: number, monthNumber: number): Month {
  return `${String(year).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}`;
}

export function isValidMonth(value: string): value is Month {
  const match = MONTH_PATTERN.exec(value);
  return match !== null && Number(match[1]) >= 1900 && Number(match[1]) <= 2999;
}

export function monthOf(date: FinancialDate): Month {
  return date.slice(0, 7);
}

export function shiftMonth(month: Month, delta: number): Month {
  const { year, monthNumber } = parts(month);
  const index = year * 12 + (monthNumber - 1) + delta;
  return toMonth(Math.floor(index / 12), (index % 12) + 1);
}

export function monthRange(month: Month): { start: FinancialDate; endExclusive: FinancialDate } {
  return { start: `${month}-01`, endExclusive: `${shiftMonth(month, 1)}-01` };
}

export function formatMonthLabel(month: Month, locale: MonthLocale): string {
  const { year, monthNumber } = parts(month);
  const name = MONTH_NAMES[locale][monthNumber - 1];
  return locale === 'pt-BR' ? `${name} de ${year}` : `${name} ${year}`;
}
