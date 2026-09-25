import { ApiRequestError } from '../../api/api-client';
import { messages } from '../../i18n/messages';

const TAG_ERROR_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: messages.common.permissionDenied,
  TAG_NAME_TAKEN: messages.tags.errors.nameTaken,
  TAG_IN_USE: messages.tags.errors.inUse,
  VERSION_CONFLICT: messages.tags.errors.conflict,
};

export function describeTagError(error: Error | null): string | null {
  if (error === null) {
    return null;
  }
  if (error instanceof ApiRequestError) {
    return TAG_ERROR_MESSAGES[error.code] ?? messages.tags.errors.unexpected;
  }
  return messages.tags.errors.unexpected;
}

export function validateTagName(name: string): string | null {
  const normalized = name.trim();
  if (normalized === '') {
    return messages.tags.errors.nameRequired;
  }
  if (normalized.length > 40) {
    return messages.tags.errors.nameTooLong;
  }
  return null;
}
