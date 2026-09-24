import type { FinancialDate } from '@personalfin/domain';
import { useQuery } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export function useCommitments(spaceId: string, from: FinancialDate, days: number) {
  return useQuery({
    queryKey: ['financial-spaces', spaceId, 'transactions', 'commitments', from, days] as const,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/commitments', {
          params: { path: { spaceId }, query: { from, days } },
        }),
      ),
  });
}
