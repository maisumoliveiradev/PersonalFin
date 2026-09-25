import { describe, expect, it } from 'vitest';

import {
  classifyImportStatus,
  classifyImportType,
  normalizeForMatch,
  parseImportAmount,
  parseImportDate,
} from '../src/import.ts';

describe('import dates (DR-058)', () => {
  it('reads the chosen order and always accepts ISO dates', () => {
    expect(parseImportDate('03/04/2026', 'DMY')).toBe('2026-04-03');
    expect(parseImportDate('3.4.2026', 'DMY')).toBe('2026-04-03');
    expect(parseImportDate('2026/04/03', 'YMD')).toBe('2026-04-03');
    expect(parseImportDate('2026-04-03', 'DMY')).toBe('2026-04-03');
  });

  it('rejects invalid calendar dates and the other order', () => {
    expect(parseImportDate('31/02/2026', 'DMY')).toBeNull();
    expect(parseImportDate('03/04/2026', 'YMD')).toBeNull();
    expect(parseImportDate('04/03/26', 'DMY')).toBeNull();
    expect(parseImportDate('', 'DMY')).toBeNull();
  });
});

describe('import amounts', () => {
  it('reads pt-BR amounts with thousands, currency, and signs', () => {
    expect(parseImportAmount('R$ 1.234,56', ',')).toEqual({
      ok: true,
      amountMinor: 123_456,
      negative: false,
    });
    expect(parseImportAmount('-1.234,5', ',')).toEqual({
      ok: true,
      amountMinor: 123_450,
      negative: true,
    });
    expect(parseImportAmount('(12,34)', ',')).toEqual({
      ok: true,
      amountMinor: 1_234,
      negative: true,
    });
    expect(parseImportAmount('12,34-', ',')).toEqual({
      ok: true,
      amountMinor: 1_234,
      negative: true,
    });
    expect(parseImportAmount('R$ -7', ',')).toEqual({ ok: true, amountMinor: 700, negative: true });
  });

  it('reads dot-decimal amounts such as Excel numbers', () => {
    expect(parseImportAmount('1234.5', '.')).toEqual({
      ok: true,
      amountMinor: 123_450,
      negative: false,
    });
    expect(parseImportAmount('1,234.56', '.')).toEqual({
      ok: true,
      amountMinor: 123_456,
      negative: false,
    });
    expect(parseImportAmount('0.1', '.')).toEqual({ ok: true, amountMinor: 10, negative: false });
  });

  it('never rounds or guesses', () => {
    expect(parseImportAmount('0.30000000000000004', '.')).toEqual({
      ok: false,
      error: 'too_many_decimals',
    });
    expect(parseImportAmount('1.234,56', '.')).toEqual({ ok: false, error: 'invalid' });
    expect(parseImportAmount('12,3,4', ',')).toEqual({ ok: false, error: 'invalid' });
    expect(parseImportAmount('0,00', ',')).toEqual({ ok: false, error: 'zero' });
    expect(parseImportAmount('', ',')).toEqual({ ok: false, error: 'empty' });
    expect(parseImportAmount('1000000000,00', ',')).toEqual({ ok: false, error: 'too_large' });
  });
});

describe('import text matching', () => {
  it('normalizes accents, case, and spaces', () => {
    expect(normalizeForMatch('  Alimentação   Fora ')).toBe('alimentacao fora');
  });

  it('classifies known type and status words only', () => {
    expect(classifyImportType('Saída')).toBe('expense');
    expect(classifyImportType('Crédito')).toBe('income');
    expect(classifyImportType('talvez')).toBeNull();
    expect(classifyImportStatus('Pago')).toBe('paid');
    expect(classifyImportStatus('A pagar')).toBe('pending');
    expect(classifyImportStatus('?')).toBeNull();
  });
});
