import type { CurrentUser } from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';

import type { DataAccess } from '../database/data-access.ts';
import { requireAuthenticatedUser } from '../http/authenticate.ts';

export function registerMeRoute(server: FastifyInstance, data: DataAccess): void {
  server.get('/me', async (request): Promise<CurrentUser> => {
    const user = requireAuthenticatedUser(request);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      platformAdmin: await data.repositories.platformAdmins.isPlatformAdmin(user.id),
    };
  });
}
