import type { AccessibleSpace } from '../financial-spaces/financial-space.ts';

export const BACKUP_FORMAT = 'personalfin-backup';
export const BACKUP_FORMAT_VERSION = 1;

export const SPACE_TABLES = [
  'category',
  'tag',
  'financial_transaction',
  'transaction_tag',
  'recurrence_series',
  'balance_snapshot',
  'card',
  'card_limit_change',
  'card_invoice',
  'card_invoice_payment',
  'card_installment_purchase',
  'debt',
  'debt_payment',
  'goal',
  'goal_progress',
  'import_batch',
  'audit_event',
] as const;

export const PERSONAL_TABLES = [
  'balance_reminder_setting',
  'dashboard_preference',
  'reminder_setting',
  'reminder_dismissal',
] as const;

export type SpaceTable = (typeof SPACE_TABLES)[number];
export type PersonalTable = (typeof PERSONAL_TABLES)[number];
export type BackupRecord = Record<string, unknown>;

export interface BackupRepository {
  spaceTable(table: SpaceTable, financialSpaceId: string): Promise<BackupRecord[]>;
  personalTable(
    table: PersonalTable,
    userId: string,
    financialSpaceId: string,
  ): Promise<BackupRecord[]>;
  globalGoals(userId: string): Promise<{ goals: BackupRecord[]; progress: BackupRecord[] }>;
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  user: { id: string; name: string; email: string };
  spaces: {
    id: string;
    name: string;
    role: 'owner' | 'member';
    permissions: string[];
    tables: Record<string, BackupRecord[]>;
  }[];
  globalGoals: BackupRecord[];
  globalGoalProgress: BackupRecord[];
}

export async function buildBackup(
  repository: BackupRepository,
  user: { id: string; name: string; email: string },
  spaces: readonly AccessibleSpace[],
  exportedAt: Date,
): Promise<Backup> {
  const result: Backup['spaces'] = [];
  for (const space of spaces) {
    const tables: Record<string, BackupRecord[]> = {};
    for (const table of SPACE_TABLES) {
      tables[table] = await repository.spaceTable(table, space.id);
    }
    for (const table of PERSONAL_TABLES) {
      tables[table] = await repository.personalTable(table, user.id, space.id);
    }
    result.push({
      id: space.id,
      name: space.name,
      role: space.access.role,
      permissions: [...space.access.permissions],
      tables,
    });
  }
  const global = await repository.globalGoals(user.id);
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    user,
    spaces: result,
    globalGoals: global.goals,
    globalGoalProgress: global.progress,
  };
}
