import type { CreateTransactionRequest } from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const transactionKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'transactions'] as const,
};

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
