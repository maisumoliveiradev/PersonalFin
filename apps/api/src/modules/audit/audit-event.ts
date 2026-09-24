export type AuditEntityType = 'financial_transaction';
export type AuditAction = 'update' | 'delete' | 'restore';

export type AuditValue = string | number | boolean | null;

export interface FieldChange {
  before: AuditValue;
  after: AuditValue;
}

export interface NewAuditEvent {
  financialSpaceId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorUserId: string;
  changes: Record<string, FieldChange>;
}

export interface AuditEvent extends NewAuditEvent {
  id: string;
  occurredAt: Date;
}

export function diffFields<Fields extends Record<string, AuditValue>>(
  before: Fields,
  after: Fields,
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const field of Object.keys(before)) {
    const previous = before[field] ?? null;
    const next = after[field] ?? null;
    if (previous !== next) {
      changes[field] = { before: previous, after: next };
    }
  }
  return changes;
}
