import type { NewSpaceInvitation, NewSpaceMember, SpaceInvitation, SpaceMember } from './member.ts';

export interface MemberRepository {
  listActive(financialSpaceId: string): Promise<SpaceMember[]>;
  findActive(financialSpaceId: string, userId: string): Promise<SpaceMember | null>;
  isOwnerOrMemberEmail(financialSpaceId: string, email: string): Promise<boolean>;
  add(member: NewSpaceMember): Promise<void>;
  createInvitation(invitation: NewSpaceInvitation): Promise<SpaceInvitation>;
  listInvitations(financialSpaceId: string): Promise<SpaceInvitation[]>;
  findInvitation(financialSpaceId: string, invitationId: string): Promise<SpaceInvitation | null>;
  findInvitationByTokenHash(
    tokenHash: string,
    options?: { lock: boolean },
  ): Promise<SpaceInvitation | null>;
  cancelInvitation(invitationId: string, actorUserId: string): Promise<boolean>;
  markInvitationAccepted(invitationId: string, userId: string): Promise<boolean>;
  spaceName(financialSpaceId: string): Promise<string | null>;
  ownerOf(
    financialSpaceId: string,
  ): Promise<{ userId: string; name: string; email: string } | null>;
  updatePermissions(update: {
    financialSpaceId: string;
    userId: string;
    expectedVersion: number;
    permissions: readonly string[];
  }): Promise<boolean>;
  remove(removal: {
    financialSpaceId: string;
    userId: string;
    expectedVersion: number;
    actorUserId: string;
  }): Promise<boolean>;
}
