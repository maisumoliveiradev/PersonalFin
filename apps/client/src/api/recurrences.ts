import type { CreateRecurrenceRequest, UpdateRecurrenceRequest } from '@personalfin/api-contract';
import type { Month } from '@personalfin/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const recurrenceKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'recurrences'] as const,
};

export function useRecurrences(spaceId: string) {
  return useQuery({
    queryKey: recurrenceKeys.forSpace(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/recurrences', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

export function useCreateRecurrence(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecurrenceRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/recurrences', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId] });
    },
  });
}

export function useUpdateRecurrence(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ seriesId, ...body }: UpdateRecurrenceRequest & { seriesId: string }) =>
      expectData(
        await apiClient.PATCH('/financial-spaces/{spaceId}/recurrences/{seriesId}', {
          params: { path: { spaceId, seriesId } },
          body,
        }),
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId] });
    },
  });
}

export function useEndRecurrence(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { seriesId: string; version: number; endDate: string }) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/recurrences/{seriesId}/end', {
          params: { path: { spaceId, seriesId: input.seriesId } },
          body: { version: input.version, endDate: input.endDate },
        }),
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId] });
    },
  });
}

export function useMaterializeRecurrences(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (throughMonth: Month) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/recurrences/materialize', {
          params: { path: { spaceId } },
          body: { throughMonth },
        }),
      ),
    onSuccess: async ({ occurrencesCreated }) => {
      if (occurrencesCreated > 0) {
        await queryClient.invalidateQueries({
          queryKey: ['financial-spaces', spaceId, 'transactions'],
        });
      }
    },
  });
}
