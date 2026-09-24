import type { AuditEntityType, AuditEvent, NewAuditEvent } from './audit-event.ts';

export interface AuditRepository {
  record(event: NewAuditEvent): Promise<void>;
  listForEntity(
    financialSpaceId: string,
    entityType: AuditEntityType,
    entityId: string,
  ): Promise<AuditEvent[]>;
}
