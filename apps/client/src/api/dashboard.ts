import type { Month } from '@personalfin/domain';
import { useQuery } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const dashboardKeys = {
  forSpace: (spaceId: string) =>
    ['financial-spaces', spaceId, 'transactions', 'dashboard'] as const,
};

export function useProjectionSeries(spaceId: string, fromMonth: Month, months: number) {
  return useQuery({
    queryKey: [...dashboardKeys.forSpace(spaceId), 'projection', fromMonth, months] as const,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/projection', {
          params: { path: { spaceId }, query: { fromMonth, months } },
        }),
      ).items,
  });
}

export function useMonthlyDashboard(spaceId: string, month: Month) {
  return useQuery({
    queryKey: [...dashboardKeys.forSpace(spaceId), month] as const,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/dashboard', {
          params: { path: { spaceId }, query: { month } },
        }),
      ),
  });
}
