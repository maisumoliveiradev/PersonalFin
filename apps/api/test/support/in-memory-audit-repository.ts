import type { AuditEvent } from '../../src/modules/audit/audit-event.ts';
import type { AuditRepository } from '../../src/modules/audit/audit-repository.ts';

export function createInMemoryAuditRepository(): AuditRepository & { events: AuditEvent[] } {
  const events: AuditEvent[] = [];
  return {
    events,
    async record(event) {
      events.push({ ...event, id: `audit-${events.length + 1}`, occurredAt: new Date() });
    },
    async listForEntity(financialSpaceId, entityType, entityId) {
      return events.filter(
        (event) =>
          event.financialSpaceId === financialSpaceId &&
          event.entityType === entityType &&
          event.entityId === entityId,
      );
    },
  };
}
