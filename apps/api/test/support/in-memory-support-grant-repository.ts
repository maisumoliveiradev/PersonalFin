import type {
  SupportGrant,
  SupportGrantRepository,
} from '../../src/modules/support/support-grant.ts';
import type { InMemorySupportGrant } from './in-memory-financial-space-repository.ts';
import { ana, bruno } from './users.ts';

const USERS = [ana, bruno];

export function createInMemorySupportGrantRepository(
  grants: InMemorySupportGrant[],
  admins: ReadonlySet<string>,
  spaceName: (spaceId: string) => string,
): SupportGrantRepository {
  const toGrant = (grant: InMemorySupportGrant): SupportGrant => {
    const admin = USERS.find((user) => user.id === grant.adminUserId);
    return {
      id: grant.id,
      financialSpaceId: grant.financialSpaceId,
      spaceName: spaceName(grant.financialSpaceId),
      grantedByUserId: grant.grantedByUserId,
      adminUserId: grant.adminUserId,
      adminName: admin?.name ?? '',
      adminEmail: admin?.email ?? '',
      reason: grant.reason,
      createdAt: grant.createdAt,
      expiresAt: grant.expiresAt,
      revokedAt: grant.revokedAt,
      lastAccessAt: grant.accesses.at(-1) ?? null,
      accessCount: grant.accesses.length,
    };
  };
  return {
    async findAdminByEmail(email) {
      const user = USERS.find((candidate) => candidate.email === email.toLowerCase());
      return user !== undefined && admins.has(user.id) ? { id: user.id } : null;
    },
    async create(grant) {
      const created = { ...grant, createdAt: new Date(), revokedAt: null, accesses: [] };
      grants.push(created);
      return toGrant(created);
    },
    async listForSpace(financialSpaceId) {
      return grants.filter((grant) => grant.financialSpaceId === financialSpaceId).map(toGrant);
    },
    async listActiveForAdmin(adminUserId) {
      return grants
        .filter(
          (grant) =>
            grant.adminUserId === adminUserId &&
            grant.revokedAt === null &&
            grant.expiresAt.getTime() > Date.now(),
        )
        .map(toGrant);
    },
    async revoke(financialSpaceId, grantId) {
      const grant = grants.find(
        (candidate) =>
          candidate.id === grantId &&
          candidate.financialSpaceId === financialSpaceId &&
          candidate.revokedAt === null,
      );
      if (grant === undefined) {
        return null;
      }
      grant.revokedAt = new Date();
      return toGrant(grant);
    },
  };
}
