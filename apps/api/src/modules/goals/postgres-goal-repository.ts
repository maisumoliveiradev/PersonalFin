import type { Queryable } from '../../database/pool.ts';
import type { Goal, GoalProgress, GoalRepository, GoalScope } from './goal.ts';

interface GoalRow {
  id: string;
  owner_user_id: string;
  financial_space_id: string | null;
  name: string;
  target_amount_minor: string;
  accumulated_minor: string;
  currency: string;
  target_date: string | null;
  archived_at: Date | null;
  created_at: Date;
  version: number;
}

const COLUMNS = `id, owner_user_id, financial_space_id, name, target_amount_minor,
  accumulated_minor, currency, to_char(target_date, 'YYYY-MM-DD') AS target_date,
  archived_at, created_at, version`;

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    financialSpaceId: row.financial_space_id,
    name: row.name,
    targetAmountMinor: Number(row.target_amount_minor),
    accumulatedMinor: Number(row.accumulated_minor),
    currency: row.currency as Goal['currency'],
    targetDate: row.target_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    version: row.version,
  };
}

function scopeCondition(scope: GoalScope, parameter: number): [string, string] {
  return scope.kind === 'global'
    ? [`financial_space_id IS NULL AND owner_user_id = $${parameter}`, scope.ownerUserId]
    : [`financial_space_id = $${parameter}`, scope.financialSpaceId];
}

export function createPostgresGoalRepository(db: Queryable): GoalRepository {
  return {
    async list(scope) {
      const [condition, value] = scopeCondition(scope, 1);
      const { rows } = await db.query<GoalRow>(
        `SELECT ${COLUMNS} FROM goal WHERE ${condition} ORDER BY created_at, id`,
        [value],
      );
      return rows.map(toGoal);
    },

    async find(scope, goalId, options) {
      const [condition, value] = scopeCondition(scope, 2);
      const { rows } = await db.query<GoalRow>(
        `SELECT ${COLUMNS} FROM goal WHERE id = $1 AND ${condition}
         ${options?.lock ? 'FOR UPDATE' : ''}`,
        [goalId, value],
      );
      const [row] = rows;
      return row === undefined ? null : toGoal(row);
    },

    async create(goal) {
      const { rows } = await db.query<GoalRow>(
        `INSERT INTO goal (id, owner_user_id, financial_space_id, name, target_amount_minor,
           currency, target_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${COLUMNS}`,
        [
          goal.id,
          goal.ownerUserId,
          goal.financialSpaceId,
          goal.name,
          String(goal.targetAmountMinor),
          goal.currency,
          goal.targetDate,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Goal insert returned no row');
      }
      return toGoal(row);
    },

    async update(update) {
      const { rows } = await db.query<GoalRow>(
        `UPDATE goal SET name = $3, target_amount_minor = $4, accumulated_minor = $5,
           target_date = $6,
           archived_at = CASE WHEN $7 THEN COALESCE(archived_at, now()) ELSE NULL END,
           version = version + 1, updated_at = now()
         WHERE id = $1 AND version = $2
         RETURNING ${COLUMNS}`,
        [
          update.goalId,
          update.expectedVersion,
          update.name,
          String(update.targetAmountMinor),
          String(update.accumulatedMinor),
          update.targetDate,
          update.archived,
        ],
      );
      const [row] = rows;
      return row === undefined ? null : toGoal(row);
    },

    async recordProgress(progress) {
      const { rows } = await db.query<{
        id: string;
        goal_id: string;
        accumulated_minor: string;
        recorded_at: Date;
      }>(
        `INSERT INTO goal_progress (id, goal_id, accumulated_minor, recorded_by_user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, goal_id, accumulated_minor, recorded_at`,
        [
          progress.id,
          progress.goalId,
          String(progress.accumulatedMinor),
          progress.recordedByUserId,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Goal progress insert returned no row');
      }
      return {
        id: row.id,
        goalId: row.goal_id,
        accumulatedMinor: Number(row.accumulated_minor),
        recordedAt: row.recorded_at,
      };
    },

    async listProgress(goalId) {
      const { rows } = await db.query<{
        id: string;
        goal_id: string;
        accumulated_minor: string;
        recorded_at: Date;
      }>(
        `SELECT id, goal_id, accumulated_minor, recorded_at FROM goal_progress
         WHERE goal_id = $1 ORDER BY recorded_at DESC, id DESC`,
        [goalId],
      );
      return rows.map(
        (row): GoalProgress => ({
          id: row.id,
          goalId: row.goal_id,
          accumulatedMinor: Number(row.accumulated_minor),
          recordedAt: row.recorded_at,
        }),
      );
    },
  };
}
