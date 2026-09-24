import { describe, expect, it } from 'vitest';

import { isValidBalanceMinor, MAX_AMOUNT_MINOR, parseAmountInput } from '../src/money.ts';

const balance = { allowNegative: true, allowZero: true };

describe('parseAmountInput for balances', () => {
  it.each([
    ['1.234,56', 123456],
    ['-1.234,56', -123456],
    ['−50,00', -5000],
    ['0', 0],
    ['-0,00', 0],
    ['-999.999.999,99', -MAX_AMOUNT_MINOR],
  ])('parses %j as %i', (input, expected) => {
    expect(parseAmountInput(input, 'BRL', 'pt-BR', balance)).toEqual({
      ok: true,
      amountMinor: expected,
    });
  });

  it.each([
    ['--10', 'invalid'],
    ['10-', 'invalid'],
    ['-', 'invalid'],
    ['-1.000.000.000,00', 'too_large'],
  ])('rejects %j as %s', (input, error) => {
    expect(parseAmountInput(input, 'BRL', 'pt-BR', balance)).toEqual({ ok: false, error });
  });

  it('keeps transaction amounts strictly positive by default', () => {
    expect(parseAmountInput('-10', 'BRL', 'pt-BR')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmountInput('0', 'BRL', 'pt-BR')).toEqual({ ok: false, error: 'not_positive' });
  });

  it.each([
    [0, true],
    [-1, true],
    [-MAX_AMOUNT_MINOR, true],
    [-MAX_AMOUNT_MINOR - 1, false],
    [0.5, false],
  ])('isValidBalanceMinor(%d) is %s', (value, expected) => {
    expect(isValidBalanceMinor(value)).toBe(expected);
  });
});
