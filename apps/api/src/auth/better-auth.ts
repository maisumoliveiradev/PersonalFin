import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';

import type { AuthConfig } from '../config.ts';
import type { DatabasePool } from '../database/pool.ts';
import type { SessionResolver } from './authenticated-user.ts';

export const AUTH_BASE_PATH = '/api/auth';

export function createAuth(config: AuthConfig, pool: DatabasePool) {
  return betterAuth({
    database: pool,
    secret: config.secret,
    baseURL: config.baseUrl,
    basePath: AUTH_BASE_PATH,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      cookiePrefix: 'personalfin',
      database: {
        generateId: 'uuid',
      },
    },
    telemetry: {
      enabled: false,
    },
    plugins: [expo()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

export function createSessionResolver(auth: Auth): SessionResolver {
  return {
    async resolve(headers) {
      const session = await auth.api.getSession({ headers });
      if (session === null) {
        return null;
      }
      return { id: session.user.id, email: session.user.email, name: session.user.name };
    },
  };
}
