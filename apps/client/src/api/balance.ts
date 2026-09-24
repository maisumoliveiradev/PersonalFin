import type { RecordBalanceSnapshotRequest } from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const balanceKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'balance-snapshots'] as const,
};

export function useBalanceSnapshots(spaceId: string) {
  return useQuery({
    queryKey: balanceKeys.forSpace(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/balance-snapshots', {
          params: { path: { spaceId } },
        }),
      ),
  });
}

export function useRecordBalanceSnapshot(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordBalanceSnapshotRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/balance-snapshots', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: balanceKeys.forSpace(spaceId) });
    },
  });
}
