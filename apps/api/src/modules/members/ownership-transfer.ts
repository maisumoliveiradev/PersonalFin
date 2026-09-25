import { randomUUID } from 'node:crypto';

import { SPACE_PERMISSIONS } from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import { MemberNotFoundError } from './member-management.ts';

export async function transferOwnership(
  data: DataAccess,
  input: { financialSpaceId: string; currentOwnerId: string; newOwnerId: string },
): Promise<void> {
  await data.transaction(async ({ members, financialSpaces, audit }) => {
    const newOwner = await members.findActive(input.financialSpaceId, input.newOwnerId);
    if (newOwner === null) {
      throw new MemberNotFoundError();
    }
    const closed = await members.remove({
      financialSpaceId: input.financialSpaceId,
      userId: input.newOwnerId,
      expectedVersion: newOwner.version,
      actorUserId: input.currentOwnerId,
    });
    if (!closed) {
      throw new VersionConflictError();
    }
    if (
      !(await financialSpaces.transferOwnership(
        input.financialSpaceId,
        input.currentOwnerId,
        input.newOwnerId,
      ))
    ) {
      throw new VersionConflictError();
    }
    const previousOwnerMembershipId = randomUUID();
    await members.add({
      id: previousOwnerMembershipId,
      financialSpaceId: input.financialSpaceId,
      userId: input.currentOwnerId,
      permissions: [...SPACE_PERMISSIONS],
      addedByUserId: input.currentOwnerId,
    });
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'financial_space',
      entityId: input.financialSpaceId,
      action: 'update',
      actorUserId: input.currentOwnerId,
      changes: { ownerUserId: { before: input.currentOwnerId, after: input.newOwnerId } },
    });
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'financial_space_member',
      entityId: previousOwnerMembershipId,
      action: 'create',
      actorUserId: input.currentOwnerId,
      changes: {
        userId: { before: null, after: input.currentOwnerId },
        permissions: { before: null, after: SPACE_PERMISSIONS.join(',') },
      },
    });
  });
}
