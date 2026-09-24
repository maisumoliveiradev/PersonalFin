import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { APP_SCHEME, apiUrl } from '../config';

export const authClient = createAuthClient({
  baseURL: apiUrl,
  basePath: '/api/auth',
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: 'personalfin',
      cookiePrefix: 'personalfin',
      storage: SecureStore,
    }),
  ],
});

export async function getSessionCookie(): Promise<string | null> {
  const cookie = await authClient.getCookie();
  return cookie === '' ? null : cookie;
}
