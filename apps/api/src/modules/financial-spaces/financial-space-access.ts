import { NotFoundError } from '../../http/errors.ts';
import { isUuid } from '../../http/validation.ts';
import type { FinancialSpace } from './financial-space.ts';
import type { FinancialSpaceRepository } from './financial-space-repository.ts';

export async function requireAccessibleSpace(
  repository: FinancialSpaceRepository,
  userId: string,
  spaceId: string,
): Promise<FinancialSpace> {
  const space = isUuid(spaceId) ? await repository.findAccessibleTo(userId, spaceId) : null;
  if (space === null) {
    throw new NotFoundError('FINANCIAL_SPACE_NOT_FOUND', 'Financial space not found');
  }
  return space;
}
