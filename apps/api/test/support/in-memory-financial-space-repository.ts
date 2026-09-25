import type { SpacePermission } from '@personalfin/domain';

import {
  type AccessibleSpace,
  type FinancialSpace,
  OWNER_ACCESS,
} from '../../src/modules/financial-spaces/financial-space.ts';
import type { FinancialSpaceRepository } from '../../src/modules/financial-spaces/financial-space-repository.ts';

export interface InMemoryMember {
  id?: string;
  financialSpaceId: string;
  userId: string;
  permissions: SpacePermission[];
  addedAt?: Date;
  removedAt?: Date | null;
  version?: number;
}

export function createInMemoryFinancialSpaceRepository(): FinancialSpaceRepository & {
  spaces: FinancialSpace[];
  members: InMemoryMember[];
} {
  const spaces: FinancialSpace[] = [];
  const members: InMemoryMember[] = [];

  function accessible(userId: string, space: FinancialSpace): AccessibleSpace | null {
    if (space.ownerUserId === userId) {
      return { ...space, access: OWNER_ACCESS };
    }
    const member = members.find(
      (candidate) =>
        candidate.financialSpaceId === space.id &&
        candidate.userId === userId &&
        (candidate.removedAt ?? null) === null,
    );
    return member === undefined
      ? null
      : { ...space, access: { role: 'member', permissions: member.permissions } };
  }

  return {
    spaces,
    members,
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
      return spaces
        .map((space) => accessible(userId, space))
        .filter((space): space is AccessibleSpace => space !== null);
    },
    async findAccessibleTo(userId, spaceId) {
      const space = spaces.find((candidate) => candidate.id === spaceId);
      return space === undefined ? null : accessible(userId, space);
    },
    async transferOwnership(spaceId, fromUserId, toUserId) {
      const space = spaces.find(
        (candidate) => candidate.id === spaceId && candidate.ownerUserId === fromUserId,
      );
      if (space === undefined) {
        return false;
      }
      space.ownerUserId = toUserId;
      return true;
    },
  };
}
