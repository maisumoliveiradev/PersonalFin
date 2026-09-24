import type { Category } from './category.ts';
import type { DefaultCategoryDefinition } from './default-category-catalog.ts';

export interface CategoryRepository {
  seedDefaults(
    financialSpaceId: string,
    catalog: readonly DefaultCategoryDefinition[],
  ): Promise<boolean>;
  listForSpace(financialSpaceId: string): Promise<Category[]>;
  findInSpace(financialSpaceId: string, categoryId: string): Promise<Category | null>;
}
