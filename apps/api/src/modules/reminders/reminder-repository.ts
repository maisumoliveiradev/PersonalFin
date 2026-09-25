import type { ReminderKind, ReminderOffset, ReminderStage } from '@personalfin/domain';

export interface ReminderSettings {
  offsets: ReminderOffset[];
  kinds: ReminderKind[];
}

export interface ReminderRepository {
  findSettings(userId: string, financialSpaceId: string): Promise<ReminderSettings | null>;
  saveSettings(userId: string, financialSpaceId: string, settings: ReminderSettings): Promise<void>;
  listDismissals(userId: string, financialSpaceId: string): Promise<Set<string>>;
  dismiss(
    userId: string,
    financialSpaceId: string,
    reminderKey: string,
    stage: ReminderStage,
  ): Promise<void>;
}

export function dismissalKey(reminderKey: string, stage: ReminderStage): string {
  return `${stage}|${reminderKey}`;
}
