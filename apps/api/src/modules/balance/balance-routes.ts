import { randomUUID } from 'node:crypto';

import type {
  BalanceReminder,
  BalanceSnapshotList,
  BalanceSnapshot as BalanceSnapshotResponse,
} from '@personalfin/api-contract';
import {
  BALANCE_REMINDER_FREQUENCIES,
  type BalanceReminderSetting,
  DEFAULT_BALANCE_REMINDER,
  DEFAULT_CURRENCY,
  isValidBalanceMinor,
  isValidBalanceReminder,
  isValidFinancialDate,
  MAX_AMOUNT_MINOR,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { BALANCE_NOTE_MAX_LENGTH, type BalanceSnapshot } from './balance-snapshot.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });

const recordSnapshotSchema = z.strictObject({
  amountMinor: z
    .number()
    .refine(
      isValidBalanceMinor,
      `must be an integer between -${MAX_AMOUNT_MINOR} and ${MAX_AMOUNT_MINOR}`,
    ),
  observedOn: z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)'),
  note: z
    .string()
    .trim()
    .max(BALANCE_NOTE_MAX_LENGTH)
    .transform((note) => (note === '' ? null : note))
    .nullable()
    .optional(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const reminderSchema = z
  .strictObject({
    frequency: z.enum(BALANCE_REMINDER_FREQUENCIES),
    intervalDays: z.number().int().nullable(),
  })
  .refine(isValidBalanceReminder, {
    message: 'intervalDays must be 1 to 90 for every_n_days and null otherwise',
  });

function toReminderResponse(setting: BalanceReminderSetting, isDefault: boolean): BalanceReminder {
  return { frequency: setting.frequency, intervalDays: setting.intervalDays, isDefault };
}

function toResponse(snapshot: BalanceSnapshot): BalanceSnapshotResponse {
  return {
    id: snapshot.id,
    amountMinor: snapshot.amountMinor,
    currency: snapshot.currency,
    observedOn: snapshot.observedOn,
    note: snapshot.note,
    recordedAt: snapshot.recordedAt.toISOString(),
  };
}

export function registerBalanceRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get(
    '/financial-spaces/:spaceId/balance-snapshots',
    async (request): Promise<BalanceSnapshotList> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const { limit } = parseInput(listQuerySchema, request.query);
      const snapshots = await data.repositories.balanceSnapshots.listForSpace(space.id, limit + 1);
      const items = snapshots.slice(0, limit).map(toResponse);
      return { items, current: items[0] ?? null, hasMore: snapshots.length > limit };
    },
  );

  server.get(
    '/financial-spaces/:spaceId/balance-reminder',
    async (request): Promise<BalanceReminder> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const setting = await data.repositories.balanceReminders.find(user.id, space.id);
      return setting === null
        ? toReminderResponse(DEFAULT_BALANCE_REMINDER, true)
        : toReminderResponse(setting, false);
    },
  );

  server.put(
    '/financial-spaces/:spaceId/balance-reminder',
    async (request): Promise<BalanceReminder> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const setting = parseInput(reminderSchema, request.body);
      await data.repositories.balanceReminders.save(user.id, space.id, setting);
      return toReminderResponse(setting, false);
    },
  );

  server.post(
    '/financial-spaces/:spaceId/balance-snapshots',
    async (request, reply): Promise<BalanceSnapshotResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const input = parseInput(recordSnapshotSchema, request.body);
      const snapshot = await data.repositories.balanceSnapshots.record({
        id: randomUUID(),
        financialSpaceId: space.id,
        amountMinor: input.amountMinor,
        currency: DEFAULT_CURRENCY,
        observedOn: input.observedOn,
        note: input.note ?? null,
        recordedByUserId: user.id,
      });
      reply.status(201);
      return toResponse(snapshot);
    },
  );
}
