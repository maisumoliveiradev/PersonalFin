import type { FinancialSpace } from '../../src/modules/financial-spaces/financial-space.ts';
import type { SpaceInvitation } from '../../src/modules/members/member.ts';
import type { MemberRepository } from '../../src/modules/members/member-repository.ts';
import type { InMemoryMember } from './in-memory-financial-space-repository.ts';
import { ana, bruno } from './users.ts';

const USERS = [ana, bruno];

type StoredInvitation = SpaceInvitation & { tokenHash: string };

export function createInMemoryMemberRepository(
  spaces: FinancialSpace[],
  members: InMemoryMember[],
): MemberRepository & { invitations: StoredInvitation[] } {
  const invitations: StoredInvitation[] = [];
  const active = (member: InMemoryMember) => (member.removedAt ?? null) === null;

  function toMember(member: InMemoryMember) {
    const user = USERS.find((candidate) => candidate.id === member.userId);
    return {
      id: member.id ?? '',
      financialSpaceId: member.financialSpaceId,
      userId: member.userId,
      name: user?.name ?? '',
      email: user?.email ?? '',
      permissions: member.permissions,
      addedAt: member.addedAt ?? new Date(0),
      version: member.version ?? 1,
    };
  }

  const strip = ({ tokenHash: _hash, ...invitation }: StoredInvitation): SpaceInvitation =>
    invitation;

  return {
    invitations,
    async listActive(financialSpaceId) {
      return members
        .filter((member) => member.financialSpaceId === financialSpaceId && active(member))
        .map(toMember);
    },
    async findActive(financialSpaceId, userId) {
      const member = members.find(
        (candidate) =>
          candidate.financialSpaceId === financialSpaceId &&
          candidate.userId === userId &&
          active(candidate),
      );
      return member === undefined ? null : toMember(member);
    },
    async isOwnerOrMemberEmail(financialSpaceId, email) {
      const user = USERS.find((candidate) => candidate.email.toLowerCase() === email);
      if (user === undefined) {
        return false;
      }
      const space = spaces.find((candidate) => candidate.id === financialSpaceId);
      return (
        space?.ownerUserId === user.id ||
        members.some(
          (member) =>
            member.financialSpaceId === financialSpaceId &&
            member.userId === user.id &&
            active(member),
        )
      );
    },
    async add(member) {
      members.push({
        id: member.id,
        financialSpaceId: member.financialSpaceId,
        userId: member.userId,
        permissions: member.permissions,
        addedAt: new Date(),
        removedAt: null,
        version: 1,
      });
    },
    async createInvitation({ tokenHash, ...invitation }) {
      const stored: StoredInvitation = {
        ...invitation,
        tokenHash,
        createdAt: new Date(),
        acceptedAt: null,
        cancelledAt: null,
      };
      invitations.push(stored);
      return strip(stored);
    },
    async listInvitations(financialSpaceId) {
      return invitations
        .filter((invitation) => invitation.financialSpaceId === financialSpaceId)
        .map(strip);
    },
    async findInvitation(financialSpaceId, invitationId) {
      const found = invitations.find(
        (invitation) =>
          invitation.financialSpaceId === financialSpaceId && invitation.id === invitationId,
      );
      return found === undefined ? null : strip(found);
    },
    async findInvitationByTokenHash(tokenHash) {
      const found = invitations.find((invitation) => invitation.tokenHash === tokenHash);
      return found === undefined ? null : strip(found);
    },
    async cancelInvitation(invitationId) {
      const found = invitations.find((invitation) => invitation.id === invitationId);
      if (found === undefined || found.acceptedAt !== null || found.cancelledAt !== null) {
        return false;
      }
      found.cancelledAt = new Date();
      return true;
    },
    async markInvitationAccepted(invitationId) {
      const found = invitations.find((invitation) => invitation.id === invitationId);
      if (
        found === undefined ||
        found.acceptedAt !== null ||
        found.cancelledAt !== null ||
        found.expiresAt.getTime() <= Date.now()
      ) {
        return false;
      }
      found.acceptedAt = new Date();
      return true;
    },
    async spaceName(financialSpaceId) {
      return spaces.find((space) => space.id === financialSpaceId)?.name ?? null;
    },
    async ownerOf(financialSpaceId) {
      const space = spaces.find((candidate) => candidate.id === financialSpaceId);
      const owner = USERS.find((user) => user.id === space?.ownerUserId);
      return owner === undefined
        ? null
        : { userId: owner.id, name: owner.name, email: owner.email };
    },
    async updatePermissions({ financialSpaceId, userId, expectedVersion, permissions }) {
      const member = members.find(
        (candidate) =>
          candidate.financialSpaceId === financialSpaceId &&
          candidate.userId === userId &&
          active(candidate) &&
          (candidate.version ?? 1) === expectedVersion,
      );
      if (member === undefined) {
        return false;
      }
      member.permissions = [...permissions] as InMemoryMember['permissions'];
      member.version = (member.version ?? 1) + 1;
      return true;
    },
    async remove({ financialSpaceId, userId, expectedVersion }) {
      const member = members.find(
        (candidate) =>
          candidate.financialSpaceId === financialSpaceId &&
          candidate.userId === userId &&
          active(candidate) &&
          (candidate.version ?? 1) === expectedVersion,
      );
      if (member === undefined) {
        return false;
      }
      member.removedAt = new Date();
      member.version = (member.version ?? 1) + 1;
      return true;
    },
  };
}
