import type { SyncResolution } from '@personalfin/domain';

export type AuditEntityType =
  | 'financial_transaction'
  | 'category'
  | 'recurrence_series'
  | 'card'
  | 'card_invoice'
  | 'card_invoice_payment'
  | 'tag'
  | 'financial_space'
  | 'financial_space_member'
  | 'space_invitation'
  | 'debt'
  | 'debt_payment'
  | 'goal';
export type AuditAction = 'create' | 'update' | 'delete' | 'restore';

export interface AuditContext {
  source: 'offline_sync';
  resolution: SyncResolution;
  baseVersion: number;
}

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
  context?: AuditContext | null;
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
