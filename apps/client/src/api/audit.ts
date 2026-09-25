import { useInfiniteQuery } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export function useAuditHistory(spaceId: string) {
  return useInfiniteQuery({
    queryKey: ['financial-spaces', spaceId, 'transactions', 'audit-events'] as const,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/audit-events', {
          params: {
            path: { spaceId },
            query: pageParam === null ? {} : { cursor: pageParam },
          },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
