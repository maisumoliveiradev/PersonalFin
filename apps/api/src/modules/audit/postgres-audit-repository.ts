import { randomUUID } from 'node:crypto';

import type { Queryable } from '../../database/pool.ts';
import type { AuditAction, AuditEntityType, FieldChange } from './audit-event.ts';
import type { AuditRepository } from './audit-repository.ts';

interface AuditEventRow {
  id: string;
  financial_space_id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  actor_user_id: string;
  occurred_at: Date;
  changes: Record<string, FieldChange>;
}

export function createPostgresAuditRepository(db: Queryable): AuditRepository {
  return {
    async record(event) {
      await db.query(
        `INSERT INTO audit_event (id, financial_space_id, entity_type, entity_id, action, actor_user_id, changes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          event.financialSpaceId,
          event.entityType,
          event.entityId,
          event.action,
          event.actorUserId,
          JSON.stringify(event.changes),
        ],
      );
    },

    async listForEntity(financialSpaceId, entityType, entityId) {
      const { rows } = await db.query<AuditEventRow>(
        `SELECT id, financial_space_id, entity_type, entity_id, action, actor_user_id, occurred_at, changes
         FROM audit_event
         WHERE financial_space_id = $1 AND entity_type = $2 AND entity_id = $3
         ORDER BY occurred_at, id`,
        [financialSpaceId, entityType, entityId],
      );
      return rows.map((row) => ({
        id: row.id,
        financialSpaceId: row.financial_space_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        actorUserId: row.actor_user_id,
        occurredAt: row.occurred_at,
        changes: row.changes,
      }));
    },
  };
}
