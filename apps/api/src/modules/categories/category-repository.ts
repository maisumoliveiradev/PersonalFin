import type { Category, CategoryKind } from './category.ts';
import type { DefaultCategoryDefinition } from './default-category-catalog.ts';

export interface NewCategory {
  id: string;
  financialSpaceId: string;
  parentCategoryId: string | null;
  kind: CategoryKind;
  name: string;
}

export interface CategoryUpdate {
  financialSpaceId: string;
  categoryId: string;
  expectedVersion: number;
  name: string;
  archived: boolean;
}

export interface CategoryRepository {
  seedDefaults(
    financialSpaceId: string,
    catalog: readonly DefaultCategoryDefinition[],
  ): Promise<boolean>;
  listForSpace(financialSpaceId: string): Promise<Category[]>;
  findInSpace(
    financialSpaceId: string,
    categoryId: string,
    options?: { lock: boolean },
  ): Promise<Category | null>;
  create(category: NewCategory): Promise<Category>;
  update(update: CategoryUpdate): Promise<Category | null>;
  delete(financialSpaceId: string, categoryId: string, expectedVersion: number): Promise<boolean>;
  countTransactionsUsing(financialSpaceId: string, categoryId: string): Promise<number>;
  countSubcategories(financialSpaceId: string, categoryId: string): Promise<number>;
}
