import { describe, expect, it } from 'vitest';

import { compareAmounts, formatPercentTenths, shareTenths } from '../src/comparison.ts';

describe('comparisons', () => {
  it.each([
    [110_00, 100_00, 10_00, 100],
    [90_00, 100_00, -10_00, -100],
    [1, 3, -2, -667],
    [2, 3, -1, -333],
    [20_000, 10_000, 10_000, 1_000],
    [-5_000, -10_000, 5_000, 500],
    [99_999_999_999, 1, 99_999_999_998, 99_999_999_998_000],
  ])('compares %i with %i', (current, base, difference, tenths) => {
    expect(compareAmounts(current, base)).toEqual({ difference, percentChangeTenths: tenths });
  });

  it('has no percentage when the base is zero', () => {
    expect(compareAmounts(500, 0)).toEqual({ difference: 500, percentChangeTenths: null });
  });

  it('rounds half away from zero', () => {
    expect(compareAmounts(2_001, 2_000).percentChangeTenths).toBe(1);
    expect(compareAmounts(1_999, 2_000).percentChangeTenths).toBe(-1);
    expect(compareAmounts(2_003, 2_000).percentChangeTenths).toBe(2);
    expect(compareAmounts(2_000_2, 2_000_0).percentChangeTenths).toBe(0);
  });

  it('formats tenths of a percent for display', () => {
    expect(formatPercentTenths(123, 'pt-BR')).toBe('+12,3%');
    expect(formatPercentTenths(-5, 'pt-BR')).toBe('-0,5%');
    expect(formatPercentTenths(0, 'en')).toBe('0.0%');
  });
});

describe('shares', () => {
  it('gives the share of a total in tenths of a percent', () => {
    expect(shareTenths(1, 3)).toBe(333);
    expect(shareTenths(2, 3)).toBe(667);
    expect(shareTenths(1, 2_000)).toBe(1);
    expect(shareTenths(5, 0)).toBeNull();
  });
});
