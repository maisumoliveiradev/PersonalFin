import { type FinancialDate, isValidFinancialDate } from './financial-date.ts';
import { MAX_AMOUNT_MINOR } from './money.ts';

export const IMPORT_DATE_FORMATS = ['DMY', 'YMD'] as const;
export const IMPORT_DECIMAL_SEPARATORS = [',', '.'] as const;

export type ImportDateFormat = (typeof IMPORT_DATE_FORMATS)[number];
export type ImportDecimalSeparator = (typeof IMPORT_DECIMAL_SEPARATORS)[number];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_FIRST = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
const YEAR_FIRST = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/;

function pad(value: string): string {
  return value.padStart(2, '0');
}

export function parseImportDate(text: string, format: ImportDateFormat): FinancialDate | null {
  const value = text.trim();
  const iso = ISO_DATE.exec(value);
  if (iso !== null) {
    return isValidFinancialDate(value) ? value : null;
  }
  const match = (format === 'DMY' ? DAY_FIRST : YEAR_FIRST).exec(value);
  if (match === null) {
    return null;
  }
  const [year, month, day] =
    format === 'DMY' ? [match[3], match[2], match[1]] : [match[1], match[2], match[3]];
  const date = `${year}-${pad(month ?? '')}-${pad(day ?? '')}`;
  return isValidFinancialDate(date) ? date : null;
}

export type ImportAmountError = 'empty' | 'invalid' | 'too_many_decimals' | 'zero' | 'too_large';

export type ImportAmountResult =
  | { ok: true; amountMinor: number; negative: boolean }
  | { ok: false; error: ImportAmountError };

export function parseImportAmount(
  text: string,
  decimalSeparator: ImportDecimalSeparator,
): ImportAmountResult {
  let value = text.replace(/\s| /g, '').replace(/^R\$/i, '').replace(/R\$/i, '');
  if (value === '') {
    return { ok: false, error: 'empty' };
  }
  let negative = false;
  if (/^\(.*\)$/.test(value)) {
    negative = true;
    value = value.slice(1, -1);
  }
  if (value.startsWith('-')) {
    negative = !negative;
    value = value.slice(1);
  } else if (value.endsWith('-')) {
    negative = !negative;
    value = value.slice(0, -1);
  } else if (value.startsWith('+')) {
    value = value.slice(1);
  }
  value = value.replace(/^R\$/i, '');
  const thousands = decimalSeparator === ',' ? '.' : ',';
  const escapedDecimal = decimalSeparator === ',' ? ',' : '\\.';
  const escapedThousands = thousands === '.' ? '\\.' : ',';
  const pattern = new RegExp(
    `^(\\d{1,3}(?:${escapedThousands}\\d{3})+|\\d+)(?:${escapedDecimal}(\\d+))?$`,
  );
  const match = pattern.exec(value);
  if (match === null) {
    return { ok: false, error: 'invalid' };
  }
  const integerPart = (match[1] ?? '').split(thousands).join('');
  const fraction = match[2] ?? '';
  if (fraction.length > 2) {
    return { ok: false, error: 'too_many_decimals' };
  }
  const digits = `${integerPart}${fraction.padEnd(2, '0')}`.replace(/^0+(?=\d)/, '');
  if (digits.length > String(MAX_AMOUNT_MINOR).length) {
    return { ok: false, error: 'too_large' };
  }
  const amountMinor = Number(digits);
  if (amountMinor > MAX_AMOUNT_MINOR) {
    return { ok: false, error: 'too_large' };
  }
  if (amountMinor === 0) {
    return { ok: false, error: 'zero' };
  }
  return { ok: true, amountMinor, negative };
}

export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const EXPENSE_WORDS = ['despesa', 'saida', 'debito', 'gasto', 'pagamento', 'expense', 'debit'];
const INCOME_WORDS = ['receita', 'entrada', 'credito', 'income', 'credit'];
const PAID_WORDS = ['pago', 'paga', 'recebido', 'recebida', 'realizado', 'sim', 'paid', 'yes'];
const PENDING_WORDS = ['pendente', 'previsto', 'a pagar', 'a receber', 'nao', 'pending', 'no'];

export function classifyImportType(text: string): 'expense' | 'income' | null {
  const value = normalizeForMatch(text);
  if (EXPENSE_WORDS.includes(value)) {
    return 'expense';
  }
  return INCOME_WORDS.includes(value) ? 'income' : null;
}

export function classifyImportStatus(text: string): 'paid' | 'pending' | null {
  const value = normalizeForMatch(text);
  if (PAID_WORDS.includes(value)) {
    return 'paid';
  }
  return PENDING_WORDS.includes(value) ? 'pending' : null;
}
