import type { ReminderKind, ReminderOffset, ReminderStage } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import { dismissalKey, type ReminderRepository } from './reminder-repository.ts';

export function createPostgresReminderRepository(db: Queryable): ReminderRepository {
  return {
    async findSettings(userId, financialSpaceId) {
      const { rows } = await db.query<{ offsets: number[]; kinds: string[] }>(
        `SELECT offsets, kinds FROM reminder_setting
         WHERE user_id = $1 AND financial_space_id = $2`,
        [userId, financialSpaceId],
      );
      const [row] = rows;
      return row === undefined
        ? null
        : { offsets: row.offsets as ReminderOffset[], kinds: row.kinds as ReminderKind[] };
    },

    async saveSettings(userId, financialSpaceId, settings) {
      await db.query(
        `INSERT INTO reminder_setting (user_id, financial_space_id, offsets, kinds)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, financial_space_id)
         DO UPDATE SET offsets = EXCLUDED.offsets, kinds = EXCLUDED.kinds, updated_at = now()`,
        [userId, financialSpaceId, settings.offsets, settings.kinds],
      );
    },

    async listDismissals(userId, financialSpaceId) {
      const { rows } = await db.query<{ reminder_key: string; stage: ReminderStage }>(
        `SELECT reminder_key, stage FROM reminder_dismissal
         WHERE user_id = $1 AND financial_space_id = $2`,
        [userId, financialSpaceId],
      );
      return new Set(rows.map((row) => dismissalKey(row.reminder_key, row.stage)));
    },

    async dismiss(userId, financialSpaceId, reminderKey, stage) {
      await db.query(
        `INSERT INTO reminder_dismissal (user_id, financial_space_id, reminder_key, stage)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, financialSpaceId, reminderKey, stage],
      );
    },
  };
}
