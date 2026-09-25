import type { AuditEvent } from '../../src/modules/audit/audit-event.ts';
import {
  type AuditRepository,
  InvalidAuditCursorError,
} from '../../src/modules/audit/audit-repository.ts';
import { ana, bruno } from './users.ts';

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
    async listForSpace(financialSpaceId, limit, cursor) {
      const matching = events
        .filter((event) => event.financialSpaceId === financialSpaceId)
        .reverse();
      const offset = cursor === null ? 0 : Number(cursor);
      if (!Number.isInteger(offset) || offset < 0) {
        throw new InvalidAuditCursorError();
      }
      const page = matching.slice(offset, offset + limit);
      return {
        items: page.map((event) => ({
          ...event,
          actorName: [ana, bruno].find((user) => user.id === event.actorUserId)?.name ?? '',
        })),
        nextCursor: offset + limit < matching.length ? String(offset + limit) : null,
      };
    },
  };
}
