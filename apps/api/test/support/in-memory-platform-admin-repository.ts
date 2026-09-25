import type {
  PlatformAdminRepository,
  PlatformOverview,
} from '../../src/modules/admin/platform-admin.ts';

export function createInMemoryPlatformAdminRepository(): PlatformAdminRepository & {
  admins: Set<string>;
} {
  const admins = new Set<string>();
  const overview: PlatformOverview = {
    users: { total: 2, createdLast30Days: 2, activeLast30Days: 1 },
    spaces: { total: 1, shared: 0, createdLast30Days: 1 },
    transactions: { total: 0, createdLast30Days: 0 },
    featureAdoption: {
      cards: 0,
      recurrences: 0,
      debts: 0,
      goals: 0,
      imports: 0,
      attachments: 0,
      foreignCurrency: 0,
      tags: 0,
    },
    database: { migrations: 29, latestMigration: '0029_platform_admin' },
  };
  return {
    admins,
    async isPlatformAdmin(userId) {
      return admins.has(userId);
    },
    async overview() {
      return overview;
    },
  };
}
