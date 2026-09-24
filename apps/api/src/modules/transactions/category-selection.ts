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

export interface PreviousCategorySelection {
  categoryId: string;
  subcategoryId: string | null;
}

function isSelectable(
  category: { id: string; archivedAt: Date | null },
  keptIds: ReadonlySet<string>,
): boolean {
  return category.archivedAt === null || keptIds.has(category.id);
}

export async function assertCategorySelection(
  categories: CategoryRepository,
  selection: CategorySelection,
  previous?: PreviousCategorySelection,
): Promise<void> {
  const keptIds = new Set(
    [previous?.categoryId, previous?.subcategoryId].filter(
      (id): id is string => typeof id === 'string',
    ),
  );
  const category = await categories.findInSpace(selection.financialSpaceId, selection.categoryId);
  if (
    category === null ||
    category.parentCategoryId !== null ||
    category.kind !== selection.type ||
    !isSelectable(category, keptIds)
  ) {
    throw new CategoryNotAvailableError();
  }
  if (selection.subcategoryId !== null) {
    const subcategory = await categories.findInSpace(
      selection.financialSpaceId,
      selection.subcategoryId,
    );
    if (
      subcategory === null ||
      subcategory.parentCategoryId !== category.id ||
      !isSelectable(subcategory, keptIds)
    ) {
      throw new CategoryNotAvailableError();
    }
  }
}
