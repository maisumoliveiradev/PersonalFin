import type {
  CreateCardRequest,
  RecordCardLimitRequest,
  UpdateCardRequest,
} from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const cardKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'cards'] as const,
};

export function useCards(spaceId: string) {
  return useQuery({
    queryKey: cardKeys.forSpace(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/cards', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

function useInvalidateCards(spaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: cardKeys.forSpace(spaceId) });
}

export function useCreateCard(spaceId: string) {
  const invalidate = useInvalidateCards(spaceId);
  return useMutation({
    mutationFn: async (input: CreateCardRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/cards', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useUpdateCard(spaceId: string, cardId: string) {
  const invalidate = useInvalidateCards(spaceId);
  return useMutation({
    mutationFn: async (input: UpdateCardRequest) =>
      expectData(
        await apiClient.PATCH('/financial-spaces/{spaceId}/cards/{cardId}', {
          params: { path: { spaceId, cardId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useRecordCardLimit(spaceId: string, cardId: string) {
  const invalidate = useInvalidateCards(spaceId);
  return useMutation({
    mutationFn: async (input: RecordCardLimitRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/cards/{cardId}/limit-changes', {
          params: { path: { spaceId, cardId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}
