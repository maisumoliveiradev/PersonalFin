import { randomUUID } from 'node:crypto';

import type { Category } from '../../src/modules/categories/category.ts';
import {
  CategoryDeletionBlockedError,
  CategoryNameTakenError,
} from '../../src/modules/categories/category-errors.ts';
import type { CategoryRepository } from '../../src/modules/categories/category-repository.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';

type CategoryIdentity = Pick<
  Category,
  'id' | 'financialSpaceId' | 'kind' | 'parentCategoryId' | 'name'
>;

export function createInMemoryCategoryRepository(
  transactions: () => readonly FinancialTransaction[] = () => [],
): CategoryRepository & {
  categories: Category[];
  seededSpaceIds: Set<string>;
} {
  const categories: Category[] = [];
  const seededSpaceIds = new Set<string>();

  function find(financialSpaceId: string, categoryId: string) {
    return categories.find(
      (category) => category.financialSpaceId === financialSpaceId && category.id === categoryId,
    );
  }

  function assertUniqueName(candidate: CategoryIdentity) {
    const clash = categories.some(
      (category) =>
        category.id !== candidate.id &&
        category.financialSpaceId === candidate.financialSpaceId &&
        category.kind === candidate.kind &&
        category.parentCategoryId === candidate.parentCategoryId &&
        category.name === candidate.name,
    );
    if (clash) {
      throw new CategoryNameTakenError();
    }
  }

  function usedBy(financialSpaceId: string, categoryId: string) {
    return transactions().filter(
      (transaction) =>
        transaction.financialSpaceId === financialSpaceId &&
        (transaction.category.id === categoryId || transaction.subcategory?.id === categoryId),
    );
  }

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
          archivedAt: null,
          version: 1,
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
            archivedAt: null,
            version: 1,
          });
        });
      });
      return true;
    },
    async listForSpace(financialSpaceId) {
      return categories.filter((category) => category.financialSpaceId === financialSpaceId);
    },
    async findInSpace(financialSpaceId, categoryId) {
      const category = find(financialSpaceId, categoryId);
      return category === undefined ? null : { ...category };
    },
    async create(category) {
      assertUniqueName(category);
      const siblings = categories.filter(
        (candidate) =>
          candidate.financialSpaceId === category.financialSpaceId &&
          candidate.parentCategoryId === category.parentCategoryId,
      );
      const created: Category = {
        ...category,
        position: siblings.length,
        defaultKey: null,
        archivedAt: null,
        version: 1,
      };
      categories.push(created);
      return { ...created };
    },
    async update({ financialSpaceId, categoryId, expectedVersion, name, archived }) {
      const current = find(financialSpaceId, categoryId);
      if (current === undefined || current.version !== expectedVersion) {
        return null;
      }
      assertUniqueName({ ...current, name });
      current.name = name;
      current.archivedAt = archived ? (current.archivedAt ?? new Date()) : null;
      current.version += 1;
      return { ...current };
    },
    async delete(financialSpaceId, categoryId, expectedVersion) {
      const current = find(financialSpaceId, categoryId);
      if (current === undefined || current.version !== expectedVersion) {
        return false;
      }
      if (usedBy(financialSpaceId, categoryId).length > 0) {
        throw new CategoryDeletionBlockedError('in_use');
      }
      categories.splice(categories.indexOf(current), 1);
      return true;
    },
    async countTransactionsUsing(financialSpaceId, categoryId) {
      return usedBy(financialSpaceId, categoryId).length;
    },
    async countSubcategories(financialSpaceId, categoryId) {
      return categories.filter(
        (category) =>
          category.financialSpaceId === financialSpaceId &&
          category.parentCategoryId === categoryId,
      ).length;
    },
  };
}
