import type {
  CategoryList,
  Category as CategoryResponse,
  CategoryTreeItem,
} from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import {
  buildCategoryTree,
  CATEGORY_KINDS,
  CATEGORY_NAME_MAX_LENGTH,
  type Category,
  type CategoryTreeNode,
  normalizeCategoryName,
} from './category.ts';
import { CategoryNotFoundError } from './category-errors.ts';
import { createCategory, deleteCategory, updateCategory } from './category-management.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const categoryParamsSchema = z.object({ spaceId: z.string(), categoryId: z.string() });
const categoryNameSchema = z
  .string()
  .transform(normalizeCategoryName)
  .pipe(z.string().min(1).max(CATEGORY_NAME_MAX_LENGTH));

const createCategorySchema = z
  .strictObject({
    name: categoryNameSchema,
    kind: z.enum(CATEGORY_KINDS).optional(),
    parentCategoryId: z.uuid().nullable().optional(),
  })
  .refine(
    (input) => input.kind !== undefined || (input.parentCategoryId ?? null) !== null,
    'kind is required for top-level categories',
  );

const updateCategorySchema = z.strictObject({
  version: z.number().int().min(1),
  name: categoryNameSchema.optional(),
  archived: z.boolean().optional(),
});

const versionQuerySchema = z.object({ version: z.coerce.number().int().min(1) });

function toCategoryResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    parentCategoryId: category.parentCategoryId,
    archived: category.archivedAt !== null,
    version: category.version,
  };
}

function toTreeItem(node: CategoryTreeNode): CategoryTreeItem {
  return {
    id: node.category.id,
    name: node.category.name,
    kind: node.category.kind,
    archived: node.category.archivedAt !== null,
    version: node.category.version,
    subcategories: node.subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      archived: subcategory.archivedAt !== null,
      version: subcategory.version,
    })),
  };
}

function requireCategoryId(categoryId: string): string {
  if (!isUuid(categoryId)) {
    throw new CategoryNotFoundError();
  }
  return categoryId;
}

export function registerCategoryRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/categories', async (request): Promise<CategoryList> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view',
    );
    const categories = await data.repositories.categories.listForSpace(space.id);
    return { items: buildCategoryTree(categories).map(toTreeItem) };
  });

  server.post(
    '/financial-spaces/:spaceId/categories',
    async (request, reply): Promise<CategoryResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'classify',
      );
      const input = parseInput(createCategorySchema, request.body);
      const category = await createCategory(data, {
        financialSpaceId: space.id,
        actorUserId: user.id,
        name: input.name,
        parentCategoryId: input.parentCategoryId ?? null,
        ...(input.kind === undefined ? {} : { kind: input.kind }),
      });
      reply.status(201);
      return toCategoryResponse(category);
    },
  );

  server.patch(
    '/financial-spaces/:spaceId/categories/:categoryId',
    async (request): Promise<CategoryResponse> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(categoryParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
        'classify',
      );
      const input = parseInput(updateCategorySchema, request.body);
      const category = await updateCategory(data, {
        financialSpaceId: space.id,
        categoryId: requireCategoryId(params.categoryId),
        actorUserId: user.id,
        expectedVersion: input.version,
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.archived === undefined ? {} : { archived: input.archived }),
      });
      return toCategoryResponse(category);
    },
  );

  server.delete('/financial-spaces/:spaceId/categories/:categoryId', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const params = parseInput(categoryParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      params.spaceId,
      'classify',
    );
    const { version } = parseInput(versionQuerySchema, request.query);
    await deleteCategory(data, {
      financialSpaceId: space.id,
      categoryId: requireCategoryId(params.categoryId),
      actorUserId: user.id,
      expectedVersion: version,
    });
    return reply.status(204).send();
  });
}
