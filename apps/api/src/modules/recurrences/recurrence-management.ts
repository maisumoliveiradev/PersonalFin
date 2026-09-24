import { randomUUID } from 'node:crypto';

import {
  DEFAULT_CURRENCY,
  type FinancialDate,
  type Month,
  maxMaterializationEnd,
  type NonBusinessDayRule,
  occurrencesThrough,
  type RecurrenceFrequency,
  type TransactionType,
} from '@personalfin/domain';

import type { DataAccess, Repositories } from '../../database/data-access.ts';
import { NotFoundError, ValidationError } from '../../http/errors.ts';
import { diffFields } from '../audit/audit-event.ts';
import { assertCategorySelection } from '../transactions/category-selection.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import type { RecurrenceSeries, SeriesDefaults } from './recurrence-series.ts';

export class RecurrenceNotFoundError extends NotFoundError {
  constructor() {
    super('RECURRENCE_NOT_FOUND', 'Recurring series not found');
  }
}

async function lockSeries(
  repositories: Repositories,
  financialSpaceId: string,
  seriesId: string,
  expectedVersion: number,
): Promise<RecurrenceSeries> {
  const series = await repositories.recurrences.lockForMaterialization(financialSpaceId, seriesId);
  if (series === null) {
    throw new RecurrenceNotFoundError();
  }
  if (series.version !== expectedVersion) {
    throw new VersionConflictError();
  }
  return series;
}

function defaultsOf(value: SeriesDefaults): SeriesDefaults {
  return {
    description: value.description,
    amountMinor: value.amountMinor,
    categoryId: value.categoryId,
    subcategoryId: value.subcategoryId,
  };
}

export interface UpdateSeriesInput {
  financialSpaceId: string;
  seriesId: string;
  actorUserId: string;
  expectedVersion: number;
  fromOccurrenceDate: FinancialDate;
  changes: Partial<SeriesDefaults>;
}

export async function updateSeriesFrom(
  data: DataAccess,
  input: UpdateSeriesInput,
): Promise<{ series: RecurrenceSeries; occurrencesUpdated: number }> {
  return data.transaction(async (repositories) => {
    const series = await lockSeries(
      repositories,
      input.financialSpaceId,
      input.seriesId,
      input.expectedVersion,
    );
    const before = defaultsOf(series);
    const after: SeriesDefaults = { ...before, ...input.changes };
    const changes = diffFields({ ...before }, { ...after });
    if (Object.keys(changes).length === 0) {
      return { series, occurrencesUpdated: 0 };
    }
    await assertCategorySelection(repositories.categories, {
      financialSpaceId: input.financialSpaceId,
      type: series.type,
      categoryId: after.categoryId,
      subcategoryId: after.subcategoryId,
    });
    const updated = await repositories.recurrences.updateDefaults(series, after, series.endDate);
    if (updated === null) {
      throw new VersionConflictError();
    }
    const occurrences = await repositories.recurrences.listFollowingOccurrences(
      series.id,
      input.fromOccurrenceDate,
      true,
    );
    await repositories.recurrences.applyDefaultsToOccurrences(
      occurrences.map((occurrence) => occurrence.id),
      after,
      input.actorUserId,
    );
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'recurrence_series',
      entityId: series.id,
      action: 'update',
      actorUserId: input.actorUserId,
      changes: {
        ...changes,
        fromOccurrenceDate: { before: null, after: input.fromOccurrenceDate },
      },
    });
    for (const occurrence of occurrences) {
      const occurrenceChanges = diffFields({ ...defaultsOf(occurrence) }, { ...after });
      if (Object.keys(occurrenceChanges).length > 0) {
        await repositories.audit.record({
          financialSpaceId: input.financialSpaceId,
          entityType: 'financial_transaction',
          entityId: occurrence.id,
          action: 'update',
          actorUserId: input.actorUserId,
          changes: occurrenceChanges,
        });
      }
    }
    return { series: updated, occurrencesUpdated: occurrences.length };
  });
}

export interface EndSeriesInput {
  financialSpaceId: string;
  seriesId: string;
  actorUserId: string;
  expectedVersion: number;
  endDate: FinancialDate;
}

