import type { RecurrenceRepository } from '../../src/modules/recurrences/recurrence-repository.ts';
import type { RecurrenceSeries } from '../../src/modules/recurrences/recurrence-series.ts';
import type { TransactionRepository } from '../../src/modules/transactions/transaction-repository.ts';

export function createInMemoryRecurrenceRepository(
  transactions: TransactionRepository,
): RecurrenceRepository & { series: RecurrenceSeries[] } {
  const series: RecurrenceSeries[] = [];
  const occurrenceKeys = new Set<string>();

  return {
    series,
    async create(newSeries) {
      const created: RecurrenceSeries = { ...newSeries, materializedThrough: null, version: 1 };
      series.push(created);
      return { ...created };
    },
    async listForSpace(financialSpaceId) {
      return series.filter((item) => item.financialSpaceId === financialSpaceId);
    },
    async listNeedingMaterialization(financialSpaceId, through) {
      return series.filter(
        (item) =>
          item.financialSpaceId === financialSpaceId &&
          (item.materializedThrough === null || item.materializedThrough < through),
      );
    },
    async lockForMaterialization(financialSpaceId, seriesId) {
      const found = series.find(
        (item) => item.financialSpaceId === financialSpaceId && item.id === seriesId,
      );
      return found === undefined ? null : { ...found };
    },
    async insertOccurrences(target, occurrences) {
      let created = 0;
      for (const occurrence of occurrences) {
        const key = `${target.id}:${occurrence.occurrenceDate}`;
        if (occurrenceKeys.has(key)) {
          continue;
        }
        occurrenceKeys.add(key);
        const transaction = await transactions.create({
          id: occurrence.id,
          financialSpaceId: target.financialSpaceId,
          type: target.type,
          status: 'pending',
          description: target.description,
          amountMinor: target.amountMinor,
          currency: target.currency,
          financialDate: occurrence.financialDate,
          categoryId: target.categoryId,
          subcategoryId: target.subcategoryId,
          createdByUserId: target.createdByUserId,
        });
        Object.assign(transaction, { recurrenceSeriesId: target.id });
        created += 1;
      }
      return created;
    },
    async setMaterializedThrough(seriesId, through) {
      const found = series.find((item) => item.id === seriesId);
      if (
        found !== undefined &&
        (found.materializedThrough === null || found.materializedThrough < through)
      ) {
        found.materializedThrough = through;
      }
    },
  };
}
