import type { FinancialDate } from './financial-date.ts';

export const NON_BUSINESS_DAY_RULES = ['keep', 'previous', 'next'] as const;

export type NonBusinessDayRule = (typeof NON_BUSINESS_DAY_RULES)[number];

export interface Holiday {
  date: FinancialDate;
  name: string;
}

const MS_PER_DAY = 86_400_000;
const NATIONAL_BLACK_CONSCIOUSNESS_DAY_SINCE = 2024;

function toDate(value: FinancialDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function fromDate(date: Date): FinancialDate {
  return date.toISOString().slice(0, 10);
}

function ymd(year: number, month: number, day: number): FinancialDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDays(date: FinancialDate, days: number): FinancialDate {
  return fromDate(new Date(toDate(date).getTime() + days * MS_PER_DAY));
}

export function easterSunday(year: number): FinancialDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(year, month, day);
}

export function brazilianNationalHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { date: ymd(year, 1, 1), name: 'Confraternização Universal' },
    { date: addDays(easterSunday(year), -2), name: 'Paixão de Cristo' },
    { date: ymd(year, 4, 21), name: 'Tiradentes' },
    { date: ymd(year, 5, 1), name: 'Dia do Trabalho' },
    { date: ymd(year, 9, 7), name: 'Independência do Brasil' },
    { date: ymd(year, 10, 12), name: 'Nossa Senhora Aparecida' },
    { date: ymd(year, 11, 2), name: 'Finados' },
    { date: ymd(year, 11, 15), name: 'Proclamação da República' },
    { date: ymd(year, 12, 25), name: 'Natal' },
  ];
  if (year >= NATIONAL_BLACK_CONSCIOUSNESS_DAY_SINCE) {
    holidays.push({
      date: ymd(year, 11, 20),
      name: 'Dia Nacional de Zumbi e da Consciência Negra',
    });
  }
  return holidays.sort((left, right) => left.date.localeCompare(right.date));
}

export function isWeekend(date: FinancialDate): boolean {
  const weekday = toDate(date).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function isBrazilianNationalHoliday(date: FinancialDate): boolean {
  const year = Number(date.slice(0, 4));
  return brazilianNationalHolidays(year).some((holiday) => holiday.date === date);
}

export function isBusinessDay(date: FinancialDate): boolean {
  return !isWeekend(date) && !isBrazilianNationalHoliday(date);
}

export function adjustToBusinessDay(date: FinancialDate, rule: NonBusinessDayRule): FinancialDate {
  if (rule === 'keep') {
    return date;
  }
  const step = rule === 'next' ? 1 : -1;
  let candidate = date;
  while (!isBusinessDay(candidate)) {
    candidate = addDays(candidate, step);
  }
  return candidate;
}
