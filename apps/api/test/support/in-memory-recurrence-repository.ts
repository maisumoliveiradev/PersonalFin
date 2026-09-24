import type { RecurrenceRepository } from '../../src/modules/recurrences/recurrence-repository.ts';
import type { RecurrenceSeries } from '../../src/modules/recurrences/recurrence-series.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';
import type { TransactionRepository } from '../../src/modules/transactions/transaction-repository.ts';

export function createInMemoryRecurrenceRepository(
  transactions: TransactionRepository,
): RecurrenceRepository & { series: RecurrenceSeries[] } {
  const series: RecurrenceSeries[] = [];
  const occurrenceKeys = new Set<string>();
  const occurrenceRows: FinancialTransaction[] = [];

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
        Object.assign(transaction, {
          recurrenceSeriesId: target.id,
          occurrenceDate: occurrence.occurrenceDate,
        });
        occurrenceRows.push(transaction);
        created += 1;
      }
      return created;
    },
    async updateDefaults(target, defaults, endDate) {
      const found = series.find((item) => item.id === target.id);
      if (found === undefined || found.version !== target.version) {
        return null;
      }
      Object.assign(found, defaults, { endDate, version: found.version + 1 });
      return { ...found };
    },
    async listFollowingOccurrences(seriesId, fromOccurrenceDate, inclusive) {
      return occurrenceRows
        .filter(
          (row) =>
            row.recurrenceSeriesId === seriesId &&
            row.occurrenceDate !== null &&
            (inclusive
              ? row.occurrenceDate >= fromOccurrenceDate
              : row.occurrenceDate > fromOccurrenceDate) &&
            row.status === 'pending' &&
            row.deletedAt === null &&
            !row.individuallyModified,
        )
        .map((row) => ({
          id: row.id,
          occurrenceDate: row.occurrenceDate ?? '',
          description: row.description,
          amountMinor: row.amountMinor,
          categoryId: row.category.id,
          subcategoryId: row.subcategory?.id ?? null,
        }));
    },
    async applyDefaultsToOccurrences(ids, defaults) {
      for (const row of occurrenceRows.filter((item) => ids.includes(item.id))) {
        row.description = defaults.description;
        row.amountMinor = defaults.amountMinor;
        row.category = { id: defaults.categoryId, name: row.category.name };
        row.version += 1;
      }
    },
    async softDeleteOccurrences(ids) {
      for (const row of occurrenceRows.filter((item) => ids.includes(item.id))) {
        row.deletedAt = new Date();
        row.version += 1;
      }
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
