import type { DatabasePool } from '../../database/pool.ts';
import type { FinancialSpace, FinancialSpaceLifecycleState } from './financial-space.ts';
import type { FinancialSpaceRepository } from './financial-space-repository.ts';

interface FinancialSpaceRow {
  id: string;
  name: string;
  owner_user_id: string;
  lifecycle_state: FinancialSpaceLifecycleState;
  created_at: Date;
}

const COLUMNS = 'id, name, owner_user_id, lifecycle_state, created_at';

function toFinancialSpace(row: FinancialSpaceRow): FinancialSpace {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    lifecycleState: row.lifecycle_state,
    createdAt: row.created_at,
  };
}

export function createPostgresFinancialSpaceRepository(
  pool: DatabasePool,
): FinancialSpaceRepository {
  return {
    async create(space) {
      const { rows } = await pool.query<FinancialSpaceRow>(
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
      const { rows } = await pool.query<FinancialSpaceRow>(
        `SELECT ${COLUMNS} FROM financial_space
         WHERE owner_user_id = $1
         ORDER BY created_at, id`,
        [userId],
      );
      return rows.map(toFinancialSpace);
    },

    async findAccessibleTo(userId, spaceId) {
      const { rows } = await pool.query<FinancialSpaceRow>(
        `SELECT ${COLUMNS} FROM financial_space
         WHERE id = $1 AND owner_user_id = $2`,
        [spaceId, userId],
      );
      const [row] = rows;
      return row === undefined ? null : toFinancialSpace(row);
    },
  };
}
