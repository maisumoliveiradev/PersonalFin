import type { CategoryList, CategoryTreeItem } from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { buildCategoryTree, type CategoryTreeNode } from './category.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });

function toResponse(node: CategoryTreeNode): CategoryTreeItem {
  return {
    id: node.category.id,
    name: node.category.name,
    kind: node.category.kind,
    subcategories: node.subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
    })),
  };
}

export function registerCategoryRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/categories', async (request): Promise<CategoryList> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(data.repositories.financialSpaces, user.id, spaceId);
    const categories = await data.repositories.categories.listForSpace(space.id);
    return { items: buildCategoryTree(categories).map(toResponse) };
  });
}
