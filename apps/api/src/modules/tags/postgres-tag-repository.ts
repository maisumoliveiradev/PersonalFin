import { isDatabaseError } from '../../database/database-error.ts';
import type { Queryable } from '../../database/pool.ts';
import type { Tag } from './tag.ts';
import { TagInUseError, TagNameTakenError } from './tag-errors.ts';
import type { TagRepository } from './tag-repository.ts';

interface TagRow {
  id: string;
  financial_space_id: string;
  name: string;
  archived_at: Date | null;
  version: number;
}

const COLUMNS = 'id, financial_space_id, name, archived_at, version';

function toTag(row: TagRow): Tag {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    name: row.name,
    archivedAt: row.archived_at,
    version: row.version,
  };
}

async function translateNameConflict<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (isDatabaseError(error, '23505', 'tag_name_unique')) {
      throw new TagNameTakenError();
    }
    throw error;
  }
}

export function createPostgresTagRepository(db: Queryable): TagRepository {
  return {
    async listForSpace(financialSpaceId) {
      const { rows } = await db.query<TagRow>(
        `SELECT ${COLUMNS} FROM tag WHERE financial_space_id = $1
         ORDER BY archived_at IS NOT NULL, lower(name), id`,
        [financialSpaceId],
      );
      return rows.map(toTag);
    },

    async findInSpace(financialSpaceId, tagId, options) {
      const lock = options?.lock === true ? 'FOR UPDATE' : '';
      const { rows } = await db.query<TagRow>(
        `SELECT ${COLUMNS} FROM tag WHERE financial_space_id = $1 AND id = $2 ${lock}`,
        [financialSpaceId, tagId],
      );
      const [row] = rows;
      return row === undefined ? null : toTag(row);
    },

    async create(tag) {
      const { rows } = await translateNameConflict(
        db.query<TagRow>(
          `INSERT INTO tag (id, financial_space_id, name, created_by_user_id)
           VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
          [tag.id, tag.financialSpaceId, tag.name, tag.createdByUserId],
        ),
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Tag insert returned no row');
      }
      return toTag(row);
    },

    async update({ financialSpaceId, tagId, expectedVersion, name, archived }) {
      const { rows } = await translateNameConflict(
        db.query<TagRow>(
          `UPDATE tag SET name = $4,
             archived_at = CASE WHEN $5::boolean THEN COALESCE(archived_at, now()) ELSE NULL END,
             version = version + 1, updated_at = now()
           WHERE financial_space_id = $1 AND id = $2 AND version = $3
           RETURNING ${COLUMNS}`,
          [financialSpaceId, tagId, expectedVersion, name, archived],
        ),
      );
      const [row] = rows;
      return row === undefined ? null : toTag(row);
    },

    async delete(financialSpaceId, tagId, expectedVersion) {
      try {
        const result = await db.query(
          'DELETE FROM tag WHERE financial_space_id = $1 AND id = $2 AND version = $3',
          [financialSpaceId, tagId, expectedVersion],
        );
        return result.rowCount === 1;
      } catch (error) {
        if (isDatabaseError(error, '23503')) {
          throw new TagInUseError();
        }
        throw error;
      }
    },

    async countUses(financialSpaceId, tagId) {
      const { rows } = await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM transaction_tag
         WHERE financial_space_id = $1 AND tag_id = $2`,
        [financialSpaceId, tagId],
      );
      return rows[0]?.count ?? 0;
    },

    async tagIdsOf(financialSpaceId, transactionId) {
      const { rows } = await db.query<{ tag_id: string }>(
        `SELECT tag_id FROM transaction_tag
         WHERE financial_space_id = $1 AND transaction_id = $2
         ORDER BY tag_id`,
        [financialSpaceId, transactionId],
      );
      return rows.map((row) => row.tag_id);
    },

    async setForTransaction(financialSpaceId, transactionId, tagIds) {
      await db.query(
        `DELETE FROM transaction_tag
         WHERE financial_space_id = $1 AND transaction_id = $2 AND NOT (tag_id = ANY($3::uuid[]))`,
        [financialSpaceId, transactionId, tagIds],
      );
      await db.query(
        `INSERT INTO transaction_tag (transaction_id, tag_id, financial_space_id)
         SELECT $2, tag_id, $1 FROM unnest($3::uuid[]) AS selected(tag_id)
         ON CONFLICT DO NOTHING`,
        [financialSpaceId, transactionId, tagIds],
      );
    },
  };
}
