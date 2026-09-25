import {
  type CurrencyCode,
  convertToBase,
  DEFAULT_CURRENCY,
  type FinancialDate,
  isValidRate,
  normalizeRate,
} from '@personalfin/domain';

import type { Repositories } from '../../database/data-access.ts';
import type { OriginalAmount } from '../transactions/transaction.ts';
import { ExchangeRateRequiredError, ForeignAmountError } from './exchange-rate.ts';

export interface ForeignAmountInput {
  currency: CurrencyCode;
  amountMinor: number;
  rate?: string | undefined;
}

export async function resolveForeignAmount(
  repositories: Repositories,
  financialSpaceId: string,
  input: ForeignAmountInput,
  onDate: FinancialDate,
): Promise<{ amountMinor: number; original: OriginalAmount }> {
  if (input.currency === DEFAULT_CURRENCY) {
    throw new ForeignAmountError(
      'FOREIGN_CURRENCY_IS_BASE',
      'Use the base currency amount directly for base-currency transactions',
    );
  }
  let rate: string;
  if (input.rate === undefined) {
    const known = await repositories.exchangeRates.latest(financialSpaceId, input.currency, onDate);
    if (known === null) {
      throw new ExchangeRateRequiredError();
    }
    rate = known.rate;
  } else {
    if (!isValidRate(input.rate)) {
      throw new ForeignAmountError('EXCHANGE_RATE_INVALID', 'The exchange rate is invalid');
    }
    rate = normalizeRate(input.rate);
  }
  const converted = convertToBase(input.amountMinor, input.currency, rate, DEFAULT_CURRENCY);
  if (!converted.ok) {
    throw new ForeignAmountError(
      converted.error === 'zero' ? 'CONVERTED_AMOUNT_ZERO' : 'CONVERTED_AMOUNT_TOO_LARGE',
      'The converted amount is out of range',
    );
  }
  return {
    amountMinor: converted.amountMinor,
    original: {
      currency: input.currency,
      amountMinor: input.amountMinor,
      rate,
      rateSource: 'manual',
    },
  };
}
