import type { CurrencyCode, FinancialDate } from '@personalfin/domain';

import { AppError } from '../../http/errors.ts';
import type { RateSource } from '../transactions/transaction.ts';

export interface ExchangeRate {
  id: string;
  financialSpaceId: string;
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  rateDate: FinancialDate;
  rate: string;
  source: RateSource;
  recordedAt: Date;
}

export interface ExchangeRateRepository {
  list(financialSpaceId: string, currency?: CurrencyCode): Promise<ExchangeRate[]>;
  record(
    rate: Omit<ExchangeRate, 'recordedAt'> & { recordedByUserId: string | null },
  ): Promise<ExchangeRate>;
  latest(
    financialSpaceId: string,
    currency: CurrencyCode,
    onDate: FinancialDate,
  ): Promise<ExchangeRate | null>;
}

export class ExchangeRateRequiredError extends AppError {
  override name = 'ExchangeRateRequiredError';

  constructor() {
    super(
      422,
      'EXCHANGE_RATE_REQUIRED',
      'No exchange rate is known on or before this date; provide one',
    );
  }
}

export class ForeignAmountError extends AppError {
  override name = 'ForeignAmountError';

  constructor(code: string, message: string) {
    super(422, code, message);
  }
}
