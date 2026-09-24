import { randomUUID } from 'node:crypto';

import type { Queryable } from '../../database/pool.ts';
import type { Category, CategoryKind } from './category.ts';
import type { CategoryRepository } from './category-repository.ts';

interface CategoryRow {
  id: string;
  financial_space_id: string;
  parent_category_id: string | null;
  kind: CategoryKind;
  name: string;
  position: number;
  default_key: string | null;
}

const COLUMNS = 'id, financial_space_id, parent_category_id, kind, name, position, default_key';

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    parentCategoryId: row.parent_category_id,
    kind: row.kind,
    name: row.name,
    position: row.position,
    defaultKey: row.default_key,
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

      const rows: Omit<CategoryRow, 'financial_space_id'>[] = [];
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

    async findInSpace(financialSpaceId, categoryId) {
      const { rows } = await db.query<CategoryRow>(
        `SELECT ${COLUMNS} FROM category WHERE financial_space_id = $1 AND id = $2`,
        [financialSpaceId, categoryId],
      );
      const [row] = rows;
      return row === undefined ? null : toCategory(row);
    },
  };
}
