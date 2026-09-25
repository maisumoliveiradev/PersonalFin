export const REMINDER_OFFSETS = [0, 1, 3, 7] as const;
export const REMINDER_KINDS = ['transactions', 'invoices', 'debts', 'projection'] as const;
export const DEFAULT_REMINDER_OFFSETS: readonly ReminderOffset[] = [0, 3];

export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export type ReminderStage = 'overdue' | `before-${ReminderOffset}`;

export function isReminderOffset(value: number): value is ReminderOffset {
  return (REMINDER_OFFSETS as readonly number[]).includes(value);
}

export function reminderStage(
  daysUntilDue: number,
  offsets: readonly ReminderOffset[],
): ReminderStage | null {
  if (daysUntilDue < 0) {
    return 'overdue';
  }
  const offset = [...offsets]
    .sort((left, right) => left - right)
    .find((item) => item >= daysUntilDue);
  return offset === undefined ? null : `before-${offset}`;
}

export function reminderWindowDays(offsets: readonly ReminderOffset[]): number {
  return Math.max(0, ...offsets);
}
