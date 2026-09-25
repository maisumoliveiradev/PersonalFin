import type { ReminderSettings, ReminderStage } from '@personalfin/api-contract';
import type { FinancialDate } from '@personalfin/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const reminderKeys = {
  list: (spaceId: string) => ['financial-spaces', spaceId, 'reminders'] as const,
  settings: (spaceId: string) => ['financial-spaces', spaceId, 'reminder-settings'] as const,
};

export function useReminders(spaceId: string, today: FinancialDate) {
  return useQuery({
    queryKey: [...reminderKeys.list(spaceId), today] as const,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/reminders', {
          params: { path: { spaceId }, query: { today } },
        }),
      ).items,
  });
}

export function useDismissReminder(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: string; stage: ReminderStage }) => {
      const result = await apiClient.POST('/financial-spaces/{spaceId}/reminders/dismissals', {
        params: { path: { spaceId } },
        body: input,
      });
      if (!result.response.ok) {
        throw new Error(`Dismissal failed with ${result.response.status}`);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: reminderKeys.list(spaceId) }),
  });
}

export function useReminderSettings(spaceId: string) {
  return useQuery({
    queryKey: reminderKeys.settings(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/reminder-settings', {
          params: { path: { spaceId } },
        }),
      ),
  });
}

export function useSaveReminderSettings(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ReminderSettings) =>
      expectData(
        await apiClient.PUT('/financial-spaces/{spaceId}/reminder-settings', {
          params: { path: { spaceId } },
          body,
        }),
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: reminderKeys.settings(spaceId) }),
        queryClient.invalidateQueries({ queryKey: reminderKeys.list(spaceId) }),
      ]),
  });
}
