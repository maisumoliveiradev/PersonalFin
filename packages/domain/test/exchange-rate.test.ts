import { describe, expect, it } from 'vitest';

import {
  convertToBase,
  formatRate,
  isValidRate,
  normalizeRate,
  parseRateInput,
} from '../src/exchange-rate.ts';
import { formatMoney } from '../src/money.ts';

describe('exchange rates (DR-098)', () => {
  it('validates and normalizes decimal rates with up to 10 decimals', () => {
    expect(isValidRate('5.4321')).toBe(true);
    expect(isValidRate('0.0000000001')).toBe(true);
    expect(isValidRate('0')).toBe(false);
    expect(isValidRate('1.12345678901')).toBe(false);
    expect(isValidRate('-1')).toBe(false);
    expect(normalizeRate('5.4300')).toBe('5.43');
    expect(normalizeRate('7.0')).toBe('7');
  });

  it('parses pt-BR and dot input without floating point', () => {
    expect(parseRateInput('5,4321', ',')).toEqual({ ok: true, rate: '5.4321' });
    expect(parseRateInput('1.234,5', ',')).toEqual({ ok: true, rate: '1234.5' });
    expect(parseRateInput('0.1', '.')).toEqual({ ok: true, rate: '0.1' });
    expect(parseRateInput('abc', ',')).toEqual({ ok: false, error: 'invalid' });
    expect(parseRateInput('0', ',')).toEqual({ ok: false, error: 'invalid' });
    expect(formatRate('5.4321', ',')).toBe('5,4321');
  });

  it('converts exactly and rounds half away from zero', () => {
    expect(convertToBase(1_000, 'USD', '5.4321', 'BRL')).toEqual({ ok: true, amountMinor: 5_432 });
    expect(convertToBase(1_001, 'USD', '5.4321', 'BRL')).toEqual({ ok: true, amountMinor: 5_438 });
    expect(convertToBase(1, 'USD', '0.5', 'BRL')).toEqual({ ok: true, amountMinor: 1 });
    expect(convertToBase(10_000, 'JPY', '0.0366', 'BRL')).toEqual({
      ok: true,
      amountMinor: 36_600,
    });
    expect(convertToBase(1_999, 'BRL', '0.1', 'JPY')).toEqual({ ok: true, amountMinor: 2 });
    expect(convertToBase(3, 'USD', '0.1', 'BRL')).toEqual({ ok: false, error: 'zero' });
    expect(convertToBase(99_999_999_999, 'USD', '10', 'BRL')).toEqual({
      ok: false,
      error: 'too_large',
    });
  });

  it('formats every supported currency with its minor units', () => {
    expect(formatMoney({ amountMinor: 123_456, currency: 'USD' }, 'pt-BR')).toBe(
      'US$\u00a01.234,56',
    );
    expect(formatMoney({ amountMinor: 1_234, currency: 'JPY' }, 'pt-BR')).toBe('¥\u00a01.234');
    expect(formatMoney({ amountMinor: 5, currency: 'EUR' }, 'pt-BR')).toBe('€\u00a00,05');
  });
});
