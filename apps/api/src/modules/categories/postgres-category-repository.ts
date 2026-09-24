import { randomUUID } from 'node:crypto';

import type { Queryable } from '../../database/pool.ts';
import type { Category, CategoryKind } from './category.ts';
import { CategoryDeletionBlockedError, CategoryNameTakenError } from './category-errors.ts';
import type { CategoryRepository } from './category-repository.ts';

function isDatabaseError(error: unknown, code: string, constraint?: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code &&
    (constraint === undefined || ('constraint' in error && error.constraint === constraint))
  );
}

async function translateNameConflict<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (isDatabaseError(error, '23505', 'category_sibling_name_unique')) {
      throw new CategoryNameTakenError();
    }
    throw error;
  }
}

interface CategoryRow {
  id: string;
  financial_space_id: string;
  parent_category_id: string | null;
  kind: CategoryKind;
  name: string;
  position: number;
  default_key: string | null;
  archived_at: Date | null;
  version: number;
}

const COLUMNS =
  'id, financial_space_id, parent_category_id, kind, name, position, default_key, archived_at, version';

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    parentCategoryId: row.parent_category_id,
    kind: row.kind,
    name: row.name,
    position: row.position,
    defaultKey: row.default_key,
    archivedAt: row.archived_at,
    version: row.version,
  };
}

export function createPostgresCategoryRepository(db: Queryable): CategoryRepository {
  return {
    async seedDefaults(financialSpaceId, catalog) {
      const claimed = await db.query(
        `UPDATE financial_space SET default_categories_seeded_at = now()
         WHERE id = $1 AND default_categories_seeded_at IS NULL`,
        [financialSpaceId],
      );
      if (claimed.rowCount !== 1) {
        return false;
      }

      const rows: Omit<CategoryRow, 'financial_space_id' | 'archived_at' | 'version'>[] = [];
      catalog.forEach((definition, position) => {
        const parentId = randomUUID();
        rows.push({
          id: parentId,
          parent_category_id: null,
          kind: definition.kind,
          name: definition.name,
          position,
          default_key: definition.key,
        });
        definition.subcategories.forEach((subcategory, subPosition) => {
          rows.push({
            id: randomUUID(),
            parent_category_id: parentId,
            kind: definition.kind,
            name: subcategory.name,
            position: subPosition,
            default_key: subcategory.key,
          });
        });
      });

      await db.query(
        `INSERT INTO category (id, financial_space_id, parent_category_id, kind, name, position, default_key)
         SELECT id, $1, parent_category_id, kind, name, position, default_key
         FROM unnest($2::uuid[], $3::uuid[], $4::text[], $5::text[], $6::int[], $7::text[])
           AS seed(id, parent_category_id, kind, name, position, default_key)
         ON CONFLICT (financial_space_id, default_key) DO NOTHING`,
        [
          financialSpaceId,
          rows.map((row) => row.id),
          rows.map((row) => row.parent_category_id),
          rows.map((row) => row.kind),
          rows.map((row) => row.name),
          rows.map((row) => row.position),
          rows.map((row) => row.default_key),
        ],
      );
      return true;
    },

    async listForSpace(financialSpaceId) {
      const { rows } = await db.query<CategoryRow>(
        `SELECT ${COLUMNS} FROM category WHERE financial_space_id = $1
         ORDER BY parent_category_id NULLS FIRST, position, name`,
        [financialSpaceId],
      );
      return rows.map(toCategory);
    },

    async findInSpace(financialSpaceId, categoryId, options) {
      const lock = options?.lock === true ? 'FOR UPDATE' : '';
      const { rows } = await db.query<CategoryRow>(
        `SELECT ${COLUMNS} FROM category WHERE financial_space_id = $1 AND id = $2 ${lock}`,
        [financialSpaceId, categoryId],
      );
      const [row] = rows;
      return row === undefined ? null : toCategory(row);
    },

    async create(category) {
      const { rows } = await translateNameConflict(
        db.query<CategoryRow>(
          `INSERT INTO category (id, financial_space_id, parent_category_id, kind, name, position)
           VALUES ($1, $2, $3, $4, $5, (
             SELECT COALESCE(MAX(position) + 1, 0) FROM category
             WHERE financial_space_id = $2 AND parent_category_id IS NOT DISTINCT FROM $3
           ))
           RETURNING ${COLUMNS}`,
          [
            category.id,
            category.financialSpaceId,
            category.parentCategoryId,
            category.kind,
            category.name,
          ],
        ),
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Category insert returned no row');
      }
      return toCategory(row);
    },

    async update({ financialSpaceId, categoryId, expectedVersion, name, archived }) {
      const { rows } = await translateNameConflict(
        db.query<CategoryRow>(
          `UPDATE category SET
             name = $4,
             archived_at = CASE WHEN $5::boolean THEN COALESCE(archived_at, now()) ELSE NULL END,
             version = version + 1, updated_at = now()
           WHERE financial_space_id = $1 AND id = $2 AND version = $3
           RETURNING ${COLUMNS}`,
          [financialSpaceId, categoryId, expectedVersion, name, archived],
        ),
      );
      const [row] = rows;
      return row === undefined ? null : toCategory(row);
    },

    async delete(financialSpaceId, categoryId, expectedVersion) {
      try {
        const result = await db.query(
          'DELETE FROM category WHERE financial_space_id = $1 AND id = $2 AND version = $3',
          [financialSpaceId, categoryId, expectedVersion],
        );
        return result.rowCount === 1;
      } catch (error) {
        if (isDatabaseError(error, '23503')) {
          throw new CategoryDeletionBlockedError('in_use');
        }
        throw error;
      }
    },

    async countTransactionsUsing(financialSpaceId, categoryId) {
      const { rows } = await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM financial_transaction
         WHERE financial_space_id = $1 AND (category_id = $2 OR subcategory_id = $2)`,
        [financialSpaceId, categoryId],
      );
      return rows[0]?.count ?? 0;
    },

    async countSubcategories(financialSpaceId, categoryId) {
      const { rows } = await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM category
         WHERE financial_space_id = $1 AND parent_category_id = $2`,
        [financialSpaceId, categoryId],
      );
      return rows[0]?.count ?? 0;
    },
  };
}