export async function endSeries(
  data: DataAccess,
  input: EndSeriesInput,
): Promise<{ series: RecurrenceSeries; occurrencesRemoved: number }> {
  return data.transaction(async (repositories) => {
    const series = await lockSeries(
      repositories,
      input.financialSpaceId,
      input.seriesId,
      input.expectedVersion,
    );
    if (input.endDate < series.startDate) {
      throw new ValidationError('endDate: must not be before the series start date');
    }
    const updated = await repositories.recurrences.updateDefaults(
      series,
      defaultsOf(series),
      input.endDate,
    );
    if (updated === null) {
      throw new VersionConflictError();
    }
    const occurrences = await repositories.recurrences.listFollowingOccurrences(
      series.id,
      input.endDate,
      false,
    );
    await repositories.recurrences.softDeleteOccurrences(
      occurrences.map((occurrence) => occurrence.id),
      input.actorUserId,
    );
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'recurrence_series',
      entityId: series.id,
      action: 'update',
      actorUserId: input.actorUserId,
      changes: { endDate: { before: series.endDate, after: input.endDate } },
    });
    for (const occurrence of occurrences) {
      await repositories.audit.record({
        financialSpaceId: input.financialSpaceId,
        entityType: 'financial_transaction',
        entityId: occurrence.id,
        action: 'delete',
        actorUserId: input.actorUserId,
        changes: { reason: { before: null, after: 'series_ended' } },
      });
    }
    return { series: updated, occurrencesRemoved: occurrences.length };
  });
}

export interface CreateRecurrenceInput {
  financialSpaceId: string;
  actorUserId: string;
  type: TransactionType;
  description: string;
  amountMinor: number;
  categoryId: string;
  subcategoryId: string | null;
  frequency: RecurrenceFrequency;
  nonBusinessDayRule: NonBusinessDayRule;
  startDate: FinancialDate;
  endDate: FinancialDate | null;
  materializeThrough: FinancialDate;
}

async function materializeLocked(
  repositories: Repositories,
  series: RecurrenceSeries,
  through: FinancialDate,
): Promise<number> {
  if (series.materializedThrough !== null && series.materializedThrough >= through) {
    return 0;
  }
  const occurrences = occurrencesThrough(series, through)
    .filter(
      (occurrence) =>
        series.materializedThrough === null ||
        occurrence.occurrenceDate > series.materializedThrough,
    )
    .map((occurrence) => ({ id: randomUUID(), seriesId: series.id, ...occurrence }));
  const created = await repositories.recurrences.insertOccurrences(series, occurrences);
  await repositories.recurrences.setMaterializedThrough(series.id, through);
  return created;
}

export async function createRecurrenceSeries(
  data: DataAccess,
  input: CreateRecurrenceInput,
): Promise<{ series: RecurrenceSeries; occurrencesCreated: number }> {
  if (input.endDate !== null && input.endDate < input.startDate) {
    throw new ValidationError('endDate: must not be before startDate');
  }
  return data.transaction(async (repositories) => {
    await assertCategorySelection(repositories.categories, input);
    const series = await repositories.recurrences.create({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      type: input.type,
      description: input.description,
      amountMinor: input.amountMinor,
      currency: DEFAULT_CURRENCY,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      frequency: input.frequency,
      nonBusinessDayRule: input.nonBusinessDayRule,
      startDate: input.startDate,
      endDate: input.endDate,
      createdByUserId: input.actorUserId,
    });
    const occurrencesCreated = await materializeLocked(
      repositories,
      series,
      input.materializeThrough,
    );
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'recurrence_series',
      entityId: series.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: {
        description: { before: null, after: series.description },
        amountMinor: { before: null, after: series.amountMinor },
        frequency: { before: null, after: series.frequency },
        startDate: { before: null, after: series.startDate },
        endDate: { before: null, after: series.endDate },
      },
    });
    return {
      series: { ...series, materializedThrough: input.materializeThrough },
      occurrencesCreated,
    };
  });
}

export async function materializeSpace(
  data: DataAccess,
  financialSpaceId: string,
  through: FinancialDate,
  currentMonth: Month,
): Promise<number> {
  const limit = maxMaterializationEnd(currentMonth);
  const target = through > limit ? limit : through;
  const pending = await data.repositories.recurrences.listNeedingMaterialization(
    financialSpaceId,
    target,
  );
  let created = 0;
  for (const candidate of pending) {
    created += await data.transaction(async (repositories) => {
      const series = await repositories.recurrences.lockForMaterialization(
        financialSpaceId,
        candidate.id,
      );
      return series === null ? 0 : materializeLocked(repositories, series, target);
    });
  }
  return created;
}
