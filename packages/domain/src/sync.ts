export type SyncFieldValue = string | number | null;

export type SyncFields = Readonly<Record<string, SyncFieldValue>>;

export function changedFields(base: SyncFields, next: SyncFields): string[] {
  return Object.keys(next).filter((field) => (base[field] ?? null) !== (next[field] ?? null));
}
