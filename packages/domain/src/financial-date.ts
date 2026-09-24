export type FinancialDate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_PATTERNS = {
  'pt-BR': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  en: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
} as const;

export type DateLocale = keyof typeof DISPLAY_DATE_PATTERNS;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toFinancialDate(year: number, month: number, day: number): FinancialDate | null {
  if (year < 1900 || year > 2999 || month < 1 || month > 12) {
    return null;
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isValidFinancialDate(value: string): value is FinancialDate {
  const match = ISO_DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  return toFinancialDate(Number(match[1]), Number(match[2]), Number(match[3])) === value;
}

export function financialDateFromLocalClock(now: Date): FinancialDate {
  const date = toFinancialDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  if (date === null) {
    throw new RangeError('Clock date is outside the supported range');
  }
  return date;
}

export function parseDisplayDate(input: string, locale: DateLocale): FinancialDate | null {
  const match = DISPLAY_DATE_PATTERNS[locale].exec(input.trim());
  if (match === null) {
    return null;
  }
  const [first, second, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return locale === 'pt-BR'
    ? toFinancialDate(year, second, first)
    : toFinancialDate(year, first, second);
}

export function formatDisplayDate(date: FinancialDate, locale: DateLocale): string {
  const match = ISO_DATE_PATTERN.exec(date);
  if (match === null) {
    throw new RangeError(`Invalid financial date: ${date}`);
  }
  const [, year, month, day] = match;
  return locale === 'pt-BR' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}
