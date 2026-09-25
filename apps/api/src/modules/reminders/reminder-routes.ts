import type {
  ReminderList,
  ReminderSettings as ReminderSettingsResponse,
} from '@personalfin/api-contract';
import { isReminderOffset, isValidFinancialDate, REMINDER_KINDS } from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { DEFAULT_REMINDER_SETTINGS, getReminders } from './reminders.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const todaySchema = z.object({
  today: z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)'),
});
const stageSchema = z.enum(['overdue', 'before-0', 'before-1', 'before-3', 'before-7']);
const dismissalSchema = z.strictObject({
  key: z.string().min(1).max(200),
  stage: stageSchema,
});
const settingsSchema = z.strictObject({
  offsets: z
    .array(z.number().int().refine(isReminderOffset, 'must be 0, 1, 3, or 7'))
    .max(4)
    .transform((offsets) => [...new Set(offsets)].filter(isReminderOffset).sort((a, b) => a - b)),
  kinds: z
    .array(z.enum(REMINDER_KINDS))
    .max(REMINDER_KINDS.length)
    .transform((kinds) => REMINDER_KINDS.filter((kind) => kinds.includes(kind))),
});

export function registerReminderRoutes(server: FastifyInstance, data: DataAccess): void {
  async function resolveSpace(request: Parameters<typeof requireAuthenticatedUser>[0]) {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view',
    );
    return { userId: user.id, spaceId: space.id };
  }

  server.get('/financial-spaces/:spaceId/reminders', async (request): Promise<ReminderList> => {
    const { userId, spaceId } = await resolveSpace(request);
    const { today } = parseInput(todaySchema, request.query);
    return { today, items: await getReminders(data, userId, spaceId, today) };
  });

  server.post('/financial-spaces/:spaceId/reminders/dismissals', async (request, reply) => {
    const { userId, spaceId } = await resolveSpace(request);
    const { key, stage } = parseInput(dismissalSchema, request.body);
    await data.repositories.reminders.dismiss(userId, spaceId, key, stage);
    return reply.status(204).send();
  });

  server.get(
    '/financial-spaces/:spaceId/reminder-settings',
    async (request): Promise<ReminderSettingsResponse> => {
      const { userId, spaceId } = await resolveSpace(request);
      return (
        (await data.repositories.reminders.findSettings(userId, spaceId)) ??
        DEFAULT_REMINDER_SETTINGS
      );
    },
  );

  server.put(
    '/financial-spaces/:spaceId/reminder-settings',
    async (request): Promise<ReminderSettingsResponse> => {
      const { userId, spaceId } = await resolveSpace(request);
      const settings = parseInput(settingsSchema, request.body);
      await data.repositories.reminders.saveSettings(userId, spaceId, settings);
      return settings;
    },
  );
}
