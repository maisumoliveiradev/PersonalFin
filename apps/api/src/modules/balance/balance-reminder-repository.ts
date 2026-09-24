import type { BalanceReminderSetting } from '@personalfin/domain';

export interface BalanceReminderRepository {
  find(userId: string, financialSpaceId: string): Promise<BalanceReminderSetting | null>;
  save(userId: string, financialSpaceId: string, setting: BalanceReminderSetting): Promise<void>;
}
