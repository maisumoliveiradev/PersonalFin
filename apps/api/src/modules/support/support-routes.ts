import { randomUUID } from 'node:crypto';

import type {
  SupportGrantList,
  SupportGrant as SupportGrantResponse,
} from '@personalfin/api-contract';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requirePlatformAdmin } from '../admin/platform-admin.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import {
  MAX_SUPPORT_GRANT_DAYS,
  OwnerOnlyError,
  SupportAdminNotFoundError,
  type SupportGrant,
  SupportGrantNotFoundError,
} from './support-grant.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

const spaceParamsSchema = z.object({ spaceId: z.string() }).loose();
const grantParamsSchema = z.object({ grantId: z.string() }).loose();
const createSchema = z.strictObject({
  adminEmail: z.string().trim().toLowerCase().pipe(z.email()),
  reason: z.string().trim().min(5).max(500),
  days: z.number().int().min(1).max(MAX_SUPPORT_GRANT_DAYS),
});

function toResponse(grant: SupportGrant, now: Date): SupportGrantResponse {
  let status: SupportGrantResponse['status'] = 'active';
  if (grant.revokedAt !== null) {
    status = 'revoked';
  } else if (grant.expiresAt <= now) {
    status = 'expired';
  }
  return {
    id: grant.id,
    spaceId: grant.financialSpaceId,
    spaceName: grant.spaceName,
    adminName: grant.adminName,
    adminEmail: grant.adminEmail,
    reason: grant.reason,
    scope: 'view',
    status,
    createdAt: grant.createdAt.toISOString(),
    expiresAt: grant.expiresAt.toISOString(),
    revokedAt: grant.revokedAt?.toISOString() ?? null,
    lastAccessAt: grant.lastAccessAt?.toISOString() ?? null,
    accessCount: grant.accessCount,
  };
}

export function registerSupportRoutes(server: FastifyInstance, data: DataAccess): void {
  async function ownerSpace(request: FastifyRequest) {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'manage_members',
    );
    if (space.access.role !== 'owner') {
      throw new OwnerOnlyError();
    }
    return { userId: user.id, spaceId: space.id };
  }

  server.get(
    '/financial-spaces/:spaceId/support-grants',
    async (request): Promise<SupportGrantList> => {
      const { spaceId } = await ownerSpace(request);
      const now = new Date();
      const grants = await data.repositories.supportGrants.listForSpace(spaceId);
      return { items: grants.map((grant) => toResponse(grant, now)) };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/support-grants',
    async (request, reply): Promise<SupportGrantResponse> => {
      const { userId, spaceId } = await ownerSpace(request);
      const input = parseInput(createSchema, request.body);
      const grant = await data.transaction(async (repositories) => {
        const admin = await repositories.supportGrants.findAdminByEmail(input.adminEmail);
        if (admin === null) {
          throw new SupportAdminNotFoundError();
        }
        const created = await repositories.supportGrants.create({
          id: randomUUID(),
          financialSpaceId: spaceId,
          grantedByUserId: userId,
          adminUserId: admin.id,
          reason: input.reason,
          expiresAt: new Date(Date.now() + input.days * DAY_MS),
        });
        await repositories.audit.record({
          financialSpaceId: spaceId,
          entityType: 'support_grant',
          entityId: created.id,
          action: 'create',
          actorUserId: userId,
          changes: {
            adminEmail: { before: null, after: created.adminEmail },
            reason: { before: null, after: created.reason },
            expiresAt: { before: null, after: created.expiresAt.toISOString() },
          },
        });
        return created;
      });
      reply.status(201);
      return toResponse(grant, new Date());
    },
  );

  server.post(
    '/financial-spaces/:spaceId/support-grants/:grantId/revoke',
    async (request): Promise<SupportGrantResponse> => {
      const { userId, spaceId } = await ownerSpace(request);
      const { grantId } = parseInput(grantParamsSchema, request.params);
      if (!isUuid(grantId)) {
        throw new SupportGrantNotFoundError();
      }
      const revoked = await data.transaction(async (repositories) => {
        const grant = await repositories.supportGrants.revoke(spaceId, grantId, userId);
        if (grant === null) {
          throw new SupportGrantNotFoundError();
        }
        await repositories.audit.record({
          financialSpaceId: spaceId,
          entityType: 'support_grant',
          entityId: grant.id,
          action: 'delete',
          actorUserId: userId,
          changes: { revokedAt: { before: null, after: grant.revokedAt?.toISOString() ?? null } },
        });
        return grant;
      });
      return toResponse(revoked, new Date());
    },
  );

  server.get('/admin/support-grants', async (request): Promise<SupportGrantList> => {
    const user = await requirePlatformAdmin(request, data);
    const now = new Date();
    const grants = await data.repositories.supportGrants.listActiveForAdmin(user.id);
    return { items: grants.map((grant) => toResponse(grant, now)) };
  });
}
