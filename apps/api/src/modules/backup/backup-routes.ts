import type { FastifyInstance } from 'fastify';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { buildBackup } from './backup.ts';

export function registerBackupRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/me/backup', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const spaces = await data.repositories.financialSpaces.listAccessibleTo(user.id);
    const now = new Date();
    const backup = await buildBackup(data.repositories.backup, user, spaces, now);
    return reply
      .header('content-type', 'application/json; charset=utf-8')
      .header(
        'content-disposition',
        `attachment; filename="personalfin-backup-${now.toISOString().slice(0, 10)}.json"`,
      )
      .send(JSON.stringify(backup));
  });
}
