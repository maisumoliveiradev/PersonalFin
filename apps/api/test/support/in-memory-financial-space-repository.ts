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

export interface InMemorySupportGrant {
  id: string;
  financialSpaceId: string;
  grantedByUserId: string;
  adminUserId: string;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  accesses: Date[];
}

export function createInMemoryFinancialSpaceRepository(
  admins: ReadonlySet<string> = new Set(),
  onSupportAccess: (
    grantId: string,
    userId: string,
    spaceId: string,
  ) => Promise<void> = async () => {},
): FinancialSpaceRepository & {
  spaces: FinancialSpace[];
  members: InMemoryMember[];
  supportGrants: InMemorySupportGrant[];
} {
  const spaces: FinancialSpace[] = [];
  const members: InMemoryMember[] = [];
  const supportGrants: InMemorySupportGrant[] = [];

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
    supportGrants,
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
    async findSupportAccess(userId, spaceId) {
      const space = spaces.find((candidate) => candidate.id === spaceId);
      const grant = supportGrants.find(
        (candidate) =>
          candidate.financialSpaceId === spaceId &&
          candidate.adminUserId === userId &&
          candidate.revokedAt === null &&
          candidate.expiresAt.getTime() > Date.now(),
      );
      if (space === undefined || grant === undefined || !admins.has(userId)) {
        return null;
      }
      return {
        ...space,
        access: { role: 'support', permissions: ['view'], supportGrantId: grant.id },
      };
    },
    async recordSupportAccess(grantId, userId, spaceId) {
      supportGrants.find((grant) => grant.id === grantId)?.accesses.push(new Date());
      await onSupportAccess(grantId, userId, spaceId);
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
