import type { PlatformOverview as PlatformOverviewResponse } from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';

import type { DataAccess } from '../../database/data-access.ts';
import { requirePlatformAdmin } from './platform-admin.ts';

export function registerAdminRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/admin/overview', async (request): Promise<PlatformOverviewResponse> => {
    await requirePlatformAdmin(request, data);
    return data.repositories.platformAdmins.overview();
  });
}
