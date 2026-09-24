import type {
  BalanceReminderSetting,
  RecordBalanceSnapshotRequest,
} from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';
import { dashboardKeys } from './dashboard';

export const balanceKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'balance-snapshots'] as const,
  reminder: (spaceId: string) => ['financial-spaces', spaceId, 'balance-reminder'] as const,
};

export function useBalanceReminder(spaceId: string) {
  return useQuery({
    queryKey: balanceKeys.reminder(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/balance-reminder', {
          params: { path: { spaceId } },
        }),
      ),
  });
}

export function useSaveBalanceReminder(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (setting: BalanceReminderSetting) =>
      expectData(
        await apiClient.PUT('/financial-spaces/{spaceId}/balance-reminder', {
          params: { path: { spaceId } },
          body: setting,
        }),
      ),
    onSuccess: (saved) => queryClient.setQueryData(balanceKeys.reminder(spaceId), saved),
  });
}

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: balanceKeys.forSpace(spaceId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.forSpace(spaceId) }),
      ]);
    },
  });
}
