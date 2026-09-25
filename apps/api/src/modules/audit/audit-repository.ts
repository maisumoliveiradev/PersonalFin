import type { AuditEntityType, AuditEvent, NewAuditEvent } from './audit-event.ts';

export interface AuditHistoryItem extends AuditEvent {
  actorName: string;
}

export interface AuditHistoryPage {
  items: AuditHistoryItem[];
  nextCursor: string | null;
}

export class InvalidAuditCursorError extends Error {
  override name = 'InvalidAuditCursorError';
}

export interface AuditRepository {
  record(event: NewAuditEvent): Promise<void>;
  listForEntity(
    financialSpaceId: string,
    entityType: AuditEntityType,
    entityId: string,
  ): Promise<AuditEvent[]>;
  listForSpace(
    financialSpaceId: string,
    limit: number,
    cursor: string | null,
  ): Promise<AuditHistoryPage>;
}
