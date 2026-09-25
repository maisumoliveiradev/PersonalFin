import { type CurrencyCode, MAX_AMOUNT_MINOR, SUPPORTED_CURRENCIES } from './money.ts';

export const RATE_SCALE_DIGITS = 10;
const RATE_SCALE = 10n ** BigInt(RATE_SCALE_DIGITS);
const MAX_RATE_INTEGER_DIGITS = 9;
const RATE_PATTERN = /^(\d{1,9})(?:\.(\d{1,10}))?$/;

export function isValidRate(rate: string): boolean {
  const match = RATE_PATTERN.exec(rate);
  return match !== null && rateToScaled(rate) > 0n;
}

function rateToScaled(rate: string): bigint {
  const [integer = '0', fraction = ''] = rate.split('.');
  return BigInt(integer) * RATE_SCALE + BigInt(fraction.padEnd(RATE_SCALE_DIGITS, '0'));
}

export function normalizeRate(rate: string): string {
  const scaled = rateToScaled(rate);
  const integer = scaled / RATE_SCALE;
  const fraction = (scaled % RATE_SCALE)
    .toString()
    .padStart(RATE_SCALE_DIGITS, '0')
    .replace(/0+$/, '');
  return fraction === '' ? integer.toString() : `${integer}.${fraction}`;
}

export type RateParseResult = { ok: true; rate: string } | { ok: false; error: 'invalid' };

export function parseRateInput(input: string, decimalSeparator: ',' | '.'): RateParseResult {
  const compact = input.trim().replace(/\s/g, '');
  const thousands = decimalSeparator === ',' ? '.' : ',';
  const withoutGroups = compact.includes(decimalSeparator)
    ? compact.split(thousands).join('')
    : compact.replace(new RegExp(`\\${thousands}(?=\\d{3}(\\D|$))`, 'g'), '');
  const normalized = withoutGroups.replace(decimalSeparator, '.');
  const match = RATE_PATTERN.exec(normalized);
  if (match === null || (match[1] ?? '').length > MAX_RATE_INTEGER_DIGITS) {
    return { ok: false, error: 'invalid' };
  }
  return rateToScaled(normalized) > 0n
    ? { ok: true, rate: normalizeRate(normalized) }
    : { ok: false, error: 'invalid' };
}

export type ConversionResult =
  | { ok: true; amountMinor: number }
  | { ok: false; error: 'too_large' | 'zero' };

export function convertToBase(
  originalMinor: number,
  originalCurrency: CurrencyCode,
  rate: string,
  baseCurrency: CurrencyCode,
): ConversionResult {
  const numerator =
    BigInt(originalMinor) *
    rateToScaled(rate) *
    10n ** BigInt(SUPPORTED_CURRENCIES[baseCurrency].minorUnits);
  const denominator = RATE_SCALE * 10n ** BigInt(SUPPORTED_CURRENCIES[originalCurrency].minorUnits);
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  let quotient = magnitude / denominator;
  if ((magnitude % denominator) * 2n >= denominator) {
    quotient += 1n;
  }
  if (quotient > BigInt(MAX_AMOUNT_MINOR)) {
    return { ok: false, error: 'too_large' };
  }
  if (quotient === 0n) {
    return { ok: false, error: 'zero' };
  }
  return { ok: true, amountMinor: Number(negative ? -quotient : quotient) };
}

export function formatRate(rate: string, decimalSeparator: ',' | '.'): string {
  return normalizeRate(rate).replace('.', decimalSeparator);
}
