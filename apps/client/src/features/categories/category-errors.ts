import { ApiRequestError } from '../../api/api-client';
import { messages } from '../../i18n/messages';

const CATEGORY_ERROR_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: messages.common.permissionDenied,
  CATEGORY_NAME_TAKEN: messages.categories.errors.nameTaken,
  CATEGORY_IN_USE: messages.categories.errors.inUse,
  CATEGORY_HAS_SUBCATEGORIES: messages.categories.errors.hasSubcategories,
  PARENT_CATEGORY_NOT_AVAILABLE: messages.categories.errors.parentNotAvailable,
  VERSION_CONFLICT: messages.categories.errors.conflict,
};

export function describeCategoryError(error: Error | null): string | null {
  if (error === null) {
    return null;
  }
  if (error instanceof ApiRequestError) {
    return CATEGORY_ERROR_MESSAGES[error.code] ?? messages.categories.errors.unexpected;
  }
  return messages.categories.errors.unexpected;
}

const NAME_MAX_LENGTH = 60;

export function validateCategoryName(name: string): string | null {
  const normalized = name.trim();
  if (normalized === '') {
    return messages.categories.errors.nameRequired;
  }
  if (normalized.length > NAME_MAX_LENGTH) {
    return messages.categories.errors.nameTooLong;
  }
  return null;
}
