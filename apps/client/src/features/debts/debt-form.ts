import {
  type AmountParseError,
  DEBT_NAME_MAX_LENGTH,
  type FinancialDate,
  formatMoney,
  formatPercentTenths,
  isValidDebtInstallmentCount,
  parseAmountInput,
  parseDisplayDate,
} from '@personalfin/domain';

import { ApiRequestError } from '../../api/api-client';
import { messages } from '../../i18n/messages';
import type { Parsed } from '../cards/card-form';

const AMOUNT_ERRORS: Record<AmountParseError, string> = {
  empty: messages.transactions.errors.amountEmpty,
  invalid: messages.transactions.errors.amountInvalid,
  too_many_decimals: messages.transactions.errors.amountTooManyDecimals,
  not_positive: messages.transactions.errors.amountNotPositive,
  too_large: messages.transactions.errors.amountTooLarge,
};

export function parseAmount(value: string): Parsed<number> {
  const parsed = parseAmountInput(value, 'BRL', 'pt-BR');
  return parsed.ok
    ? { ok: true, value: parsed.amountMinor }
    : { ok: false, error: AMOUNT_ERRORS[parsed.error] };
}

export function parseDate(value: string): Parsed<FinancialDate> {
  const date = parseDisplayDate(value, 'pt-BR');
  return date === null
    ? { ok: false, error: messages.transactions.errors.dateInvalid }
    : { ok: true, value: date };
}

export interface DebtFormInput {
  name: string;
  original: string;
  count: string;
  installment: string;
  firstDue: string;
}

export interface DebtFormValue {
  name: string;
  originalAmountMinor: number;
  installmentCount: number;
  installmentAmountMinor?: number;
  firstDueDate: FinancialDate;
}

export function parseDebtForm(input: DebtFormInput): Parsed<DebtFormValue> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') {
    return { ok: false, error: messages.debts.errors.nameRequired };
  }
  if (name.length > DEBT_NAME_MAX_LENGTH) {
    return { ok: false, error: messages.debts.errors.nameTooLong };
  }
  const original = parseAmount(input.original);
  if (!original.ok) {
    return original;
  }
  const count = Number(input.count.trim());
  if (!/^\d{1,3}$/.test(input.count.trim()) || !isValidDebtInstallmentCount(count)) {
    return { ok: false, error: messages.debts.errors.countInvalid };
  }
  let installmentAmountMinor: number | undefined;
  if (input.installment.trim() !== '') {
    const installment = parseAmount(input.installment);
    if (!installment.ok) {
      return installment;
    }
    if (installment.value > original.value) {
      return { ok: false, error: messages.debts.errors.installmentTooLarge };
    }
    installmentAmountMinor = installment.value;
  }
  const firstDue = parseDate(input.firstDue);
  if (!firstDue.ok) {
    return firstDue;
  }
  return {
    ok: true,
    value: {
      name,
      originalAmountMinor: original.value,
      installmentCount: count,
      firstDueDate: firstDue.value,
      ...(installmentAmountMinor === undefined ? {} : { installmentAmountMinor }),
    },
  };
}

const DEBT_ERROR_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: messages.common.permissionDenied,
  DEBT_OVERPAYMENT: messages.debts.errors.overpayment,
  INVALID_DEBT_PLAN: messages.debts.errors.installmentTooLarge,
  VERSION_CONFLICT: messages.debts.errors.conflict,
};

export function describeDebtError(error: Error | null): string | null {
  if (error === null) {
    return null;
  }
  if (error instanceof ApiRequestError) {
    return DEBT_ERROR_MESSAGES[error.code] ?? messages.debts.errors.unexpected;
  }
  return messages.debts.errors.unexpected;
}

export function money(amountMinor: number): string {
  return formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR');
}

export function amountInput(amountMinor: number): string {
  return money(amountMinor).replace(/^R\$\u00a0/, '');
}

export function percent(tenths: number): string {
  return formatPercentTenths(tenths, 'pt-BR').replace('+', '');
}
