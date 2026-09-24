import type { BalanceReminderFrequency } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { BalanceReminderRepository } from './balance-reminder-repository.ts';

export function createPostgresBalanceReminderRepository(db: Queryable): BalanceReminderRepository {
  return {
    async find(userId, financialSpaceId) {
      const { rows } = await db.query<{
        frequency: BalanceReminderFrequency;
        interval_days: number | null;
      }>(
        `SELECT frequency, interval_days FROM balance_reminder_setting
         WHERE user_id = $1 AND financial_space_id = $2`,
        [userId, financialSpaceId],
      );
      const [row] = rows;
      return row === undefined
        ? null
        : { frequency: row.frequency, intervalDays: row.interval_days };
    },

    async save(userId, financialSpaceId, setting) {
      await db.query(
        `INSERT INTO balance_reminder_setting (user_id, financial_space_id, frequency, interval_days)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, financial_space_id)
         DO UPDATE SET frequency = EXCLUDED.frequency, interval_days = EXCLUDED.interval_days,
           updated_at = now()`,
        [userId, financialSpaceId, setting.frequency, setting.intervalDays],
      );
    },
  };
}
