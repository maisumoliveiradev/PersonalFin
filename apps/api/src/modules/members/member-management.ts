import { normalizePermissions, type SpacePermission } from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { AppError, NotFoundError } from '../../http/errors.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';

export class MemberNotFoundError extends NotFoundError {
  constructor() {
    super('MEMBER_NOT_FOUND', 'Member not found in this space');
  }
}

export class OwnerCannotLeaveError extends AppError {
  override name = 'OwnerCannotLeaveError';

  constructor() {
    super(409, 'OWNER_CANNOT_LEAVE', 'The Owner must transfer ownership before leaving');
  }
}

export async function changeMemberPermissions(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    userId: string;
    actorUserId: string;
    expectedVersion: number;
    permissions: readonly SpacePermission[];
  },
): Promise<void> {
  await data.transaction(async ({ members, audit }) => {
    const current = await members.findActive(input.financialSpaceId, input.userId);
    if (current === null) {
      throw new MemberNotFoundError();
    }
    const permissions = normalizePermissions(input.permissions);
    const updated = await members.updatePermissions({
      financialSpaceId: input.financialSpaceId,
      userId: input.userId,
      expectedVersion: input.expectedVersion,
      permissions,
    });
    if (!updated) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'financial_space_member',
      entityId: current.id,
      action: 'update',
      actorUserId: input.actorUserId,
      changes: {
        permissions: { before: current.permissions.join(','), after: permissions.join(',') },
      },
    });
  });
}

export async function removeMember(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    userId: string;
    actorUserId: string;
    expectedVersion: number | null;
  },
): Promise<void> {
  await data.transaction(async ({ members, audit }) => {
    const current = await members.findActive(input.financialSpaceId, input.userId);
    if (current === null) {
      const owner = await members.ownerOf(input.financialSpaceId);
      if (owner?.userId === input.userId) {
        throw new OwnerCannotLeaveError();
      }
      throw new MemberNotFoundError();
    }
    const removed = await members.remove({
      financialSpaceId: input.financialSpaceId,
      userId: input.userId,
      expectedVersion: input.expectedVersion ?? current.version,
      actorUserId: input.actorUserId,
    });
    if (!removed) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'financial_space_member',
      entityId: current.id,
      action: 'delete',
      actorUserId: input.actorUserId,
      changes: {
        reason: {
          before: null,
          after: input.actorUserId === input.userId ? 'left' : 'removed',
        },
      },
    });
  });
}
