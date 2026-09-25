import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import type { SessionResolver } from './auth/authenticated-user.ts';
import type { AppEnvironment, LogLevel } from './config.ts';
import type { DataAccess } from './database/data-access.ts';
import { createAuthenticationHook } from './http/authenticate.ts';
import { handleError, handleNotFound } from './http/errors.ts';
import { registerAnalyticsRoutes } from './modules/analytics/analytics-routes.ts';
import { registerBalanceRoutes } from './modules/balance/balance-routes.ts';
import { registerCardInstallmentRoutes } from './modules/cards/card-installment-routes.ts';
import { registerCardInvoiceRoutes } from './modules/cards/card-invoice-routes.ts';
import { registerCardRoutes } from './modules/cards/card-routes.ts';
import { registerCategoryRoutes } from './modules/categories/category-routes.ts';
import { registerCommitmentRoutes } from './modules/commitments/commitment-routes.ts';
import { registerDashboardRoutes } from './modules/dashboard/dashboard-routes.ts';
import { registerFinancialSpaceRoutes } from './modules/financial-spaces/financial-space-routes.ts';
import { registerInvitationRoutes } from './modules/members/invitation-routes.ts';
import { registerMemberRoutes } from './modules/members/member-routes.ts';
import { registerDashboardPreferenceRoutes } from './modules/preferences/dashboard-preference-routes.ts';
import { registerRecurrenceRoutes } from './modules/recurrences/recurrence-routes.ts';
import { registerTagRoutes } from './modules/tags/tag-routes.ts';
import { registerTransactionRoutes } from './modules/transactions/transaction-routes.ts';
import { type AuthHandler, registerAuthRoutes } from './routes/auth.ts';
import { registerHealthRoute } from './routes/health.ts';
import { registerMeRoute } from './routes/me.ts';

export interface ServerOptions {
  appEnv: AppEnvironment;
  logLevel: LogLevel;
  corsOrigins: string[];
  sessionResolver: SessionResolver;
  authHandler: AuthHandler;
  data: DataAccess;
}

const REDACTED_LOG_PATHS = ['req.headers.authorization', 'req.headers.cookie'];

export function buildServer(options: ServerOptions): FastifyInstance {
  const server = Fastify({
    logger: {
      level: options.logLevel,
      base: { env: options.appEnv },
      redact: REDACTED_LOG_PATHS,
      serializers: {
        req: (request) => ({ method: request.method, path: request.url.split('?')[0] }),
      },
    },
  });

  server.setErrorHandler(handleError);
  server.setNotFoundHandler(handleNotFound);
  server.decorateRequest('authenticatedUser', null);

  server.register(cors, {
    origin: options.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  registerHealthRoute(server);
  registerAuthRoutes(server, options.authHandler);

  server.register(async (authenticated) => {
    authenticated.addHook('preHandler', createAuthenticationHook(options.sessionResolver));
    registerMeRoute(authenticated);
    registerFinancialSpaceRoutes(authenticated, options.data);
    registerCategoryRoutes(authenticated, options.data);
    registerTransactionRoutes(authenticated, options.data);
    registerBalanceRoutes(authenticated, options.data);
    registerDashboardRoutes(authenticated, options.data);
    registerCommitmentRoutes(authenticated, options.data);
    registerRecurrenceRoutes(authenticated, options.data);
    registerCardRoutes(authenticated, options.data);
    registerCardInvoiceRoutes(authenticated, options.data);
    registerCardInstallmentRoutes(authenticated, options.data);
    registerTagRoutes(authenticated, options.data);
    registerAnalyticsRoutes(authenticated, options.data);
    registerDashboardPreferenceRoutes(authenticated, options.data);
    registerInvitationRoutes(authenticated, options.data);
    registerMemberRoutes(authenticated, options.data);
  });

  return server;
}
