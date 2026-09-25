import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { normalizePermissions, type SpacePermission } from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { AppError, NotFoundError } from '../../http/errors.ts';
import { invitationStatus, normalizeEmail, type SpaceInvitation } from './member.ts';

export const INVITATION_LIFETIME_DAYS = 7;

export class InvitationNotFoundError extends NotFoundError {
  constructor() {
    super('INVITATION_NOT_FOUND', 'Invitation not found');
  }
}

export class InvitationConflictError extends AppError {
  override name = 'InvitationConflictError';

  constructor(code: 'ALREADY_MEMBER' | 'INVITATION_PENDING', message: string) {
    super(409, code, message);
  }
}

export class InvitationNotAvailableError extends AppError {
  override name = 'InvitationNotAvailableError';

  constructor() {
    super(410, 'INVITATION_NOT_AVAILABLE', 'The invitation expired, was cancelled, or was used');
  }
}

export class InvitationEmailMismatchError extends AppError {
  override name = 'InvitationEmailMismatchError';

  constructor() {
    super(403, 'INVITATION_EMAIL_MISMATCH', 'The invitation was sent to another email address');
  }
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface CreateInvitationInput {
  financialSpaceId: string;
  actorUserId: string;
  email: string;
  permissions: readonly SpacePermission[];
  now: Date;
}

export async function createInvitation(
  data: DataAccess,
  input: CreateInvitationInput,
): Promise<{ invitation: SpaceInvitation; token: string }> {
  const email = normalizeEmail(input.email);
  return data.transaction(async ({ members, audit }) => {
    if (await members.isOwnerOrMemberEmail(input.financialSpaceId, email)) {
      throw new InvitationConflictError('ALREADY_MEMBER', 'This person already has access');
    }
    const pending = (await members.listInvitations(input.financialSpaceId)).some(
      (invitation) =>
        invitation.email === email && invitationStatus(invitation, input.now) === 'pending',
    );
    if (pending) {
      throw new InvitationConflictError(
        'INVITATION_PENDING',
        'There is already a pending invitation for this email',
      );
    }
    const token = randomBytes(32).toString('base64url');
    const invitation = await members.createInvitation({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      email,
      permissions: normalizePermissions(input.permissions),
      tokenHash: hashInvitationToken(token),
      createdByUserId: input.actorUserId,
      expiresAt: new Date(input.now.getTime() + INVITATION_LIFETIME_DAYS * 86_400_000),
    });
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'space_invitation',
      entityId: invitation.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: {
        email: { before: null, after: email },
        permissions: { before: null, after: invitation.permissions.join(',') },
      },
    });
    return { invitation, token };
  });
}

export async function cancelInvitation(
  data: DataAccess,
  input: { financialSpaceId: string; invitationId: string; actorUserId: string },
): Promise<void> {
  await data.transaction(async ({ members, audit }) => {
    const invitation = await members.findInvitation(input.financialSpaceId, input.invitationId);
    if (invitation === null) {
      throw new InvitationNotFoundError();
    }
    if (!(await members.cancelInvitation(invitation.id, input.actorUserId))) {
      throw new InvitationNotAvailableError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'space_invitation',
      entityId: invitation.id,
      action: 'delete',
      actorUserId: input.actorUserId,
      changes: { status: { before: 'pending', after: 'cancelled' } },
    });
  });
}

export async function acceptInvitation(
  data: DataAccess,
  input: { token: string; userId: string; email: string; now: Date },
): Promise<SpaceInvitation> {
  return data.transaction(async ({ members, audit }) => {
    const invitation = await members.findInvitationByTokenHash(hashInvitationToken(input.token), {
      lock: true,
    });
    if (invitation === null) {
      throw new InvitationNotFoundError();
    }
    if (invitationStatus(invitation, input.now) !== 'pending') {
      throw new InvitationNotAvailableError();
    }
    if (normalizeEmail(input.email) !== invitation.email) {
      throw new InvitationEmailMismatchError();
    }
    if (await members.isOwnerOrMemberEmail(invitation.financialSpaceId, invitation.email)) {
      throw new InvitationConflictError('ALREADY_MEMBER', 'This person already has access');
    }
    if (!(await members.markInvitationAccepted(invitation.id, input.userId))) {
      throw new InvitationNotAvailableError();
    }
    const memberId = randomUUID();
    await members.add({
      id: memberId,
      financialSpaceId: invitation.financialSpaceId,
      userId: input.userId,
      permissions: invitation.permissions,
      addedByUserId: invitation.createdByUserId,
    });
    await audit.record({
      financialSpaceId: invitation.financialSpaceId,
      entityType: 'space_invitation',
      entityId: invitation.id,
      action: 'update',
      actorUserId: input.userId,
      changes: { status: { before: 'pending', after: 'accepted' } },
    });
    await audit.record({
      financialSpaceId: invitation.financialSpaceId,
      entityType: 'financial_space_member',
      entityId: memberId,
      action: 'create',
      actorUserId: input.userId,
      changes: {
        userId: { before: null, after: input.userId },
        permissions: { before: null, after: invitation.permissions.join(',') },
      },
    });
    return { ...invitation, acceptedAt: input.now };
  });
}
