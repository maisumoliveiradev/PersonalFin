import type { AccessibleSpace, FinancialSpace, NewFinancialSpace } from './financial-space.ts';

export interface FinancialSpaceRepository {
  create(space: NewFinancialSpace): Promise<FinancialSpace>;
  listAccessibleTo(userId: string): Promise<AccessibleSpace[]>;
  findAccessibleTo(userId: string, spaceId: string): Promise<AccessibleSpace | null>;
  transferOwnership(spaceId: string, fromUserId: string, toUserId: string): Promise<boolean>;
}
