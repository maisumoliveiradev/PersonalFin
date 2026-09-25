import type { MemberList } from '@personalfin/api-contract';
import { SPACE_PERMISSIONS } from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { OWNER_ACCESS } from '../financial-spaces/financial-space.ts';
import {
  PermissionDeniedError,
  requireAccessibleSpace,
} from '../financial-spaces/financial-space-access.ts';
import { changeMemberPermissions, MemberNotFoundError, removeMember } from './member-management.ts';
import { transferOwnership } from './ownership-transfer.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const memberParamsSchema = z.object({ spaceId: z.string(), userId: z.string() });
const updateSchema = z.strictObject({
  version: z.number().int().min(1),
  permissions: z.array(z.enum(SPACE_PERMISSIONS)).max(SPACE_PERMISSIONS.length),
});
const transferSchema = z.strictObject({ newOwnerUserId: z.uuid() });

const versionQuerySchema = z.object({ version: z.coerce.number().int().min(1) });

function requireUserId(userId: string): string {
  if (!isUuid(userId)) {
    throw new MemberNotFoundError();
  }
  return userId;
}

export function registerMemberRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/members', async (request): Promise<MemberList> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view',
    );
    const [owner, members] = await Promise.all([
      data.repositories.members.ownerOf(space.id),
      data.repositories.members.listActive(space.id),
    ]);
    return {
      items: [
        ...(owner === null
          ? []
          : [
              {
                userId: owner.userId,
                name: owner.name,
                email: owner.email,
                role: 'owner' as const,
                permissions: OWNER_ACCESS.permissions,
                version: null,
              },
            ]),
        ...members.map((member) => ({
          userId: member.userId,
          name: member.name,
          email: member.email,
          role: 'member' as const,
          permissions: member.permissions,
          version: member.version,
        })),
      ],
    };
  });

  server.patch('/financial-spaces/:spaceId/members/:userId', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const params = parseInput(memberParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      params.spaceId,
      'manage_members',
    );
    const input = parseInput(updateSchema, request.body);
    await changeMemberPermissions(data, {
      financialSpaceId: space.id,
      userId: requireUserId(params.userId),
      actorUserId: user.id,
      expectedVersion: input.version,
      permissions: input.permissions,
    });
    return reply.status(204).send();
  });

  server.delete('/financial-spaces/:spaceId/members/:userId', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const params = parseInput(memberParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      params.spaceId,
      'manage_members',
    );
    const { version } = parseInput(versionQuerySchema, request.query);
    await removeMember(data, {
      financialSpaceId: space.id,
      userId: requireUserId(params.userId),
      actorUserId: user.id,
      expectedVersion: version,
    });
    return reply.status(204).send();
  });

  server.post('/financial-spaces/:spaceId/leave', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view',
    );
    await removeMember(data, {
      financialSpaceId: space.id,
      userId: user.id,
      actorUserId: user.id,
      expectedVersion: null,
    });
    return reply.status(204).send();
  });

  server.post('/financial-spaces/:spaceId/ownership-transfer', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view',
    );
    if (space.access.role !== 'owner') {
      throw new PermissionDeniedError();
    }
    const { newOwnerUserId } = parseInput(transferSchema, request.body);
    await transferOwnership(data, {
      financialSpaceId: space.id,
      currentOwnerId: user.id,
      newOwnerId: newOwnerUserId,
    });
    return reply.status(204).send();
  });
}
