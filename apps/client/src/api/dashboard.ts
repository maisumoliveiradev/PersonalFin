import type { Month } from '@personalfin/domain';
import { useQuery } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const dashboardKeys = {
  forSpace: (spaceId: string) =>
    ['financial-spaces', spaceId, 'transactions', 'dashboard'] as const,
};

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
