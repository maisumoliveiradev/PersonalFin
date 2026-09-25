import {
  dismissalKey,
  type ReminderRepository,
  type ReminderSettings,
} from '../../src/modules/reminders/reminder-repository.ts';

export function createInMemoryReminderRepository(): ReminderRepository {
  const settings = new Map<string, ReminderSettings>();
  const dismissals = new Map<string, Set<string>>();
  return {
    async findSettings(userId, financialSpaceId) {
      return settings.get(`${userId}:${financialSpaceId}`) ?? null;
    },
    async saveSettings(userId, financialSpaceId, value) {
      settings.set(`${userId}:${financialSpaceId}`, value);
    },
    async listDismissals(userId, financialSpaceId) {
      return new Set(dismissals.get(`${userId}:${financialSpaceId}`));
    },
    async dismiss(userId, financialSpaceId, reminderKey, stage) {
      const key = `${userId}:${financialSpaceId}`;
      const set = dismissals.get(key) ?? new Set<string>();
      set.add(dismissalKey(reminderKey, stage));
      dismissals.set(key, set);
    },
  };
}
