import { randomUUID } from 'node:crypto';

import type { SpacePermission } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import {
  type AccessibleSpace,
  type FinancialSpace,
  type FinancialSpaceLifecycleState,
  OWNER_ACCESS,
} from './financial-space.ts';
import type { FinancialSpaceRepository } from './financial-space-repository.ts';

interface FinancialSpaceRow {
  id: string;
  name: string;
  owner_user_id: string;
  lifecycle_state: FinancialSpaceLifecycleState;
  created_at: Date;
}

type AccessibleSpaceRow = FinancialSpaceRow & { member_permissions: SpacePermission[] | null };

const COLUMNS = 'id, name, owner_user_id, lifecycle_state, created_at';

const ACCESSIBLE_SELECT = `SELECT s.id, s.name, s.owner_user_id, s.lifecycle_state, s.created_at,
         m.permissions AS member_permissions
       FROM financial_space s
       LEFT JOIN financial_space_member m
         ON m.financial_space_id = s.id AND m.user_id = $1 AND m.removed_at IS NULL
       WHERE (s.owner_user_id = $1 OR m.id IS NOT NULL)`;

function toFinancialSpace(row: FinancialSpaceRow): FinancialSpace {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    lifecycleState: row.lifecycle_state,
    createdAt: row.created_at,
  };
}

function toAccessibleSpace(row: AccessibleSpaceRow, userId: string): AccessibleSpace {
  return {
    ...toFinancialSpace(row),
    access:
      row.owner_user_id === userId || row.member_permissions === null
        ? OWNER_ACCESS
        : { role: 'member', permissions: row.member_permissions },
  };
}

export function createPostgresFinancialSpaceRepository(db: Queryable): FinancialSpaceRepository {
  return {
    async create(space) {
      const { rows } = await db.query<FinancialSpaceRow>(
        `INSERT INTO financial_space (id, name, owner_user_id)
         VALUES ($1, $2, $3)
         RETURNING ${COLUMNS}`,
        [space.id, space.name, space.ownerUserId],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Financial space insert returned no row');
      }
      return toFinancialSpace(row);
    },

    async listAccessibleTo(userId) {
      const { rows } = await db.query<AccessibleSpaceRow>(
        `${ACCESSIBLE_SELECT} ORDER BY s.created_at, s.id`,
        [userId],
      );
      return rows.map((row) => toAccessibleSpace(row, userId));
    },

    async findAccessibleTo(userId, spaceId) {
      const { rows } = await db.query<AccessibleSpaceRow>(`${ACCESSIBLE_SELECT} AND s.id = $2`, [
        userId,
        spaceId,
      ]);
      const [row] = rows;
      return row === undefined ? null : toAccessibleSpace(row, userId);
    },

    async findSupportAccess(userId, spaceId) {
      const { rows } = await db.query<FinancialSpaceRow & { grant_id: string }>(
        `SELECT s.id, s.name, s.owner_user_id, s.lifecycle_state, s.created_at, g.id AS grant_id
         FROM support_grant g
         JOIN financial_space s ON s.id = g.financial_space_id
         JOIN platform_admin a ON a.user_id = g.admin_user_id
         WHERE g.admin_user_id = $1 AND g.financial_space_id = $2
           AND g.revoked_at IS NULL AND g.expires_at > now()
         ORDER BY g.expires_at DESC LIMIT 1`,
        [userId, spaceId],
      );
      const [row] = rows;
      return row === undefined
        ? null
        : {
            ...toFinancialSpace(row),
            access: { role: 'support', permissions: ['view'], supportGrantId: row.grant_id },
          };
    },

    async recordSupportAccess(grantId, userId, spaceId) {
      await db.query(
        `INSERT INTO audit_event (id, financial_space_id, entity_type, entity_id, action,
           actor_user_id, changes)
         VALUES ($1, $2, 'support_grant', $3, 'access', $4, $5)`,
        [
          randomUUID(),
          spaceId,
          grantId,
          userId,
          JSON.stringify({ permission: { before: null, after: 'view' } }),
        ],
      );
    },

    async transferOwnership(spaceId, fromUserId, toUserId) {
      const result = await db.query(
        'UPDATE financial_space SET owner_user_id = $3 WHERE id = $1 AND owner_user_id = $2',
        [spaceId, fromUserId, toUserId],
      );
      return result.rowCount === 1;
    },
  };
}
