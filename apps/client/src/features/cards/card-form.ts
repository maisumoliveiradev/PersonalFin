import type { Card, CardLimitChange } from '@personalfin/api-contract';
import {
  type AmountParseError,
  CARD_NAME_MAX_LENGTH,
  currentCardLimit,
  type FinancialDate,
  formatMoney,
  isSupportedCurrency,
  isValidCardDay,
  parseAmountInput,
  parseDisplayDate,
} from '@personalfin/domain';

import { ApiRequestError } from '../../api/api-client';
import { messages } from '../../i18n/messages';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface CardDetailsInput {
  name: string;
  closingDay: string;
  dueDay: string;
}

export function parseCardDetails(
  input: CardDetailsInput,
): Parsed<{ name: string; closingDay: number; dueDay: number }> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') {
    return { ok: false, error: messages.cards.errors.nameRequired };
  }
  if (name.length > CARD_NAME_MAX_LENGTH) {
    return { ok: false, error: messages.cards.errors.nameTooLong };
  }
  const closingDay = parseDay(input.closingDay);
  const dueDay = parseDay(input.dueDay);
  if (closingDay === null || dueDay === null) {
    return { ok: false, error: messages.cards.errors.dayInvalid };
  }
  return { ok: true, value: { name, closingDay, dueDay } };
}

function parseDay(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,2}$/.test(trimmed)) {
    return null;
  }
  const day = Number(trimmed);
  return isValidCardDay(day) ? day : null;
}

const LIMIT_ERRORS: Record<AmountParseError, string> = {
  empty: messages.cards.errors.limitEmpty,
  invalid: messages.cards.errors.limitInvalid,
  too_many_decimals: messages.cards.errors.limitTooManyDecimals,
  not_positive: messages.cards.errors.limitInvalid,
  too_large: messages.cards.errors.limitTooLarge,
};

export function parseLimit(
  amount: string,
  date: string,
): Parsed<{ amountMinor: number; effectiveFrom: FinancialDate }> {
  const parsed = parseAmountInput(amount, 'BRL', 'pt-BR');
  if (!parsed.ok) {
    return { ok: false, error: LIMIT_ERRORS[parsed.error] };
  }
  const effectiveFrom = parseDisplayDate(date, 'pt-BR');
  if (effectiveFrom === null) {
    return { ok: false, error: messages.cards.errors.dateInvalid };
  }
  return { ok: true, value: { amountMinor: parsed.amountMinor, effectiveFrom } };
}

export function limitAmountLabel(change: CardLimitChange): string {
  if (!isSupportedCurrency(change.currency)) {
    return `${change.currency} ${change.amountMinor}`;
  }
  return formatMoney({ amountMinor: change.amountMinor, currency: change.currency }, 'pt-BR');
}

export function currentLimitLabel(card: Card, today: FinancialDate): string {
  const current = currentCardLimit(card.limits, today);
  return current === null ? messages.cards.noCurrentLimit : limitAmountLabel(current);
}

const CARD_ERROR_MESSAGES: Record<string, string> = {
  CARD_NAME_TAKEN: messages.cards.errors.nameTaken,
  VERSION_CONFLICT: messages.cards.errors.conflict,
};

export function describeCardError(error: Error | null): string | null {
  if (error === null) {
    return null;
  }
  if (error instanceof ApiRequestError) {
    return CARD_ERROR_MESSAGES[error.code] ?? messages.cards.errors.unexpected;
  }
  return messages.cards.errors.unexpected;
}

export function moneyLabel(amountMinor: number): string {
  return formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR');
}

export interface CardUsage {
  currentLimitMinor: number | null;
  usedMinor: number;
  availableMinor: number | null;
}

export function usageLabel(usage: CardUsage): string {
  if (usage.currentLimitMinor === null || usage.availableMinor === null) {
    return messages.cards.usedOnly(moneyLabel(usage.usedMinor));
  }
  return messages.cards.usage(
    moneyLabel(usage.usedMinor),
    moneyLabel(usage.availableMinor),
    moneyLabel(usage.currentLimitMinor),
  );
}
