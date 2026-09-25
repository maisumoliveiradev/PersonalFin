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
  };
}
