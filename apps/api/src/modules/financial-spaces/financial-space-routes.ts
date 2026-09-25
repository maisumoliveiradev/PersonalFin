import type {
  CreateFinancialSpaceRequest,
  FinancialSpaceList,
  FinancialSpace as FinancialSpaceResponse,
} from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { createFinancialSpace } from './create-financial-space.ts';
import {
  FINANCIAL_SPACE_NAME_MAX_LENGTH,
  type FinancialSpace,
  normalizeFinancialSpaceName,
  OWNER_ACCESS,
  type SpaceAccess,
} from './financial-space.ts';
import { requireAccessibleSpace } from './financial-space-access.ts';

const createFinancialSpaceSchema = z.strictObject({
  name: z
    .string()
    .transform(normalizeFinancialSpaceName)
    .pipe(z.string().min(1).max(FINANCIAL_SPACE_NAME_MAX_LENGTH)),
}) satisfies z.ZodType<CreateFinancialSpaceRequest, CreateFinancialSpaceRequest>;

const spaceParamsSchema = z.object({ spaceId: z.string() });

function toResponse(space: FinancialSpace, access: SpaceAccess): FinancialSpaceResponse {
  return {
    id: space.id,
    name: space.name,
    lifecycleState: space.lifecycleState,
    role: access.role,
    permissions: access.permissions,
    createdAt: space.createdAt.toISOString(),
  };
}

export function registerFinancialSpaceRoutes(server: FastifyInstance, data: DataAccess): void {
  const repository = data.repositories.financialSpaces;

  server.get('/financial-spaces', async (request): Promise<FinancialSpaceList> => {
    const user = requireAuthenticatedUser(request);
    const spaces = await repository.listAccessibleTo(user.id);
    return { items: spaces.map((space) => toResponse(space, space.access)) };
  });

  server.post('/financial-spaces', async (request, reply): Promise<FinancialSpaceResponse> => {
    const user = requireAuthenticatedUser(request);
    const input = parseInput(createFinancialSpaceSchema, request.body);
    const space = await createFinancialSpace(data, { name: input.name, ownerUserId: user.id });
    reply.status(201);
    return toResponse(space, OWNER_ACCESS);
  });

  server.get('/financial-spaces/:spaceId', async (request): Promise<FinancialSpaceResponse> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(repository, user.id, spaceId, 'view');
    return toResponse(space, space.access);
  });
}
