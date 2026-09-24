import { AppError, NotFoundError } from '../../http/errors.ts';

export class CategoryNotFoundError extends NotFoundError {
  constructor() {
    super('CATEGORY_NOT_FOUND', 'Category not found');
  }
}

export class CategoryNameTakenError extends AppError {
  override name = 'CategoryNameTakenError';

  constructor() {
    super(409, 'CATEGORY_NAME_TAKEN', 'A category with this name already exists at this level');
  }
}

export class ParentCategoryNotAvailableError extends AppError {
  override name = 'ParentCategoryNotAvailableError';

  constructor() {
    super(
      422,
      'PARENT_CATEGORY_NOT_AVAILABLE',
      'Subcategories must belong to an active top-level category of the same kind',
    );
  }
}

export class CategoryDeletionBlockedError extends AppError {
  override name = 'CategoryDeletionBlockedError';

  constructor(reason: 'in_use' | 'has_subcategories') {
    super(
      409,
      reason === 'in_use' ? 'CATEGORY_IN_USE' : 'CATEGORY_HAS_SUBCATEGORIES',
      reason === 'in_use'
        ? 'The category is used by transactions; archive it instead'
        : 'Delete or archive its subcategories first',
    );
  }
}
