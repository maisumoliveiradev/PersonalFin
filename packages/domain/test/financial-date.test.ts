import { describe, expect, it } from 'vitest';

import {
  financialDateFromLocalClock,
  formatDisplayDate,
  isValidFinancialDate,
  parseDisplayDate,
} from '../src/financial-date.ts';

describe('isValidFinancialDate', () => {
  it.each(['2026-01-31', '2024-02-29', '2026-12-01'])('accepts %s', (value) => {
    expect(isValidFinancialDate(value)).toBe(true);
  });

  it.each([
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-1-5',
    '2026-01-05T00:00:00Z',
    '05/01/2026',
    '',
  ])('rejects %j', (value) => {
    expect(isValidFinancialDate(value)).toBe(false);
  });
});

describe('financialDateFromLocalClock', () => {
  it('uses the local calendar day, not the UTC day', () => {
    const lateEvening = new Date(2026, 0, 31, 23, 30);

    expect(financialDateFromLocalClock(lateEvening)).toBe('2026-01-31');
  });

  it('uses the local calendar day just after midnight', () => {
    expect(financialDateFromLocalClock(new Date(2026, 2, 1, 0, 5))).toBe('2026-03-01');
  });
});

describe('display dates', () => {
  it.each([
    ['05/01/2026', '2026-01-05'],
    ['5/1/2026', '2026-01-05'],
    ['29/02/2024', '2024-02-29'],
  ])('parses pt-BR %s as %s', (input, expected) => {
    expect(parseDisplayDate(input, 'pt-BR')).toBe(expected);
  });

  it.each(['31/02/2026', '2026-01-05', '05-01-2026', '32/01/2026', ''])(
    'rejects invalid pt-BR date %j',
    (input) => {
      expect(parseDisplayDate(input, 'pt-BR')).toBeNull();
    },
  );

  it('parses English month-first dates', () => {
    expect(parseDisplayDate('01/05/2026', 'en')).toBe('2026-01-05');
  });

  it('formats without any timezone conversion', () => {
    expect(formatDisplayDate('2026-01-05', 'pt-BR')).toBe('05/01/2026');
    expect(formatDisplayDate('2026-01-05', 'en')).toBe('01/05/2026');
  });
});
