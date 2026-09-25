import { randomUUID } from 'node:crypto';

import type { DataAccess, Repositories } from '../../database/data-access.ts';
import { diffFields } from '../audit/audit-event.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import type { Tag } from './tag.ts';
import { TagInUseError, TagNotAvailableError, TagNotFoundError } from './tag-errors.ts';

export async function createTag(
  data: DataAccess,
  input: { financialSpaceId: string; actorUserId: string; name: string },
): Promise<Tag> {
  return data.transaction(async ({ tags, audit }) => {
    const tag = await tags.create({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      name: input.name,
      createdByUserId: input.actorUserId,
    });
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'tag',
      entityId: tag.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: { name: { before: null, after: tag.name } },
    });
    return tag;
  });
}

export interface UpdateTagInput {
  financialSpaceId: string;
  tagId: string;
  actorUserId: string;
  expectedVersion: number;
  name?: string;
  archived?: boolean;
}

export async function updateTag(data: DataAccess, input: UpdateTagInput): Promise<Tag> {
  return data.transaction(async ({ tags, audit }) => {
    const current = await tags.findInSpace(input.financialSpaceId, input.tagId, { lock: true });
    if (current === null) {
      throw new TagNotFoundError();
    }
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    const before = { name: current.name, archived: current.archivedAt !== null };
    const after = { name: input.name ?? before.name, archived: input.archived ?? before.archived };
    const changes = diffFields(before, after);
    if (Object.keys(changes).length === 0) {
      return current;
    }
    const updated = await tags.update({
      financialSpaceId: input.financialSpaceId,
      tagId: input.tagId,
      expectedVersion: input.expectedVersion,
      ...after,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'tag',
      entityId: input.tagId,
      action: 'update',
      actorUserId: input.actorUserId,
      changes,
    });
    return updated;
  });
}

export async function deleteTag(
  data: DataAccess,
  input: { financialSpaceId: string; tagId: string; actorUserId: string; expectedVersion: number },
): Promise<void> {
  await data.transaction(async ({ tags, audit }) => {
    const current = await tags.findInSpace(input.financialSpaceId, input.tagId, { lock: true });
    if (current === null) {
      throw new TagNotFoundError();
    }
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    if ((await tags.countUses(input.financialSpaceId, input.tagId)) > 0) {
      throw new TagInUseError();
    }
    if (!(await tags.delete(input.financialSpaceId, input.tagId, input.expectedVersion))) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'tag',
      entityId: input.tagId,
      action: 'delete',
      actorUserId: input.actorUserId,
      changes: { name: { before: current.name, after: null } },
    });
  });
}

export async function assertTagSelection(
  { tags }: Pick<Repositories, 'tags'>,
  financialSpaceId: string,
  tagIds: readonly string[],
  alreadyAssigned: readonly string[] = [],
): Promise<void> {
  for (const tagId of tagIds) {
    const tag = await tags.findInSpace(financialSpaceId, tagId);
    if (tag === null || (tag.archivedAt !== null && !alreadyAssigned.includes(tagId))) {
      throw new TagNotAvailableError();
    }
  }
}
