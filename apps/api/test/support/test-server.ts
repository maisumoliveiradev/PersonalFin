import type { AuthenticatedUser, SessionResolver } from '../../src/auth/authenticated-user.ts';
import type { DataAccess } from '../../src/database/data-access.ts';
import type { AuthHandler } from '../../src/routes/auth.ts';
import { buildServer } from '../../src/server.ts';
import { createInMemoryAuditRepository } from './in-memory-audit-repository.ts';
import { createInMemoryCategoryRepository } from './in-memory-category-repository.ts';
import { createInMemoryFinancialSpaceRepository } from './in-memory-financial-space-repository.ts';
import { createInMemoryTransactionRepository } from './in-memory-transaction-repository.ts';

export const SESSION_COOKIE = 'personalfin.session_token';

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}`;
}

export function createFakeSessionResolver(
  sessions: Record<string, AuthenticatedUser>,
): SessionResolver {
  return {
    async resolve(headers) {
      const cookie = headers.get('cookie') ?? '';
      const token = cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
        ?.slice(SESSION_COOKIE.length + 1);
      return token === undefined ? null : (sessions[token] ?? null);
    },
  };
}

const unusedAuthHandler: AuthHandler = async () => new Response(null, { status: 404 });

export function createInMemoryRepositories() {
  const categories = createInMemoryCategoryRepository(() => transactions.transactions);
  const transactions = createInMemoryTransactionRepository(categories.categories);
  return {
    financialSpaces: createInMemoryFinancialSpaceRepository(),
    categories,
    transactions,
    audit: createInMemoryAuditRepository(),
  };
}

export type InMemoryRepositories = ReturnType<typeof createInMemoryRepositories>;

export function createInMemoryDataAccess(repositories: InMemoryRepositories): DataAccess {
  return { repositories, transaction: (work) => work(repositories) };
}

export function buildTestServer(
  overrides: {
    sessions?: Record<string, AuthenticatedUser>;
    authHandler?: AuthHandler;
    repositories?: InMemoryRepositories;
  } = {},
) {
  return buildServer({
    appEnv: 'development',
    logLevel: 'silent',
    corsOrigins: ['http://localhost:8081'],
    sessionResolver: createFakeSessionResolver(overrides.sessions ?? {}),
    authHandler: overrides.authHandler ?? unusedAuthHandler,
    data: createInMemoryDataAccess(overrides.repositories ?? createInMemoryRepositories()),
  });
}
