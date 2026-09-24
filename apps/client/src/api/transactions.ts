import type { CreateTransactionRequest, UpdateTransactionRequest } from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const transactionKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'transactions'] as const,
  detail: (spaceId: string, transactionId: string) =>
    ['financial-spaces', spaceId, 'transactions', transactionId] as const,
};

export function useTransaction(spaceId: string, transactionId: string) {
  return useQuery({
    queryKey: transactionKeys.detail(spaceId, transactionId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/transactions/{transactionId}', {
          params: { path: { spaceId, transactionId } },
        }),
      ),
  });
}

export function useUpdateTransaction(spaceId: string, transactionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTransactionRequest) =>
      expectData(
        await apiClient.PATCH('/financial-spaces/{spaceId}/transactions/{transactionId}', {
          params: { path: { spaceId, transactionId } },
          body: input,
        }),
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.forSpace(spaceId) });
    },
  });
}

export function useTransactions(spaceId: string) {
  return useQuery({
    queryKey: transactionKeys.forSpace(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/transactions', {
          params: { path: { spaceId } },
        }),
      ),
  });
}

export function useCreateTransaction(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTransactionRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/transactions', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.forSpace(spaceId) });
    },
  });
}
