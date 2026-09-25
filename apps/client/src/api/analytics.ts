import { useQuery } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

const analyticsKey = (spaceId: string) =>
  ['financial-spaces', spaceId, 'transactions', 'analytics'] as const;

export function useEvolution(spaceId: string, fromMonth: string, months: number) {
  return useQuery({
    queryKey: [...analyticsKey(spaceId), 'evolution', fromMonth, months] as const,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/analytics/evolution', {
          params: { path: { spaceId }, query: { fromMonth, months } },
        }),
      ).items,
  });
}

export function useComparison(spaceId: string, month: string) {
  return useQuery({
    queryKey: [...analyticsKey(spaceId), 'comparison', month] as const,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/analytics/comparison', {
          params: { path: { spaceId }, query: { month } },
        }),
      ),
  });
}
