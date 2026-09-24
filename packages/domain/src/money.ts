export const SUPPORTED_CURRENCIES = {
  BRL: { code: 'BRL', minorUnits: 2, symbol: 'R$' },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export const DEFAULT_CURRENCY: CurrencyCode = 'BRL';

export const MAX_AMOUNT_MINOR = 99_999_999_999;

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface NumberFormatSymbols {
  decimalSeparator: string;
  groupSeparator: string;
}

export const NUMBER_FORMAT_SYMBOLS = {
  'pt-BR': { decimalSeparator: ',', groupSeparator: '.' },
  en: { decimalSeparator: '.', groupSeparator: ',' },
} as const satisfies Record<string, NumberFormatSymbols>;

export type SupportedLocale = keyof typeof NUMBER_FORMAT_SYMBOLS;

export type AmountParseError =
  | 'empty'
  | 'invalid'
  | 'too_many_decimals'
  | 'not_positive'
  | 'too_large';

export type AmountParseResult =
  | { ok: true; amountMinor: number }
  | { ok: false; error: AmountParseError };

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return Object.hasOwn(SUPPORTED_CURRENCIES, code);
}

export function isValidAmountMinor(amountMinor: number): boolean {
  return Number.isSafeInteger(amountMinor) && amountMinor > 0 && amountMinor <= MAX_AMOUNT_MINOR;
}

export function isValidBalanceMinor(amountMinor: number): boolean {
  return Number.isSafeInteger(amountMinor) && Math.abs(amountMinor) <= MAX_AMOUNT_MINOR;
}

export interface AmountParseOptions {
  allowNegative?: boolean;
  allowZero?: boolean;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseAmountInput(
  input: string,
  currency: CurrencyCode,
  locale: SupportedLocale,
  options: AmountParseOptions = {},
): AmountParseResult {
  const { decimalSeparator, groupSeparator } = NUMBER_FORMAT_SYMBOLS[locale];
  const { minorUnits } = SUPPORTED_CURRENCIES[currency];
  const compact = input.trim().replace(/\s/g, '');
  if (compact === '') {
    return { ok: false, error: 'empty' };
  }
  const negative = options.allowNegative === true && /^[-−]/.test(compact);
  const text = negative ? compact.slice(1) : compact;

  const group = escapeForRegExp(groupSeparator);
  const decimal = escapeForRegExp(decimalSeparator);
  const pattern = new RegExp(`^(\\d{1,3}(?:${group}\\d{3})+|\\d+)(?:${decimal}(\\d+))?$`);
  const match = pattern.exec(text);
  if (match === null) {
    return { ok: false, error: 'invalid' };
  }

  const integerDigits = (match[1] ?? '').split(groupSeparator).join('');
  const fractionDigits = match[2] ?? '';
  if (fractionDigits.length > minorUnits) {
    return { ok: false, error: 'too_many_decimals' };
  }

  const digits = `${integerDigits}${fractionDigits.padEnd(minorUnits, '0')}`.replace(
    /^0+(?=\d)/,
    '',
  );
  if (digits.length > String(MAX_AMOUNT_MINOR).length) {
    return { ok: false, error: 'too_large' };
  }
  const magnitude = Number(digits);
  if (magnitude === 0 && options.allowZero !== true) {
    return { ok: false, error: 'not_positive' };
  }
  if (magnitude > MAX_AMOUNT_MINOR) {
    return { ok: false, error: 'too_large' };
  }
  return { ok: true, amountMinor: negative && magnitude !== 0 ? -magnitude : magnitude };
}

export function formatMoney(money: Money, locale: SupportedLocale): string {
  const { decimalSeparator, groupSeparator } = NUMBER_FORMAT_SYMBOLS[locale];
  const { minorUnits, symbol } = SUPPORTED_CURRENCIES[money.currency];
  const sign = money.amountMinor < 0 ? '-' : '';
  const digits = String(Math.abs(money.amountMinor)).padStart(minorUnits + 1, '0');
  const integerPart = digits.slice(0, digits.length - minorUnits);
  const fractionPart = digits.slice(digits.length - minorUnits);
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  const decimals = minorUnits > 0 ? `${decimalSeparator}${fractionPart}` : '';
  return `${sign}${symbol} ${groupedInteger}${decimals}`;
}
