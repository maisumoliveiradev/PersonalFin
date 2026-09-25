import type { FastifyRequest } from 'fastify';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { AppError } from '../../http/errors.ts';

export interface PlatformOverview {
  users: { total: number; createdLast30Days: number; activeLast30Days: number };
  spaces: { total: number; shared: number; createdLast30Days: number };
  transactions: { total: number; createdLast30Days: number };
  featureAdoption: Record<
    | 'cards'
    | 'recurrences'
    | 'debts'
    | 'goals'
    | 'imports'
    | 'attachments'
    | 'foreignCurrency'
    | 'tags',
    number
  >;
  database: { migrations: number; latestMigration: string | null };
}

export interface PlatformAdminRepository {
  isPlatformAdmin(userId: string): Promise<boolean>;
  overview(): Promise<PlatformOverview>;
}

export class PlatformAdminRequiredError extends AppError {
  override name = 'PlatformAdminRequiredError';

  constructor() {
    super(403, 'PLATFORM_ADMIN_REQUIRED', 'This area is restricted to platform administrators');
  }
}

export async function requirePlatformAdmin(request: FastifyRequest, data: DataAccess) {
  const user = requireAuthenticatedUser(request);
  if (!(await data.repositories.platformAdmins.isPlatformAdmin(user.id))) {
    throw new PlatformAdminRequiredError();
  }
  return user;
}
