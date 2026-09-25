import type { ExperienceProfile, SectionOverrides } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { DashboardPreferenceRepository } from './dashboard-preference-repository.ts';

export function createPostgresDashboardPreferenceRepository(
  db: Queryable,
): DashboardPreferenceRepository {
  return {
    async find(userId, financialSpaceId) {
      const { rows } = await db.query<{ profile: ExperienceProfile; overrides: SectionOverrides }>(
        `SELECT profile, overrides FROM dashboard_preference
         WHERE user_id = $1 AND financial_space_id = $2`,
        [userId, financialSpaceId],
      );
      const [row] = rows;
      return row === undefined ? null : { profile: row.profile, overrides: row.overrides };
    },

    async save(userId, financialSpaceId, preference) {
      await db.query(
        `INSERT INTO dashboard_preference (user_id, financial_space_id, profile, overrides)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (user_id, financial_space_id)
         DO UPDATE SET profile = EXCLUDED.profile, overrides = EXCLUDED.overrides,
           updated_at = now()`,
        [userId, financialSpaceId, preference.profile, JSON.stringify(preference.overrides)],
      );
    },
  };
}
