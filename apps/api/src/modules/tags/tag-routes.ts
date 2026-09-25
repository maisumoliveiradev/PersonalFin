import type { TagList, Tag as TagResponse } from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { normalizeTagName, TAG_NAME_MAX_LENGTH, type Tag } from './tag.ts';
import { TagNotFoundError } from './tag-errors.ts';
import { createTag, deleteTag, updateTag } from './tag-management.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const tagParamsSchema = z.object({ spaceId: z.string(), tagId: z.string() });
const nameSchema = z
  .string()
  .transform(normalizeTagName)
  .pipe(z.string().min(1).max(TAG_NAME_MAX_LENGTH));
const createSchema = z.strictObject({ name: nameSchema });
const updateSchema = z.strictObject({
  version: z.number().int().min(1),
  name: nameSchema.optional(),
  archived: z.boolean().optional(),
});
const versionQuerySchema = z.object({ version: z.coerce.number().int().min(1) });

function toResponse(tag: Tag): TagResponse {
  return { id: tag.id, name: tag.name, archived: tag.archivedAt !== null, version: tag.version };
}

function requireTagId(tagId: string): string {
  if (!isUuid(tagId)) {
    throw new TagNotFoundError();
  }
  return tagId;
}

export function registerTagRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/tags', async (request): Promise<TagList> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(data.repositories.financialSpaces, user.id, spaceId);
    return { items: (await data.repositories.tags.listForSpace(space.id)).map(toResponse) };
  });

  server.post('/financial-spaces/:spaceId/tags', async (request, reply): Promise<TagResponse> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(data.repositories.financialSpaces, user.id, spaceId);
    const { name } = parseInput(createSchema, request.body);
    const tag = await createTag(data, { financialSpaceId: space.id, actorUserId: user.id, name });
    reply.status(201);
    return toResponse(tag);
  });

  server.patch('/financial-spaces/:spaceId/tags/:tagId', async (request): Promise<TagResponse> => {
    const user = requireAuthenticatedUser(request);
    const params = parseInput(tagParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      params.spaceId,
    );
    const input = parseInput(updateSchema, request.body);
    const tag = await updateTag(data, {
      financialSpaceId: space.id,
      tagId: requireTagId(params.tagId),
      actorUserId: user.id,
      expectedVersion: input.version,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.archived === undefined ? {} : { archived: input.archived }),
    });
    return toResponse(tag);
  });

  server.delete('/financial-spaces/:spaceId/tags/:tagId', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const params = parseInput(tagParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      params.spaceId,
    );
    const { version } = parseInput(versionQuerySchema, request.query);
    await deleteTag(data, {
      financialSpaceId: space.id,
      tagId: requireTagId(params.tagId),
      actorUserId: user.id,
      expectedVersion: version,
    });
    return reply.status(204).send();
  });
}
