import type { CreateTransactionRequest, Transaction } from '@personalfin/api-contract';
import {
  type AmountParseError,
  formatDisplayDate,
  formatMoney,
  normalizeTransactionDescription,
  parseAmountInput,
  parseDisplayDate,
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
  const amount = parseAmountInput(values.amount, 'BRL', 'pt-BR');
  if (!amount.ok) {
    return { ok: false, error: AMOUNT_ERRORS[amount.error] };
  }
  const financialDate = parseDisplayDate(values.date, 'pt-BR');
  if (financialDate === null) {
    return { ok: false, error: messages.transactions.errors.dateInvalid };
  }
  if (values.categoryId === null) {
    return { ok: false, error: messages.transactions.errors.categoryRequired };
  }
  return {
    ok: true,
    request: {
      type: values.type,
      status: values.status,
      description,
      amountMinor: amount.amountMinor,
      financialDate,
      categoryId: values.categoryId,
      subcategoryId: values.subcategoryId,
    },
  };
}

export function transactionToFormValues(transaction: Transaction): TransactionFormValues {
  const amount = formatMoney(
    { amountMinor: transaction.amountMinor, currency: 'BRL' },
    'pt-BR',
  ).replace(/^R\$\u00a0/, '');
  return {
    type: transaction.type,
    description: transaction.description,
    amount,
    date: formatDisplayDate(transaction.financialDate, 'pt-BR'),
    categoryId: transaction.category.id,
    subcategoryId: transaction.subcategory?.id ?? null,
    status: transaction.status,
  };
}
