import type { SpacePermission } from '@personalfin/domain';

export interface SpaceMember {
  id: string;
  financialSpaceId: string;
  userId: string;
  name: string;
  email: string;
  permissions: SpacePermission[];
  addedAt: Date;
  version: number;
}

export interface NewSpaceMember {
  id: string;
  financialSpaceId: string;
  userId: string;
  permissions: SpacePermission[];
  addedByUserId: string;
}

export interface SpaceInvitation {
  id: string;
  financialSpaceId: string;
  email: string;
  permissions: SpacePermission[];
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
}

export type NewSpaceInvitation = Omit<
  SpaceInvitation,
  'createdAt' | 'acceptedAt' | 'cancelledAt'
> & { tokenHash: string };

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

export function invitationStatus(invitation: SpaceInvitation, now: Date): InvitationStatus {
  if (invitation.acceptedAt !== null) {
    return 'accepted';
  }
  if (invitation.cancelledAt !== null) {
    return 'cancelled';
  }
  return invitation.expiresAt.getTime() <= now.getTime() ? 'expired' : 'pending';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
