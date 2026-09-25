export type SyncFieldValue = string | number | null;

export type SyncFields = Readonly<Record<string, SyncFieldValue>>;

export function changedFields(base: SyncFields, next: SyncFields): string[] {
  return Object.keys(next).filter((field) => (base[field] ?? null) !== (next[field] ?? null));
}

export interface FieldConflict {
  field: string;
  base: SyncFieldValue;
  local: SyncFieldValue;
  server: SyncFieldValue;
}

export type EditReconciliation =
  | { kind: 'apply'; fields: string[] }
  | { kind: 'conflict'; conflicts: FieldConflict[]; independent: string[] };

export function reconcileEdit(
  base: SyncFields,
  local: SyncFields,
  server: SyncFields,
): EditReconciliation {
  const independent: string[] = [];
  const conflicts: FieldConflict[] = [];
  for (const field of Object.keys(local)) {
    const localValue = local[field] ?? null;
    const serverValue = server[field] ?? null;
    const baseValue = base[field] ?? null;
    if (localValue === serverValue) {
      continue;
    }
    if (serverValue === baseValue) {
      independent.push(field);
    } else {
      conflicts.push({ field, base: baseValue, local: localValue, server: serverValue });
    }
  }
  return conflicts.length === 0
    ? { kind: 'apply', fields: independent }
    : { kind: 'conflict', conflicts, independent };
}

export function serverChanges(base: SyncFields, server: SyncFields): FieldConflict[] {
  return changedFields(base, server).map((field) => ({
    field,
    base: base[field] ?? null,
    local: null,
    server: server[field] ?? null,
  }));
}

export const SYNC_RESOLUTIONS = [
  'auto_merged',
  'chose_fields',
  'restored',
  'deleted_anyway',
] as const;

export type SyncResolution = (typeof SYNC_RESOLUTIONS)[number];
