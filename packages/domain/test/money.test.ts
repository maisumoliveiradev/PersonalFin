import { describe, expect, it } from 'vitest';

import {
  formatMoney,
  isSupportedCurrency,
  isValidAmountMinor,
  MAX_AMOUNT_MINOR,
  parseAmountInput,
} from '../src/money.ts';

describe('parseAmountInput (pt-BR, BRL)', () => {
  it.each([
    ['0,01', 1],
    ['1', 100],
    ['1,5', 150],
    ['12,34', 1234],
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['  99 ', 9900],
    ['0,10', 10],
    ['0,29', 29],
    ['1.000.000,00', 100000000],
    ['999.999.999,99', MAX_AMOUNT_MINOR],
  ])('parses %j exactly as %i minor units', (input, expected) => {
    expect(parseAmountInput(input, 'BRL', 'pt-BR')).toEqual({ ok: true, amountMinor: expected });
  });

  it('avoids binary floating-point errors for values like 0,1 + 0,2', () => {
    const tenCents = parseAmountInput('0,10', 'BRL', 'pt-BR');
    const twentyCents = parseAmountInput('0,20', 'BRL', 'pt-BR');
    if (!tenCents.ok || !twentyCents.ok) {
      throw new Error('expected valid amounts');
    }

    expect(tenCents.amountMinor + twentyCents.amountMinor).toBe(30);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'invalid'],
    ['1,2,3', 'invalid'],
    ['-10', 'invalid'],
    ['1e3', 'invalid'],
    ['12.34', 'invalid'],
    ['1.23,00', 'invalid'],
    ['1,234', 'too_many_decimals'],
    ['0', 'not_positive'],
    ['0,00', 'not_positive'],
    ['1.000.000.000,00', 'too_large'],
    ['99999999999999999999', 'too_large'],
  ])('rejects %j as %s', (input, error) => {
    expect(parseAmountInput(input, 'BRL', 'pt-BR')).toEqual({ ok: false, error });
  });
});

describe('parseAmountInput (en, BRL)', () => {
  it.each([
    ['1,234.56', 123456],
    ['12.3', 1230],
  ])('parses %j as %i', (input, expected) => {
    expect(parseAmountInput(input, 'BRL', 'en')).toEqual({ ok: true, amountMinor: expected });
  });
});

describe('formatMoney', () => {
  it.each([
    [1, 'R$ 0,01'],
    [100, 'R$ 1,00'],
    [123456, 'R$ 1.234,56'],
    [100000000, 'R$ 1.000.000,00'],
    [-2550, '-R$ 25,50'],
  ])('formats %i minor units in pt-BR', (amountMinor, expected) => {
    expect(formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR')).toBe(expected);
  });

  it('formats with English separators without changing the currency', () => {
    expect(formatMoney({ amountMinor: 123456, currency: 'BRL' }, 'en')).toBe('R$ 1,234.56');
  });

  it('round-trips parsed input', () => {
    const parsed = parseAmountInput('987.654,32', 'BRL', 'pt-BR');
    if (!parsed.ok) {
      throw new Error('expected valid amount');
    }

    expect(formatMoney({ amountMinor: parsed.amountMinor, currency: 'BRL' }, 'pt-BR')).toBe(
      'R$ 987.654,32',
    );
  });
});

describe('amount and currency validation', () => {
  it.each([
    [1, true],
    [MAX_AMOUNT_MINOR, true],
    [0, false],
    [-1, false],
    [1.5, false],
    [MAX_AMOUNT_MINOR + 1, false],
    [Number.NaN, false],
  ])('isValidAmountMinor(%d) is %s', (amountMinor, expected) => {
    expect(isValidAmountMinor(amountMinor)).toBe(expected);
  });

  it('supports BRL only until multi-currency is introduced', () => {
    expect(isSupportedCurrency('BRL')).toBe(true);
    expect(isSupportedCurrency('USD')).toBe(false);
    expect(isSupportedCurrency('toString')).toBe(false);
  });
});
