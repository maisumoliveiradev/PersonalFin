import { GOAL_NAME_MAX_LENGTH, parseAmountInput, parseDisplayDate } from '@personalfin/domain';

import { ApiRequestError } from '../../api/api-client';
import { messages } from '../../i18n/messages';
import type { Parsed } from '../cards/card-form';
import { parseAmount } from '../debts/debt-form';

export function parseGoalForm(input: {
  name: string;
  target: string;
  targetDate: string;
}): Parsed<{ name: string; targetAmountMinor: number; targetDate: string | null }> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') {
    return { ok: false, error: messages.goals.errors.nameRequired };
  }
  if (name.length > GOAL_NAME_MAX_LENGTH) {
    return { ok: false, error: messages.goals.errors.nameTooLong };
  }
  const target = parseAmount(input.target);
  if (!target.ok) {
    return target;
  }
  let targetDate: string | null = null;
  if (input.targetDate.trim() !== '') {
    targetDate = parseDisplayDate(input.targetDate, 'pt-BR');
    if (targetDate === null) {
      return { ok: false, error: messages.transactions.errors.dateInvalid };
    }
  }
  return { ok: true, value: { name, targetAmountMinor: target.value, targetDate } };
}

export function parseAccumulated(value: string): Parsed<number> {
  const trimmed = value.trim();
  if (/^0+(,0{1,2})?$/.test(trimmed)) {
    return { ok: true, value: 0 };
  }
  const parsed = parseAmountInput(trimmed, 'BRL', 'pt-BR');
  return parsed.ok
    ? { ok: true, value: parsed.amountMinor }
    : { ok: false, error: messages.transactions.errors.amountInvalid };
}

export function describeGoalError(error: Error | null): string | null {
  if (error === null) {
    return null;
  }
  if (error instanceof ApiRequestError && error.code === 'VERSION_CONFLICT') {
    return messages.goals.errors.conflict;
  }
  if (error instanceof ApiRequestError && error.code === 'PERMISSION_DENIED') {
    return messages.common.permissionDenied;
  }
  return messages.goals.errors.unexpected;
}
