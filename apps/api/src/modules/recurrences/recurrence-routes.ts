import type {
  RecurrenceSeriesChanged,
  RecurrenceSeriesCreated,
  RecurrenceSeriesList,
  RecurrenceSeries as RecurrenceSeriesResponse,
} from '@personalfin/api-contract';
import {
  defaultMaterializationEnd,
  isValidAmountMinor,
  isValidFinancialDate,
  isValidMonth,
  lastDayOf,
  MAX_AMOUNT_MINOR,
  type Month,
  monthOf,
  NON_BUSINESS_DAY_RULES,
  normalizeTransactionDescription,
  RECURRENCE_FREQUENCIES,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_TYPES,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import {
  createRecurrenceSeries,
  endSeries,
  materializeSpace,
  RecurrenceNotFoundError,
  updateSeriesFrom,
} from './recurrence-management.ts';
import type { RecurrenceSeries } from './recurrence-series.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const financialDateSchema = z
  .string()
  .refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)');

const createRecurrenceSchema = z.strictObject({
  type: z.enum(TRANSACTION_TYPES),
  description: z
    .string()
    .transform(normalizeTransactionDescription)
    .pipe(z.string().min(1).max(TRANSACTION_DESCRIPTION_MAX_LENGTH)),
  amountMinor: z
    .number()
    .refine(isValidAmountMinor, `must be an integer between 1 and ${MAX_AMOUNT_MINOR}`),
  categoryId: z.uuid(),
  subcategoryId: z.uuid().nullable().optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  nonBusinessDayRule: z.enum(NON_BUSINESS_DAY_RULES),
  startDate: financialDateSchema,
  endDate: financialDateSchema.nullable().optional(),
});

const seriesParamsSchema = z.object({ spaceId: z.string(), seriesId: z.string() });

const updateSeriesSchema = z.strictObject({
  version: z.number().int().min(1),
  fromOccurrenceDate: financialDateSchema,
  description: z
    .string()
    .transform(normalizeTransactionDescription)
    .pipe(z.string().min(1).max(TRANSACTION_DESCRIPTION_MAX_LENGTH))
    .optional(),
  amountMinor: z
    .number()
    .refine(isValidAmountMinor, `must be an integer between 1 and ${MAX_AMOUNT_MINOR}`)
    .optional(),
  categoryId: z.uuid().optional(),
  subcategoryId: z.uuid().nullable().optional(),
});

const endSeriesSchema = z.strictObject({
  version: z.number().int().min(1),
  endDate: financialDateSchema,
});

function requireSeriesId(seriesId: string): string {
  if (!isUuid(seriesId)) {
    throw new RecurrenceNotFoundError();
  }
  return seriesId;
}

const materializeSchema = z.strictObject({
  throughMonth: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)'),
});

function serverCurrentMonth(): Month {
  return monthOf(new Date().toISOString().slice(0, 10));
}

function toResponse(series: RecurrenceSeries): RecurrenceSeriesResponse {
  return {
    id: series.id,
    type: series.type,
    description: series.description,
    amountMinor: series.amountMinor,
    currency: series.currency,
    categoryId: series.categoryId,
    subcategoryId: series.subcategoryId,
    frequency: series.frequency,
    nonBusinessDayRule: series.nonBusinessDayRule,
    startDate: series.startDate,
    endDate: series.endDate,
    materializedThrough: series.materializedThrough,
    version: series.version,
  };
}

export function registerRecurrenceRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get(
    '/financial-spaces/:spaceId/recurrences',
    async (request): Promise<RecurrenceSeriesList> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'view',
      );
      const series = await data.repositories.recurrences.listForSpace(space.id);
      return { items: series.map(toResponse) };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/recurrences',
    async (request, reply): Promise<RecurrenceSeriesCreated> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'plan',
      );
      const input = parseInput(createRecurrenceSchema, request.body);
      const { series, occurrencesCreated } = await createRecurrenceSeries(data, {
        financialSpaceId: space.id,
        actorUserId: user.id,
        type: input.type,
        description: input.description,
        amountMinor: input.amountMinor,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId ?? null,
        frequency: input.frequency,
        nonBusinessDayRule: input.nonBusinessDayRule,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        materializeThrough: defaultMaterializationEnd(serverCurrentMonth()),
      });
      reply.status(201);
      return { series: toResponse(series), occurrencesCreated };
    },
  );

  server.patch(
    '/financial-spaces/:spaceId/recurrences/:seriesId',
    async (request): Promise<RecurrenceSeriesChanged> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(seriesParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
        'plan',
      );
      const { version, fromOccurrenceDate, ...changes } = parseInput(
        updateSeriesSchema,
        request.body,
      );
      const result = await updateSeriesFrom(data, {
        financialSpaceId: space.id,
        seriesId: requireSeriesId(params.seriesId),
        actorUserId: user.id,
        expectedVersion: version,
        fromOccurrenceDate,
        changes: Object.fromEntries(
          Object.entries(changes).filter(([, value]) => value !== undefined),
        ),
      });
      return { series: toResponse(result.series), occurrencesAffected: result.occurrencesUpdated };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/recurrences/:seriesId/end',
    async (request): Promise<RecurrenceSeriesChanged> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(seriesParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
        'plan',
      );
      const { version, endDate } = parseInput(endSeriesSchema, request.body);
      const result = await endSeries(data, {
        financialSpaceId: space.id,
        seriesId: requireSeriesId(params.seriesId),
        actorUserId: user.id,
        expectedVersion: version,
        endDate,
      });
      return { series: toResponse(result.series), occurrencesAffected: result.occurrencesRemoved };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/recurrences/materialize',
    async (request): Promise<{ occurrencesCreated: number }> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'view',
      );
      const { throughMonth } = parseInput(materializeSchema, request.body);
      const occurrencesCreated = await materializeSpace(
        data,
        space.id,
        lastDayOf(throughMonth),
        serverCurrentMonth(),
      );
      return { occurrencesCreated };
    },
  );
}
