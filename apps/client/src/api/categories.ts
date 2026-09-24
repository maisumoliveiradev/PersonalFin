import { useQuery } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

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
