import { describe, expect, it } from 'vitest';

import { formatMonthLabel, isValidMonth, monthOf, monthRange, shiftMonth } from '../src/month.ts';

describe('months', () => {
  it.each(['2026-01', '2026-12', '1900-01'])('accepts %s', (value) => {
    expect(isValidMonth(value)).toBe(true);
  });

  it.each(['2026-13', '2026-00', '2026-1', '26-01', '2026-01-01', ''])('rejects %j', (value) => {
    expect(isValidMonth(value)).toBe(false);
  });

  it('derives the month of a financial date', () => {
    expect(monthOf('2026-02-28')).toBe('2026-02');
  });

  it.each([
    ['2026-01', -1, '2025-12'],
    ['2025-12', 1, '2026-01'],
    ['2026-03', 12, '2027-03'],
    ['2026-03', -15, '2024-12'],
  ])('shifts %s by %i to %s', (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected);
  });

  it('builds a half-open calendar range, including across years and leap years', () => {
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', endExclusive: '2024-03-01' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', endExclusive: '2027-01-01' });
  });

  it('formats labels per locale', () => {
    expect(formatMonthLabel('2026-03', 'pt-BR')).toBe('março de 2026');
    expect(formatMonthLabel('2026-03', 'en')).toBe('March 2026');
  });
});
