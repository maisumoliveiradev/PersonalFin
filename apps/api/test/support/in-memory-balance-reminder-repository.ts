import type { BalanceReminderSetting } from '@personalfin/domain';

import type { BalanceReminderRepository } from '../../src/modules/balance/balance-reminder-repository.ts';

export function createInMemoryBalanceReminderRepository(): BalanceReminderRepository & {
  settings: Map<string, BalanceReminderSetting>;
} {
  const settings = new Map<string, BalanceReminderSetting>();
  return {
    settings,
    async find(userId, financialSpaceId) {
      return settings.get(`${userId}:${financialSpaceId}`) ?? null;
    },
    async save(userId, financialSpaceId, setting) {
      settings.set(`${userId}:${financialSpaceId}`, setting);
    },
  };
}
