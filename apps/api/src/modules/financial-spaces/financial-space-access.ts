import type { SpacePermission } from '@personalfin/domain';

import { AppError, NotFoundError } from '../../http/errors.ts';
import { isUuid } from '../../http/validation.ts';
import type { AccessibleSpace } from './financial-space.ts';
import type { FinancialSpaceRepository } from './financial-space-repository.ts';

export class PermissionDeniedError extends AppError {
  override name = 'PermissionDeniedError';

  constructor() {
    super(403, 'PERMISSION_DENIED', 'You do not have permission for this action in this space');
  }
}

export async function requireAccessibleSpace(
  repository: FinancialSpaceRepository,
  userId: string,
  spaceId: string,
  permission: SpacePermission,
): Promise<AccessibleSpace> {
  const space = isUuid(spaceId) ? await repository.findAccessibleTo(userId, spaceId) : null;
  if (space === null) {
    throw new NotFoundError('FINANCIAL_SPACE_NOT_FOUND', 'Financial space not found');
  }
  if (!space.access.permissions.includes(permission)) {
    throw new PermissionDeniedError();
  }
  return space;
}
