import type { TransactionType } from '@personalfin/domain';

import { AppError } from '../../http/errors.ts';
import type { CategoryRepository } from '../categories/category-repository.ts';

export class CategoryNotAvailableError extends AppError {
  override name = 'CategoryNotAvailableError';

  constructor() {
    super(
      422,
      'CATEGORY_NOT_AVAILABLE',
      'The category or subcategory is not available for this transaction type in this space',
    );
  }
}

export interface CategorySelection {
  financialSpaceId: string;
  type: TransactionType;
  categoryId: string;
  subcategoryId: string | null;
}

export async function assertCategorySelection(
  categories: CategoryRepository,
  selection: CategorySelection,
): Promise<void> {
  const category = await categories.findInSpace(selection.financialSpaceId, selection.categoryId);
  if (category === null || category.parentCategoryId !== null || category.kind !== selection.type) {
    throw new CategoryNotAvailableError();
  }
  if (selection.subcategoryId !== null) {
    const subcategory = await categories.findInSpace(
      selection.financialSpaceId,
      selection.subcategoryId,
    );
    if (subcategory === null || subcategory.parentCategoryId !== category.id) {
      throw new CategoryNotAvailableError();
    }
  }
}
