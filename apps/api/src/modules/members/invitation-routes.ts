import type {
  CreatedInvitation,
  InvitationList,
  InvitationPreview,
  Invitation as InvitationResponse,
} from '@personalfin/api-contract';
import {
  PERMISSION_PRESET_NAMES,
  PERMISSION_PRESETS,
  SPACE_PERMISSIONS,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  hashInvitationToken,
  InvitationNotFoundError,
} from './invitation-management.ts';
import { invitationStatus, type SpaceInvitation } from './member.ts';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const spaceParamsSchema = z.object({ spaceId: z.string() });
const invitationParamsSchema = z.object({ spaceId: z.string(), invitationId: z.string() });
const tokenParamsSchema = z.object({ token: z.string() });

const createSchema = z
  .strictObject({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    preset: z.enum(PERMISSION_PRESET_NAMES as [string, ...string[]]).optional(),
    permissions: z.array(z.enum(SPACE_PERMISSIONS)).max(SPACE_PERMISSIONS.length).optional(),
  })
  .refine((input) => (input.preset === undefined) !== (input.permissions === undefined), {
    message: 'send either preset or permissions',
  });

function toResponse(invitation: SpaceInvitation, now: Date): InvitationResponse {
  return {
    id: invitation.id,
    email: invitation.email,
    permissions: invitation.permissions,
    status: invitationStatus(invitation, now),
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

function requireToken(token: string): string {
  if (!TOKEN_PATTERN.test(token)) {
    throw new InvitationNotFoundError();
  }
  return token;
}

export function registerInvitationRoutes(server: FastifyInstance, data: DataAccess): void {
  server.post(
    '/financial-spaces/:spaceId/invitations',
    async (request, reply): Promise<CreatedInvitation> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'manage_members',
      );
      const input = parseInput(createSchema, request.body);
      const now = new Date();
      const { invitation, token } = await createInvitation(data, {
        financialSpaceId: space.id,
        actorUserId: user.id,
        email: input.email,
        permissions:
          input.permissions ?? PERMISSION_PRESETS[input.preset as keyof typeof PERMISSION_PRESETS],
        now,
      });
      reply.status(201);
      return { invitation: toResponse(invitation, now), token };
    },
  );

  server.get('/financial-spaces/:spaceId/invitations', async (request): Promise<InvitationList> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'manage_members',
    );
    const now = new Date();
    const invitations = await data.repositories.members.listInvitations(space.id);
    return { items: invitations.map((invitation) => toResponse(invitation, now)) };
  });

  server.delete('/financial-spaces/:spaceId/invitations/:invitationId', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const params = parseInput(invitationParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      params.spaceId,
      'manage_members',
    );
    if (!isUuid(params.invitationId)) {
      throw new InvitationNotFoundError();
    }
    await cancelInvitation(data, {
      financialSpaceId: space.id,
      invitationId: params.invitationId,
      actorUserId: user.id,
    });
    return reply.status(204).send();
  });

  server.get('/invitations/:token', async (request): Promise<InvitationPreview> => {
    requireAuthenticatedUser(request);
    const { token } = parseInput(tokenParamsSchema, request.params);
    const invitation = await data.repositories.members.findInvitationByTokenHash(
      hashInvitationToken(requireToken(token)),
    );
    const spaceName =
      invitation === null
        ? null
        : await data.repositories.members.spaceName(invitation.financialSpaceId);
    if (invitation === null || spaceName === null) {
      throw new InvitationNotFoundError();
    }
    return {
      spaceName,
      email: invitation.email,
      permissions: invitation.permissions,
      status: invitationStatus(invitation, new Date()),
      expiresAt: invitation.expiresAt.toISOString(),
    };
  });

  server.post('/invitations/:token/accept', async (request): Promise<{ spaceId: string }> => {
    const user = requireAuthenticatedUser(request);
    const { token } = parseInput(tokenParamsSchema, request.params);
    const invitation = await acceptInvitation(data, {
      token: requireToken(token),
      userId: user.id,
      email: user.email,
      now: new Date(),
    });
    return { spaceId: invitation.financialSpaceId };
  });
}
