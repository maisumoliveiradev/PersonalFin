import type {
  DashboardPreference,
  DashboardPreferenceRepository,
} from '../../src/modules/preferences/dashboard-preference-repository.ts';

export function createInMemoryDashboardPreferenceRepository(): DashboardPreferenceRepository {
  const preferences = new Map<string, DashboardPreference>();
  return {
    async find(userId, financialSpaceId) {
      return preferences.get(`${userId}:${financialSpaceId}`) ?? null;
    },
    async save(userId, financialSpaceId, preference) {
      preferences.set(`${userId}:${financialSpaceId}`, preference);
    },
  };
}
