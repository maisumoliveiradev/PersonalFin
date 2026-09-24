import { describe, expect, it } from 'vitest';

import {
  defaultMaterializationEnd,
  maxMaterializationEnd,
  occurrencesThrough,
  scheduledDates,
} from '../src/recurrence.ts';

describe('scheduledDates', () => {
  it('uses the last day of shorter months for monthly series on the 31st', () => {
    expect(
      scheduledDates(
        { startDate: '2026-01-31', endDate: null, frequency: 'monthly' },
        '2026-06-30',
      ),
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
  });

  it('keeps the original day after a short month', () => {
    expect(
      scheduledDates(
        { startDate: '2024-01-30', endDate: null, frequency: 'monthly' },
        '2024-04-30',
      ),
    ).toEqual(['2024-01-30', '2024-02-29', '2024-03-30', '2024-04-30']);
  });

  it('repeats weekly across month boundaries', () => {
    expect(
      scheduledDates({ startDate: '2026-09-24', endDate: null, frequency: 'weekly' }, '2026-10-15'),
    ).toEqual(['2026-09-24', '2026-10-01', '2026-10-08', '2026-10-15']);
  });

  it('maps 29 February to 28 February in non-leap years', () => {
    expect(
      scheduledDates({ startDate: '2024-02-29', endDate: null, frequency: 'yearly' }, '2028-12-31'),
    ).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
  });

  it('never goes past the end date', () => {
    expect(
      scheduledDates(
        { startDate: '2026-01-10', endDate: '2026-03-09', frequency: 'monthly' },
        '2026-12-31',
      ),
    ).toEqual(['2026-01-10', '2026-02-10']);
  });

  it('returns nothing when the start is after the limit', () => {
    expect(
      scheduledDates(
        { startDate: '2027-01-01', endDate: null, frequency: 'monthly' },
        '2026-12-31',
      ),
    ).toEqual([]);
  });
});

describe('occurrencesThrough', () => {
  it('adjusts financial dates to business days but keeps the scheduled date', () => {
    expect(
      occurrencesThrough(
        {
          startDate: '2026-04-05',
          endDate: null,
          frequency: 'monthly',
          nonBusinessDayRule: 'next',
        },
        '2026-06-30',
      ),
    ).toEqual([
      { occurrenceDate: '2026-04-05', financialDate: '2026-04-06' },
      { occurrenceDate: '2026-05-05', financialDate: '2026-05-05' },
      { occurrenceDate: '2026-06-05', financialDate: '2026-06-05' },
    ]);
  });

  it('can move to the previous business day', () => {
    expect(
      occurrencesThrough(
        {
          startDate: '2026-11-15',
          endDate: '2026-11-15',
          frequency: 'monthly',
          nonBusinessDayRule: 'previous',
        },
        '2026-12-31',
      ),
    ).toEqual([{ occurrenceDate: '2026-11-15', financialDate: '2026-11-13' }]);
  });
});

describe('materialization horizon', () => {
  it('defaults to the end of the month 12 months ahead and caps at 60', () => {
    expect(defaultMaterializationEnd('2026-09')).toBe('2027-09-30');
    expect(maxMaterializationEnd('2026-09')).toBe('2031-09-30');
  });
});
