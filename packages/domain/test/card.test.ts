import { describe, expect, it } from 'vitest';

import {
  cardDayInMonth,
  currentCardLimit,
  defaultInvoiceDates,
  defaultInvoiceMonth,
  isValidCardDay,
} from '../src/card.ts';

describe('card days', () => {
  it.each([1, 15, 31])('accepts %i', (day) => {
    expect(isValidCardDay(day)).toBe(true);
  });

  it.each([0, 32, 1.5, -1])('rejects %d', (day) => {
    expect(isValidCardDay(day)).toBe(false);
  });

  it.each([
    ['2026-03', 31, '2026-03-31'],
    ['2026-04', 31, '2026-04-30'],
    ['2026-02', 30, '2026-02-28'],
    ['2028-02', 30, '2028-02-29'],
    ['2026-02', 5, '2026-02-05'],
  ])('places day %s/%i on %s', (month, day, expected) => {
    expect(cardDayInMonth(month, day)).toBe(expected);
  });
});

describe('current card limit', () => {
  const limits = [
    { amountMinor: 500_000, effectiveFrom: '2026-01-01', recordedAt: '2026-01-01T10:00:00.000Z' },
    { amountMinor: 800_000, effectiveFrom: '2026-06-01', recordedAt: '2026-05-20T10:00:00.000Z' },
    { amountMinor: 700_000, effectiveFrom: '2026-06-01', recordedAt: '2026-05-21T10:00:00.000Z' },
    { amountMinor: 900_000, effectiveFrom: '2026-10-01', recordedAt: '2026-09-01T10:00:00.000Z' },
  ];

  it('uses the latest value effective up to the date', () => {
    expect(currentCardLimit(limits, '2026-05-31')?.amountMinor).toBe(500_000);
    expect(currentCardLimit(limits, '2026-09-30')?.amountMinor).toBe(700_000);
    expect(currentCardLimit(limits, '2026-10-01')?.amountMinor).toBe(900_000);
  });

  it('has no limit before the first effective date', () => {
    expect(currentCardLimit(limits, '2025-12-31')).toBeNull();
  });
});

describe('default invoice dates', () => {
  it('closes in the same month when the due day comes after the closing day', () => {
    expect(defaultInvoiceDates('2026-10', { closingDay: 3, dueDay: 10 })).toEqual({
      closingDate: '2026-10-03',
      dueDate: '2026-10-13',
    });
  });

  it('closes in the previous month when the due day is on or before the closing day', () => {
    expect(defaultInvoiceDates('2026-03', { closingDay: 28, dueDay: 5 })).toEqual({
      closingDate: '2026-02-28',
      dueDate: '2026-03-05',
    });
    expect(defaultInvoiceDates('2026-01', { closingDay: 10, dueDay: 10 })).toEqual({
      closingDate: '2025-12-10',
      dueDate: '2026-01-12',
    });
  });

  it('clamps short months and moves the due date past holidays', () => {
    expect(defaultInvoiceDates('2026-03', { closingDay: 31, dueDay: 7 })).toEqual({
      closingDate: '2026-02-28',
      dueDate: '2026-03-09',
    });
    expect(defaultInvoiceDates('2026-04', { closingDay: 25, dueDay: 3 }).dueDate).toBe(
      '2026-04-06',
    );
  });
});

describe('default invoice month', () => {
  const schedule = { closingDay: 3, dueDay: 10 };

  it.each([
    ['2026-10-02', '2026-10'],
    ['2026-10-03', '2026-11'],
    ['2026-10-04', '2026-11'],
    ['2026-12-31', '2027-01'],
  ])('puts a purchase on %s in the %s invoice', (purchaseDate, month) => {
    expect(defaultInvoiceMonth(purchaseDate, schedule)).toBe(month);
  });

  it('uses the next month invoice when the card closes in the previous month', () => {
    const lateClosing = { closingDay: 28, dueDay: 5 };
    expect(defaultInvoiceMonth('2026-02-27', lateClosing)).toBe('2026-03');
    expect(defaultInvoiceMonth('2026-02-28', lateClosing)).toBe('2026-04');
    expect(defaultInvoiceMonth('2026-03-01', lateClosing)).toBe('2026-04');
  });
});
