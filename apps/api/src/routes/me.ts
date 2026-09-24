import type { CurrentUser } from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';

import { requireAuthenticatedUser } from '../http/authenticate.ts';

export function registerMeRoute(server: FastifyInstance): void {
  server.get('/me', async (request): Promise<CurrentUser> => {
    const user = requireAuthenticatedUser(request);
    return { id: user.id, email: user.email, name: user.name };
  });
}
