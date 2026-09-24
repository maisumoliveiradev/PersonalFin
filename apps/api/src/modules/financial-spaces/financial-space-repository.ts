import type { FinancialSpace, NewFinancialSpace } from './financial-space.ts';

export interface FinancialSpaceRepository {
  create(space: NewFinancialSpace): Promise<FinancialSpace>;
  listAccessibleTo(userId: string): Promise<FinancialSpace[]>;
  findAccessibleTo(userId: string, spaceId: string): Promise<FinancialSpace | null>;
}
