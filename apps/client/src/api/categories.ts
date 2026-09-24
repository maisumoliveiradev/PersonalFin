import type {
  CategoryTreeItem,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiRequestError, apiClient, expectData } from './api-client';

export const categoryKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'categories'] as const,
};

export function useCategories(spaceId: string) {
  return useQuery({
    queryKey: categoryKeys.forSpace(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/categories', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

export interface CategoryNode {
  id: string;
  name: string;
  kind: CategoryTreeItem['kind'];
  archived: boolean;
  version: number;
  parent: CategoryTreeItem | null;
  subcategories: CategoryTreeItem['subcategories'];
}

export function findCategoryNode(
  tree: readonly CategoryTreeItem[],
  categoryId: string,
): CategoryNode | null {
  for (const category of tree) {
    if (category.id === categoryId) {
      return { ...category, parent: null };
    }
    const subcategory = category.subcategories.find((item) => item.id === categoryId);
    if (subcategory !== undefined) {
      return { ...subcategory, kind: category.kind, parent: category, subcategories: [] };
    }
  }
  return null;
}

function useInvalidateCategories(spaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId] });
}

export function useCreateCategory(spaceId: string) {
  const invalidate = useInvalidateCategories(spaceId);
  return useMutation({
    mutationFn: async (input: CreateCategoryRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/categories', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useUpdateCategory(spaceId: string, categoryId: string) {
  const invalidate = useInvalidateCategories(spaceId);
  return useMutation({
    mutationFn: async (input: UpdateCategoryRequest) =>
      expectData(
        await apiClient.PATCH('/financial-spaces/{spaceId}/categories/{categoryId}', {
          params: { path: { spaceId, categoryId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useDeleteCategory(spaceId: string, categoryId: string) {
  const invalidate = useInvalidateCategories(spaceId);
  return useMutation({
    mutationFn: async (version: number) => {
      const { error, response } = await apiClient.DELETE(
        '/financial-spaces/{spaceId}/categories/{categoryId}',
        { params: { path: { spaceId, categoryId }, query: { version } } },
      );
      if (!response.ok) {
        throw new ApiRequestError(response.status, error?.error.code ?? 'UNKNOWN');
      }
    },
    onSettled: invalidate,
  });
}
