import { randomUUID } from 'node:crypto';

import type {
  CreateFinancialSpaceRequest,
  FinancialSpaceList,
  FinancialSpace as FinancialSpaceResponse,
} from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import {
  FINANCIAL_SPACE_NAME_MAX_LENGTH,
  type FinancialSpace,
  normalizeFinancialSpaceName,
} from './financial-space.ts';
import { requireAccessibleSpace } from './financial-space-access.ts';
import type { FinancialSpaceRepository } from './financial-space-repository.ts';

const createFinancialSpaceSchema = z.strictObject({
  name: z
    .string()
    .transform(normalizeFinancialSpaceName)
    .pipe(z.string().min(1).max(FINANCIAL_SPACE_NAME_MAX_LENGTH)),
}) satisfies z.ZodType<CreateFinancialSpaceRequest, CreateFinancialSpaceRequest>;

const spaceParamsSchema = z.object({ spaceId: z.string() });

function toResponse(space: FinancialSpace): FinancialSpaceResponse {
  return {
    id: space.id,
    name: space.name,
    lifecycleState: space.lifecycleState,
    role: 'owner',
    createdAt: space.createdAt.toISOString(),
  };
}

export function registerFinancialSpaceRoutes(
  server: FastifyInstance,
  repository: FinancialSpaceRepository,
): void {
  server.get('/financial-spaces', async (request): Promise<FinancialSpaceList> => {
    const user = requireAuthenticatedUser(request);
    const spaces = await repository.listAccessibleTo(user.id);
    return { items: spaces.map(toResponse) };
  });

  server.post('/financial-spaces', async (request, reply): Promise<FinancialSpaceResponse> => {
    const user = requireAuthenticatedUser(request);
    const input = parseInput(createFinancialSpaceSchema, request.body);
    const space = await repository.create({
      id: randomUUID(),
      name: input.name,
      ownerUserId: user.id,
    });
    reply.status(201);
    return toResponse(space);
  });

  server.get('/financial-spaces/:spaceId', async (request): Promise<FinancialSpaceResponse> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    return toResponse(await requireAccessibleSpace(repository, user.id, spaceId));
  });
}
