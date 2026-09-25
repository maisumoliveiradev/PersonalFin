import type { SpacePermission } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { SpaceInvitation, SpaceMember } from './member.ts';
import type { MemberRepository } from './member-repository.ts';

interface MemberRow {
  id: string;
  financial_space_id: string;
  user_id: string;
  name: string;
  email: string;
  permissions: SpacePermission[];
  added_at: Date;
  version: number;
}

interface InvitationRow {
  id: string;
  financial_space_id: string;
  email: string;
  permissions: SpacePermission[];
  created_by_user_id: string;
  created_at: Date;
  expires_at: Date;
  accepted_at: Date | null;
  cancelled_at: Date | null;
}

const MEMBER_SELECT = `SELECT m.id, m.financial_space_id, m.user_id, u.name, u.email, m.permissions,
         m.added_at, m.version
       FROM financial_space_member m JOIN "user" u ON u.id = m.user_id`;

const INVITATION_COLUMNS = `id, financial_space_id, email, permissions, created_by_user_id,
         created_at, expires_at, accepted_at, cancelled_at`;

function toMember(row: MemberRow): SpaceMember {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    permissions: row.permissions,
    addedAt: row.added_at,
    version: row.version,
  };
}

function toInvitation(row: InvitationRow): SpaceInvitation {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    email: row.email,
    permissions: row.permissions,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    cancelledAt: row.cancelled_at,
  };
}

export function createPostgresMemberRepository(db: Queryable): MemberRepository {
  return {
    async listActive(financialSpaceId) {
      const { rows } = await db.query<MemberRow>(
        `${MEMBER_SELECT}
         WHERE m.financial_space_id = $1 AND m.removed_at IS NULL
         ORDER BY m.added_at, m.id`,
        [financialSpaceId],
      );
      return rows.map(toMember);
    },

    async findActive(financialSpaceId, userId) {
      const { rows } = await db.query<MemberRow>(
        `${MEMBER_SELECT}
         WHERE m.financial_space_id = $1 AND m.user_id = $2 AND m.removed_at IS NULL`,
        [financialSpaceId, userId],
      );
      const [row] = rows;
      return row === undefined ? null : toMember(row);
    },

    async isOwnerOrMemberEmail(financialSpaceId, email) {
      const { rowCount } = await db.query(
        `SELECT 1 FROM financial_space s JOIN "user" u ON u.id = s.owner_user_id
         WHERE s.id = $1 AND lower(u.email) = $2
         UNION ALL
         SELECT 1 FROM financial_space_member m JOIN "user" u ON u.id = m.user_id
         WHERE m.financial_space_id = $1 AND m.removed_at IS NULL AND lower(u.email) = $2`,
        [financialSpaceId, email],
      );
      return (rowCount ?? 0) > 0;
    },

    async add(member) {
      await db.query(
        `INSERT INTO financial_space_member
           (id, financial_space_id, user_id, permissions, added_by_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          member.id,
          member.financialSpaceId,
          member.userId,
          member.permissions,
          member.addedByUserId,
        ],
      );
    },

    async createInvitation(invitation) {
      const { rows } = await db.query<InvitationRow>(
        `INSERT INTO space_invitation
           (id, financial_space_id, email, permissions, token_hash, created_by_user_id, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${INVITATION_COLUMNS}`,
        [
          invitation.id,
          invitation.financialSpaceId,
          invitation.email,
          invitation.permissions,
          invitation.tokenHash,
          invitation.createdByUserId,
          invitation.expiresAt,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Invitation insert returned no row');
      }
      return toInvitation(row);
    },

    async listInvitations(financialSpaceId) {
      const { rows } = await db.query<InvitationRow>(
        `SELECT ${INVITATION_COLUMNS} FROM space_invitation
         WHERE financial_space_id = $1 ORDER BY created_at DESC, id`,
        [financialSpaceId],
      );
      return rows.map(toInvitation);
    },

    async findInvitation(financialSpaceId, invitationId) {
      const { rows } = await db.query<InvitationRow>(
        `SELECT ${INVITATION_COLUMNS} FROM space_invitation
         WHERE financial_space_id = $1 AND id = $2`,
        [financialSpaceId, invitationId],
      );
      const [row] = rows;
      return row === undefined ? null : toInvitation(row);
    },

    async findInvitationByTokenHash(tokenHash, options) {
      const lock = options?.lock === true ? 'FOR UPDATE' : '';
      const { rows } = await db.query<InvitationRow>(
        `SELECT ${INVITATION_COLUMNS} FROM space_invitation WHERE token_hash = $1 ${lock}`,
        [tokenHash],
      );
      const [row] = rows;
      return row === undefined ? null : toInvitation(row);
    },

    async cancelInvitation(invitationId, actorUserId) {
      const result = await db.query(
        `UPDATE space_invitation SET cancelled_at = now(), cancelled_by_user_id = $2
         WHERE id = $1 AND accepted_at IS NULL AND cancelled_at IS NULL`,
        [invitationId, actorUserId],
      );
      return result.rowCount === 1;
    },

    async markInvitationAccepted(invitationId, userId) {
      const result = await db.query(
        `UPDATE space_invitation SET accepted_at = now(), accepted_by_user_id = $2
         WHERE id = $1 AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at > now()`,
        [invitationId, userId],
      );
      return result.rowCount === 1;
    },

    async spaceName(financialSpaceId) {
      const { rows } = await db.query<{ name: string }>(
        'SELECT name FROM financial_space WHERE id = $1',
        [financialSpaceId],
      );
      return rows[0]?.name ?? null;
    },

    async ownerOf(financialSpaceId) {
      const { rows } = await db.query<{ user_id: string; name: string; email: string }>(
        `SELECT u.id AS user_id, u.name, u.email
         FROM financial_space s JOIN "user" u ON u.id = s.owner_user_id
         WHERE s.id = $1`,
        [financialSpaceId],
      );
      const [row] = rows;
      return row === undefined ? null : { userId: row.user_id, name: row.name, email: row.email };
    },

    async updatePermissions({ financialSpaceId, userId, expectedVersion, permissions }) {
      const result = await db.query(
        `UPDATE financial_space_member SET permissions = $4, version = version + 1
         WHERE financial_space_id = $1 AND user_id = $2 AND version = $3 AND removed_at IS NULL`,
        [financialSpaceId, userId, expectedVersion, permissions],
      );
      return result.rowCount === 1;
    },

    async remove({ financialSpaceId, userId, expectedVersion, actorUserId }) {
      const result = await db.query(
        `UPDATE financial_space_member
         SET removed_at = now(), removed_by_user_id = $4, version = version + 1
         WHERE financial_space_id = $1 AND user_id = $2 AND version = $3 AND removed_at IS NULL`,
        [financialSpaceId, userId, expectedVersion, actorUserId],
      );
      return result.rowCount === 1;
    },
  };
}
