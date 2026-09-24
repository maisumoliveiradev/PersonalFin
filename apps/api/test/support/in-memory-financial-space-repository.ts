import type { FinancialSpace } from '../../src/modules/financial-spaces/financial-space.ts';
import type { FinancialSpaceRepository } from '../../src/modules/financial-spaces/financial-space-repository.ts';

export function createInMemoryFinancialSpaceRepository(): FinancialSpaceRepository & {
  spaces: FinancialSpace[];
} {
  const spaces: FinancialSpace[] = [];
  return {
    spaces,
    async create(space) {
      const created: FinancialSpace = {
        ...space,
        lifecycleState: 'active',
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, spaces.length)),
      };
      spaces.push(created);
      return created;
    },
    async listAccessibleTo(userId) {
      return spaces.filter((space) => space.ownerUserId === userId);
    },
    async findAccessibleTo(userId, spaceId) {
      return spaces.find((space) => space.id === spaceId && space.ownerUserId === userId) ?? null;
    },
  };
}
