import type {
  CreateTransactionRequest,
  ForeignCurrencyCode,
  Transaction,
} from '@personalfin/api-contract';
import {
  type AmountParseError,
  type CurrencyCode,
  DEFAULT_CURRENCY,
  formatDisplayDate,
  formatRate,
  isValidInstallmentCount,
  type Month,
  normalizeTransactionDescription,
  parseAmountInput,
  parseDisplayDate,
  parseRateInput,
  SUPPORTED_CURRENCIES,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  type TransactionStatus,
  type TransactionType,
} from '@personalfin/domain';

import { messages } from '../../i18n/messages';

export interface TransactionFormValues {
  type: TransactionType;
  description: string;
  amount: string;
  date: string;
  categoryId: string | null;
  subcategoryId: string | null;
  status: TransactionStatus;
  cardId: string | null;
  invoiceMonth: Month | null;
  installments: string;
  tagIds: string[];
  currency: CurrencyCode;
  rate: string;
}

export type TransactionFormResult =
  | { ok: true; request: CreateTransactionRequest }
  | { ok: false; error: string };

const AMOUNT_ERRORS: Record<AmountParseError, string> = {
  empty: messages.transactions.errors.amountEmpty,
  invalid: messages.transactions.errors.amountInvalid,
  too_many_decimals: messages.transactions.errors.amountTooManyDecimals,
  not_positive: messages.transactions.errors.amountNotPositive,
  too_large: messages.transactions.errors.amountTooLarge,
};

export function toCreateTransactionRequest(values: TransactionFormValues): TransactionFormResult {
  const description = normalizeTransactionDescription(values.description);
  if (description === '') {
    return { ok: false, error: messages.transactions.errors.descriptionRequired };
  }
  if (description.length > TRANSACTION_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: messages.transactions.errors.descriptionTooLong };
  }
  const amount = parseAmountInput(values.amount, values.currency, 'pt-BR');
  if (!amount.ok) {
    return { ok: false, error: AMOUNT_ERRORS[amount.error] };
  }
  const foreign = values.currency !== DEFAULT_CURRENCY;
  let rate: string | undefined;
  if (foreign && values.rate.trim() !== '') {
    const parsedRate = parseRateInput(values.rate, ',');
    if (!parsedRate.ok) {
      return { ok: false, error: messages.currencies.errors.rateInvalid };
    }
    rate = parsedRate.rate;
  }
  const financialDate = parseDisplayDate(values.date, 'pt-BR');
  if (financialDate === null) {
    return { ok: false, error: messages.transactions.errors.dateInvalid };
  }
  if (values.categoryId === null) {
    return { ok: false, error: messages.transactions.errors.categoryRequired };
  }
  if (values.tagIds.length > 10) {
    return { ok: false, error: messages.tags.errors.tooMany };
  }
  const request: CreateTransactionRequest = {
    type: values.type,
    description,
    ...(foreign
      ? {
          foreign: {
            currency: values.currency as ForeignCurrencyCode,
            amountMinor: amount.amountMinor,
            ...(rate === undefined ? {} : { rate }),
          },
        }
      : { amountMinor: amount.amountMinor }),
    financialDate,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId,
    tagIds: values.tagIds,
  };
  if (values.cardId === null) {
    return { ok: true, request: { ...request, status: values.status } };
  }
  const installments = parseInstallments(values.installments);
  if (installments === null || amount.amountMinor < installments) {
    return { ok: false, error: messages.cards.errors.installmentsInvalid };
  }
  if (foreign && installments > 1) {
    return { ok: false, error: messages.currencies.errors.noInstallments };
  }
  if (installments > 1 && values.tagIds.length > 0) {
    return { ok: false, error: messages.cards.errors.installmentTags };
  }
  return {
    ok: true,
    request: {
      ...request,
      cardId: values.cardId,
      ...(values.invoiceMonth === null ? {} : { invoiceMonth: values.invoiceMonth }),
      ...(installments === 1 ? {} : { installments }),
    },
  };
}

function parseInstallments(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return 1;
  }
  if (!/^\d{1,2}$/.test(trimmed)) {
    return null;
  }
  const count = Number(trimmed);
  return count === 1 || isValidInstallmentCount(count) ? count : null;
}

export function amountText(amountMinor: number, currency: CurrencyCode): string {
  const { minorUnits } = SUPPORTED_CURRENCIES[currency];
  const digits = String(amountMinor).padStart(minorUnits + 1, '0');
  const integer = digits.slice(0, digits.length - minorUnits).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return minorUnits === 0 ? integer : `${integer},${digits.slice(digits.length - minorUnits)}`;
}

export function transactionToFormValues(transaction: Transaction): TransactionFormValues {
  const original = transaction.original;
  const amount =
    original === null
      ? amountText(transaction.amountMinor, DEFAULT_CURRENCY)
      : amountText(original.amountMinor, original.currency as CurrencyCode);
  return {
    type: transaction.type,
    description: transaction.description,
    amount,
    date: formatDisplayDate(transaction.financialDate, 'pt-BR'),
    categoryId: transaction.category.id,
    subcategoryId: transaction.subcategory?.id ?? null,
    status: transaction.status,
    cardId: transaction.cardPurchase?.cardId ?? null,
    invoiceMonth: transaction.cardPurchase?.invoiceMonth ?? null,
    installments: '1',
    tagIds: transaction.tags.map((tag) => tag.id),
    currency: (original?.currency ?? DEFAULT_CURRENCY) as CurrencyCode,
    rate: original === null ? '' : formatRate(original.rate, ','),
  };
}
