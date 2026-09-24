import Fastify, { type FastifyInstance } from 'fastify';

import type { ApiConfig } from './config.ts';
import { registerHealthRoute } from './routes/health.ts';

const REDACTED_LOG_PATHS = ['req.headers.authorization', 'req.headers.cookie'];

export function buildServer(config: ApiConfig): FastifyInstance {
  const server = Fastify({
    logger: {
      level: config.logLevel,
      base: { env: config.appEnv },
      redact: REDACTED_LOG_PATHS,
    },
  });

  registerHealthRoute(server);

  return server;
}
