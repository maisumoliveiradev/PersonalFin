import type { SpacePermission } from '@personalfin/domain';

import { AppError, NotFoundError } from '../../http/errors.ts';
import { isReadOnlyRequest } from '../../http/request-context.ts';
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
  if (!isUuid(spaceId)) {
    throw new NotFoundError('FINANCIAL_SPACE_NOT_FOUND', 'Financial space not found');
  }
  const space =
    (await repository.findAccessibleTo(userId, spaceId)) ??
    (await repository.findSupportAccess(userId, spaceId));
  if (space === null) {
    throw new NotFoundError('FINANCIAL_SPACE_NOT_FOUND', 'Financial space not found');
  }
  if (space.access.role === 'support') {
    if (
      permission !== 'view' ||
      !isReadOnlyRequest() ||
      space.access.supportGrantId === undefined
    ) {
      throw new PermissionDeniedError();
    }
    await repository.recordSupportAccess(space.access.supportGrantId, userId, space.id);
    return space;
  }
  if (!space.access.permissions.includes(permission)) {
    throw new PermissionDeniedError();
  }
  return space;
}
