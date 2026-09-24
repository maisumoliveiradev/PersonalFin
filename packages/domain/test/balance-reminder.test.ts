import { describe, expect, it } from 'vitest';

import {
  type BalanceReminderSetting,
  daysBetween,
  isBalanceUpdateDue,
  isValidBalanceReminder,
} from '../src/balance-reminder.ts';

const everyDays = (intervalDays: number): BalanceReminderSetting => ({
  frequency: 'every_n_days',
  intervalDays,
});

describe('daysBetween', () => {
  it.each([
    ['2026-02-01', '2026-02-01', 0],
    ['2026-02-28', '2026-03-01', 1],
    ['2024-02-28', '2024-03-01', 2],
    ['2025-12-31', '2026-01-01', 1],
    ['2026-03-10', '2026-03-01', -9],
  ])('from %s to %s is %i', (from, to, expected) => {
    expect(daysBetween(from, to)).toBe(expected);
  });
});

describe('isBalanceUpdateDue', () => {
  it('is always due without any snapshot unless set to never', () => {
    for (const frequency of ['app_start', 'daily'] as const) {
      expect(
        isBalanceUpdateDue({
          setting: { frequency, intervalDays: null },
          lastObservedOn: null,
          today: '2026-02-10',
        }),
      ).toBe(true);
    }
    expect(
      isBalanceUpdateDue({ setting: everyDays(7), lastObservedOn: null, today: '2026-02-10' }),
    ).toBe(true);
    expect(
      isBalanceUpdateDue({
        setting: { frequency: 'never', intervalDays: null },
        lastObservedOn: null,
        today: '2026-02-10',
      }),
    ).toBe(false);
  });

  it.each([
    ['2026-02-10', false],
    ['2026-02-09', true],
  ])('daily: last %s on 2026-02-10 is due=%s', (lastObservedOn, expected) => {
    expect(
      isBalanceUpdateDue({
        setting: { frequency: 'daily', intervalDays: null },
        lastObservedOn,
        today: '2026-02-10',
      }),
    ).toBe(expected);
  });

  it.each([
    ['2026-02-04', false],
    ['2026-02-03', true],
    ['2026-01-01', true],
  ])('every 7 days: last %s on 2026-02-10 is due=%s', (lastObservedOn, expected) => {
    expect(isBalanceUpdateDue({ setting: everyDays(7), lastObservedOn, today: '2026-02-10' })).toBe(
      expected,
    );
  });

  it('app start: due on each start unless a balance was recorded for today', () => {
    const setting: BalanceReminderSetting = { frequency: 'app_start', intervalDays: null };

    expect(isBalanceUpdateDue({ setting, lastObservedOn: '2026-02-09', today: '2026-02-10' })).toBe(
      true,
    );
    expect(isBalanceUpdateDue({ setting, lastObservedOn: '2026-02-10', today: '2026-02-10' })).toBe(
      false,
    );
  });

  it('is not due when the latest balance is dated in the future', () => {
    expect(
      isBalanceUpdateDue({
        setting: everyDays(1),
        lastObservedOn: '2026-03-01',
        today: '2026-02-10',
      }),
    ).toBe(false);
  });
});

describe('isValidBalanceReminder', () => {
  it.each([
    [{ frequency: 'every_n_days', intervalDays: 1 }, true],
    [{ frequency: 'every_n_days', intervalDays: 90 }, true],
    [{ frequency: 'every_n_days', intervalDays: 0 }, false],
    [{ frequency: 'every_n_days', intervalDays: 91 }, false],
    [{ frequency: 'every_n_days', intervalDays: null }, false],
    [{ frequency: 'daily', intervalDays: null }, true],
    [{ frequency: 'daily', intervalDays: 3 }, false],
  ] as const)('%o is %s', (setting, expected) => {
    expect(isValidBalanceReminder(setting)).toBe(expected);
  });
});
