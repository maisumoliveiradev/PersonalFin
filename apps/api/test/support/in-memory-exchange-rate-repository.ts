import type {
  ExchangeRate,
  ExchangeRateRepository,
} from '../../src/modules/exchange-rates/exchange-rate.ts';

export function createInMemoryExchangeRateRepository(): ExchangeRateRepository {
  const rates: ExchangeRate[] = [];
  const newestFirst = (left: ExchangeRate, right: ExchangeRate) =>
    right.rateDate.localeCompare(left.rateDate) ||
    right.recordedAt.getTime() - left.recordedAt.getTime();
  return {
    async list(financialSpaceId, currency) {
      return rates
        .filter(
          (rate) =>
            rate.financialSpaceId === financialSpaceId &&
            (currency === undefined || rate.currency === currency),
        )
        .sort(newestFirst);
    },
    async record({ recordedByUserId: _recordedBy, ...rate }) {
      const created = { ...rate, recordedAt: new Date(Date.UTC(2026, 0, 1, 12, 0, rates.length)) };
      rates.push(created);
      return created;
    },
    async latest(financialSpaceId, currency, onDate) {
      return (
        rates
          .filter(
            (rate) =>
              rate.financialSpaceId === financialSpaceId &&
              rate.currency === currency &&
              rate.rateDate <= onDate,
          )
          .sort(newestFirst)[0] ?? null
      );
    },
  };
}
