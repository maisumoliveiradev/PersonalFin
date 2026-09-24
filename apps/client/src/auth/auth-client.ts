import { createAuthClient } from 'better-auth/react';

import { apiUrl } from '../config';

export const authClient = createAuthClient({
  baseURL: apiUrl,
  basePath: '/api/auth',
  fetchOptions: { credentials: 'include' },
});

export async function getSessionCookie(): Promise<string | null> {
  return null;
}
