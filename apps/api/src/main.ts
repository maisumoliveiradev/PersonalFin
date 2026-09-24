import { loadConfig } from './config.ts';
import { buildServer } from './server.ts';

const config = loadConfig(process.env);
const server = buildServer(config);

try {
  await server.listen({ host: config.host, port: config.port });
} catch (error) {
  server.log.fatal(error, 'API failed to start');
  process.exit(1);
}
