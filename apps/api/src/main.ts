import { createAuth, createSessionResolver } from './auth/better-auth.ts';
import { loadConfig } from './config.ts';
import { createPostgresDataAccess } from './database/data-access.ts';
import { createPool } from './database/pool.ts';
import { buildServer } from './server.ts';

const config = loadConfig(process.env);
const pool = createPool(config.databaseUrl);
const auth = createAuth(config.auth, pool);
const server = buildServer({
  appEnv: config.appEnv,
  logLevel: config.logLevel,
  corsOrigins: config.auth.trustedOrigins.filter((origin) => origin.startsWith('http')),
  sessionResolver: createSessionResolver(auth),
  authHandler: auth.handler,
  data: createPostgresDataAccess(pool),
});

server.addHook('onClose', async () => {
  await pool.end();
});

try {
  await server.listen({ host: config.host, port: config.port });
} catch (error) {
  server.log.fatal(error, 'API failed to start');
  process.exit(1);
}
