import { messages } from '../i18n/messages';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: messages.auth.errors.invalidCredentials,
  USER_ALREADY_EXISTS: messages.auth.errors.emailInUse,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: messages.auth.errors.emailInUse,
  PASSWORD_TOO_SHORT: messages.auth.errors.passwordTooShort,
  PASSWORD_TOO_LONG: messages.auth.errors.passwordTooLong,
  INVALID_EMAIL: messages.auth.errors.invalidEmail,
};

export function describeAuthError(error: { code?: string | undefined } | null): string {
  const code = error?.code;
  return (code !== undefined && AUTH_ERROR_MESSAGES[code]) || messages.auth.errors.unexpected;
}
