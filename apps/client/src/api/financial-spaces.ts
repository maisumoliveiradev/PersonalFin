import type { CreateFinancialSpaceRequest } from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const financialSpaceKeys = {
  all: ['financial-spaces'] as const,
  detail: (spaceId: string) => ['financial-spaces', spaceId] as const,
};

export function useFinancialSpaces() {
  return useQuery({
    queryKey: financialSpaceKeys.all,
    queryFn: async () => expectData(await apiClient.GET('/financial-spaces')).items,
  });
}

export function useFinancialSpace(spaceId: string) {
  return useQuery({
    queryKey: financialSpaceKeys.detail(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}', { params: { path: { spaceId } } }),
      ),
  });
}

export function useCreateFinancialSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFinancialSpaceRequest) =>
      expectData(await apiClient.POST('/financial-spaces', { body: input })),
    onSuccess: async (space) => {
      queryClient.setQueryData(financialSpaceKeys.detail(space.id), space);
      await queryClient.invalidateQueries({ queryKey: financialSpaceKeys.all });
    },
  });
}
