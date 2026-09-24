export function isDatabaseError(error: unknown, code: string, constraint?: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code &&
    (constraint === undefined || ('constraint' in error && error.constraint === constraint))
  );
}
