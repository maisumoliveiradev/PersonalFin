import { randomUUID } from 'node:crypto';

import type { DataAccess } from '../../database/data-access.ts';
import { diffFields } from '../audit/audit-event.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import type { Category, CategoryKind } from './category.ts';
import {
  CategoryDeletionBlockedError,
  CategoryNotFoundError,
  ParentCategoryNotAvailableError,
} from './category-errors.ts';

export interface CreateCategoryInput {
  financialSpaceId: string;
  actorUserId: string;
  name: string;
  kind?: CategoryKind;
  parentCategoryId: string | null;
}

export async function createCategory(
  data: DataAccess,
  input: CreateCategoryInput,
): Promise<Category> {
  return data.transaction(async ({ categories, audit }) => {
    let kind = input.kind;
    if (input.parentCategoryId !== null) {
      const parent = await categories.findInSpace(input.financialSpaceId, input.parentCategoryId);
      if (
        parent === null ||
        parent.parentCategoryId !== null ||
        parent.archivedAt !== null ||
        (kind !== undefined && kind !== parent.kind)
      ) {
        throw new ParentCategoryNotAvailableError();
      }
      kind = parent.kind;
    }
    if (kind === undefined) {
      throw new ParentCategoryNotAvailableError();
    }
    const category = await categories.create({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      parentCategoryId: input.parentCategoryId,
      kind,
      name: input.name,
    });
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'category',
      entityId: category.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: {
        name: { before: null, after: category.name },
        kind: { before: null, after: category.kind },
        parentCategoryId: { before: null, after: category.parentCategoryId },
      },
    });
    return category;
  });
}

export interface UpdateCategoryInput {
  financialSpaceId: string;
  categoryId: string;
  actorUserId: string;
  expectedVersion: number;
  name?: string;
  archived?: boolean;
}

export async function updateCategory(
  data: DataAccess,
  input: UpdateCategoryInput,
): Promise<Category> {
  return data.transaction(async ({ categories, audit }) => {
    const current = await categories.findInSpace(input.financialSpaceId, input.categoryId, {
      lock: true,
    });
    if (current === null) {
      throw new CategoryNotFoundError();
    }
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    const before = { name: current.name, archived: current.archivedAt !== null };
    const after = {
      name: input.name ?? before.name,
      archived: input.archived ?? before.archived,
    };
    const changes = diffFields(before, after);
    if (Object.keys(changes).length === 0) {
      return current;
    }
    const updated = await categories.update({
      financialSpaceId: input.financialSpaceId,
      categoryId: input.categoryId,
      expectedVersion: input.expectedVersion,
      ...after,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'category',
      entityId: input.categoryId,
      action: 'update',
      actorUserId: input.actorUserId,
      changes,
    });
    return updated;
  });
}

export interface DeleteCategoryInput {
  financialSpaceId: string;
  categoryId: string;
  actorUserId: string;
  expectedVersion: number;
}

export async function deleteCategory(data: DataAccess, input: DeleteCategoryInput): Promise<void> {
  await data.transaction(async ({ categories, audit }) => {
    const current = await categories.findInSpace(input.financialSpaceId, input.categoryId, {
      lock: true,
    });
    if (current === null) {
      throw new CategoryNotFoundError();
    }
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    if ((await categories.countSubcategories(input.financialSpaceId, input.categoryId)) > 0) {
      throw new CategoryDeletionBlockedError('has_subcategories');
    }
    if ((await categories.countTransactionsUsing(input.financialSpaceId, input.categoryId)) > 0) {
      throw new CategoryDeletionBlockedError('in_use');
    }
    const deleted = await categories.delete(
      input.financialSpaceId,
      input.categoryId,
      input.expectedVersion,
    );
    if (!deleted) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'category',
      entityId: input.categoryId,
      action: 'delete',
      actorUserId: input.actorUserId,
      changes: {
        name: { before: current.name, after: null },
        kind: { before: current.kind, after: null },
        parentCategoryId: { before: current.parentCategoryId, after: null },
      },
    });
  });
}
