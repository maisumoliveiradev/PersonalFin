import { randomUUID } from 'node:crypto';

import type { Queryable } from '../../database/pool.ts';
import type { AuditAction, AuditContext, AuditEntityType, FieldChange } from './audit-event.ts';
import { type AuditRepository, InvalidAuditCursorError } from './audit-repository.ts';

const CURSOR_PART = /^[0-9A-Za-z:.-]+$/;

function decodeCursor(cursor: string): [string, string] {
  let keys: unknown;
  try {
    keys = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidAuditCursorError();
  }
  if (
    !Array.isArray(keys) ||
    keys.length !== 2 ||
    !keys.every((key) => typeof key === 'string' && CURSOR_PART.test(key))
  ) {
    throw new InvalidAuditCursorError();
  }
  return [keys[0], keys[1]];
}

interface AuditEventRow {
  id: string;
  financial_space_id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  actor_user_id: string;
  occurred_at: Date;
  changes: Record<string, FieldChange>;
  context: AuditContext | null;
}

export function createPostgresAuditRepository(db: Queryable): AuditRepository {
  return {
    async record(event) {
      await db.query(
        `INSERT INTO audit_event (id, financial_space_id, entity_type, entity_id, action, actor_user_id, changes, context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          event.financialSpaceId,
          event.entityType,
          event.entityId,
          event.action,
          event.actorUserId,
          JSON.stringify(event.changes),
          event.context == null ? null : JSON.stringify(event.context),
        ],
      );
    },

    async listForEntity(financialSpaceId, entityType, entityId) {
      const { rows } = await db.query<AuditEventRow>(
        `SELECT id, financial_space_id, entity_type, entity_id, action, actor_user_id, occurred_at, changes, context
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
        context: row.context,
      }));
    },

    async listForSpace(financialSpaceId, limit, cursor) {
      const values: unknown[] = [financialSpaceId];
      let condition = '';
      if (cursor !== null) {
        const [occurredAt, id] = decodeCursor(cursor);
        values.push(occurredAt, id);
        condition = 'AND (a.occurred_at, a.id) < ($2::timestamptz, $3::uuid)';
      }
      values.push(limit + 1);
      const { rows } = await db.query<AuditEventRow & { actor_name: string; cursor_at: string }>(
        `SELECT a.id, a.financial_space_id, a.entity_type, a.entity_id, a.action, a.actor_user_id,
                a.occurred_at, a.changes, a.context, u.name AS actor_name,
                to_char(a.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at
         FROM audit_event a JOIN "user" u ON u.id = a.actor_user_id
         WHERE a.financial_space_id = $1 ${condition}
         ORDER BY a.occurred_at DESC, a.id DESC
         LIMIT $${values.length}`,
        values,
      );
      const page = rows.slice(0, limit);
      const last = page.at(-1);
      return {
        items: page.map((row) => ({
          id: row.id,
          financialSpaceId: row.financial_space_id,
          entityType: row.entity_type,
          entityId: row.entity_id,
          action: row.action,
          actorUserId: row.actor_user_id,
          actorName: row.actor_name,
          occurredAt: row.occurred_at,
          changes: row.changes,
          context: row.context,
        })),
        nextCursor:
          rows.length > limit && last !== undefined
            ? Buffer.from(JSON.stringify([last.cursor_at, last.id])).toString('base64url')
            : null,
      };
    },
  };
}
