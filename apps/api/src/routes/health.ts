import type { HealthStatus } from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';

export function registerHealthRoute(server: FastifyInstance): void {
  server.get('/health', async (): Promise<HealthStatus> => ({ status: 'ok' }));
}
