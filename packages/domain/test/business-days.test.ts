import { describe, expect, it } from 'vitest';

import {
  addDays,
  adjustToBusinessDay,
  brazilianNationalHolidays,
  easterSunday,
  isBusinessDay,
} from '../src/business-days.ts';

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2038, '2038-04-25'],
  ])('%i is %s', (year, expected) => {
    expect(easterSunday(year)).toBe(expected);
  });
});

describe('brazilianNationalHolidays', () => {
  it('lists the 2026 national holidays in order, including Good Friday', () => {
    expect(brazilianNationalHolidays(2026).map((holiday) => holiday.date)).toEqual([
      '2026-01-01',
      '2026-04-03',
      '2026-04-21',
      '2026-05-01',
      '2026-09-07',
      '2026-10-12',
      '2026-11-02',
      '2026-11-15',
      '2026-11-20',
      '2026-12-25',
    ]);
  });

  it('includes Black Consciousness Day only from 2024', () => {
    expect(brazilianNationalHolidays(2023).some((holiday) => holiday.date === '2023-11-20')).toBe(
      false,
    );
    expect(brazilianNationalHolidays(2024).some((holiday) => holiday.date === '2024-11-20')).toBe(
      true,
    );
  });

  it('does not treat Carnival or Corpus Christi as national holidays', () => {
    expect(isBusinessDay('2026-02-17')).toBe(true);
    expect(isBusinessDay('2026-06-04')).toBe(true);
  });
});

describe('isBusinessDay', () => {
  it.each([
    ['2026-09-24', true],
    ['2026-09-26', false],
    ['2026-09-27', false],
    ['2026-09-07', false],
    ['2026-04-03', false],
    ['2026-12-25', false],
  ])('%s is %s', (date, expected) => {
    expect(isBusinessDay(date)).toBe(expected);
  });
});

describe('adjustToBusinessDay', () => {
  it('keeps the date when asked to', () => {
    expect(adjustToBusinessDay('2026-09-26', 'keep')).toBe('2026-09-26');
  });

  it('leaves business days unchanged', () => {
    expect(adjustToBusinessDay('2026-09-24', 'next')).toBe('2026-09-24');
    expect(adjustToBusinessDay('2026-09-24', 'previous')).toBe('2026-09-24');
  });

  it('moves a Saturday to the next Monday or previous Friday', () => {
    expect(adjustToBusinessDay('2026-09-26', 'next')).toBe('2026-09-28');
    expect(adjustToBusinessDay('2026-09-26', 'previous')).toBe('2026-09-25');
  });

  it('skips holidays next to weekends', () => {
    expect(adjustToBusinessDay('2026-04-03', 'next')).toBe('2026-04-06');
    expect(adjustToBusinessDay('2026-04-05', 'previous')).toBe('2026-04-02');
    expect(adjustToBusinessDay('2026-11-20', 'next')).toBe('2026-11-23');
  });

  it('crosses month and year boundaries', () => {
    expect(adjustToBusinessDay('2026-01-31', 'next')).toBe('2026-02-02');
    expect(adjustToBusinessDay('2027-01-01', 'previous')).toBe('2026-12-31');
    expect(adjustToBusinessDay('2028-01-01', 'next')).toBe('2028-01-03');
  });
});

describe('addDays', () => {
  it('handles leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});
