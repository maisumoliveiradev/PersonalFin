import type { Transaction } from '@personalfin/api-contract';
import { formatDisplayDate, formatMoney, isSupportedCurrency } from '@personalfin/domain';

import { messages } from '../../i18n/messages';

export function transactionTypeLabel(transaction: Transaction): string {
  return transaction.type === 'expense'
    ? messages.transactions.expense
    : messages.transactions.income;
}

export function transactionStatusLabel(transaction: Transaction): string {
  if (transaction.status === 'pending') {
    return messages.transactions.pending;
  }
  return transaction.type === 'expense'
    ? messages.transactions.paidExpense
    : messages.transactions.receivedIncome;
}

export function transactionAmountLabel(transaction: Transaction): string {
  if (!isSupportedCurrency(transaction.currency)) {
    return `${transaction.currency} ${transaction.amountMinor}`;
  }
  const formatted = formatMoney(
    { amountMinor: transaction.amountMinor, currency: transaction.currency },
    'pt-BR',
  );
  return transaction.type === 'expense' ? `−${formatted}` : `+${formatted}`;
}

export function transactionCategoryLabel(transaction: Transaction): string {
  return transaction.subcategory === null
    ? transaction.category.name
    : `${transaction.category.name} › ${transaction.subcategory.name}`;
}

export function transactionDateLabel(transaction: Transaction): string {
  return formatDisplayDate(transaction.financialDate, 'pt-BR');
}
