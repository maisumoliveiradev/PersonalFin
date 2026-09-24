import { randomUUID } from 'node:crypto';

import type { Category } from '../../src/modules/categories/category.ts';
import type { CategoryRepository } from '../../src/modules/categories/category-repository.ts';

export function createInMemoryCategoryRepository(): CategoryRepository & {
  categories: Category[];
  seededSpaceIds: Set<string>;
} {
  const categories: Category[] = [];
  const seededSpaceIds = new Set<string>();
  return {
    categories,
    seededSpaceIds,
    async seedDefaults(financialSpaceId, catalog) {
      if (seededSpaceIds.has(financialSpaceId)) {
        return false;
      }
      seededSpaceIds.add(financialSpaceId);
      catalog.forEach((definition, position) => {
        const parentId = randomUUID();
        categories.push({
          id: parentId,
          financialSpaceId,
          parentCategoryId: null,
          kind: definition.kind,
          name: definition.name,
          position,
          defaultKey: definition.key,
        });
        definition.subcategories.forEach((subcategory, subPosition) => {
          categories.push({
            id: randomUUID(),
            financialSpaceId,
            parentCategoryId: parentId,
            kind: definition.kind,
            name: subcategory.name,
            position: subPosition,
            defaultKey: subcategory.key,
          });
        });
      });
      return true;
    },
    async listForSpace(financialSpaceId) {
      return categories.filter((category) => category.financialSpaceId === financialSpaceId);
    },
    async findInSpace(financialSpaceId, categoryId) {
      return (
        categories.find(
          (category) =>
            category.financialSpaceId === financialSpaceId && category.id === categoryId,
        ) ?? null
      );
    },
  };
}
