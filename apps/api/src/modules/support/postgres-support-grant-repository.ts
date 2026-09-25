import type { Queryable } from '../../database/pool.ts';
import type { SupportGrant, SupportGrantRepository } from './support-grant.ts';

interface GrantRow {
  id: string;
  financial_space_id: string;
  space_name: string;
  granted_by_user_id: string;
  admin_user_id: string;
  admin_name: string;
  admin_email: string;
  reason: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  last_access_at: Date | null;
  access_count: number;
}

const SELECT = `SELECT g.id, g.financial_space_id, s.name AS space_name, g.granted_by_user_id,
    g.admin_user_id, u.name AS admin_name, u.email AS admin_email, g.reason, g.created_at,
    g.expires_at, g.revoked_at,
    (SELECT max(e.occurred_at) FROM audit_event e
     WHERE e.entity_type = 'support_grant' AND e.entity_id = g.id AND e.action = 'access') AS last_access_at,
    (SELECT count(*)::int FROM audit_event e
     WHERE e.entity_type = 'support_grant' AND e.entity_id = g.id AND e.action = 'access') AS access_count
  FROM support_grant g
  JOIN financial_space s ON s.id = g.financial_space_id
  JOIN "user" u ON u.id = g.admin_user_id`;

function toGrant(row: GrantRow): SupportGrant {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    spaceName: row.space_name,
    grantedByUserId: row.granted_by_user_id,
    adminUserId: row.admin_user_id,
    adminName: row.admin_name,
    adminEmail: row.admin_email,
    reason: row.reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastAccessAt: row.last_access_at,
    accessCount: row.access_count,
  };
}

export function createPostgresSupportGrantRepository(db: Queryable): SupportGrantRepository {
  const findById = async (grantId: string) => {
    const { rows } = await db.query<GrantRow>(`${SELECT} WHERE g.id = $1`, [grantId]);
    const [row] = rows;
    return row === undefined ? null : toGrant(row);
  };
  return {
    async findAdminByEmail(email) {
      const { rows } = await db.query<{ id: string }>(
        `SELECT u.id FROM "user" u JOIN platform_admin a ON a.user_id = u.id
         WHERE lower(u.email) = lower($1)`,
        [email],
      );
      return rows[0] ?? null;
    },

    async create(grant) {
      await db.query(
        `INSERT INTO support_grant (id, financial_space_id, granted_by_user_id, admin_user_id,
           reason, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          grant.id,
          grant.financialSpaceId,
          grant.grantedByUserId,
          grant.adminUserId,
          grant.reason,
          grant.expiresAt,
        ],
      );
      const created = await findById(grant.id);
      if (created === null) {
        throw new Error('Support grant could not be read back');
      }
      return created;
    },

    async listForSpace(financialSpaceId) {
      const { rows } = await db.query<GrantRow>(
        `${SELECT} WHERE g.financial_space_id = $1 ORDER BY g.created_at DESC, g.id`,
        [financialSpaceId],
      );
      return rows.map(toGrant);
    },

    async listActiveForAdmin(adminUserId) {
      const { rows } = await db.query<GrantRow>(
        `${SELECT} WHERE g.admin_user_id = $1 AND g.revoked_at IS NULL AND g.expires_at > now()
         ORDER BY g.expires_at, g.id`,
        [adminUserId],
      );
      return rows.map(toGrant);
    },

    async revoke(financialSpaceId, grantId, actorUserId) {
      const result = await db.query(
        `UPDATE support_grant SET revoked_at = now(), revoked_by_user_id = $3
         WHERE financial_space_id = $1 AND id = $2 AND revoked_at IS NULL`,
        [financialSpaceId, grantId, actorUserId],
      );
      return result.rowCount === 1 ? findById(grantId) : null;
    },
  };
}
