import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiRequestError, apiClient, expectData } from './api-client';

const grantsKey = (spaceId: string) => ['financial-spaces', spaceId, 'support-grants'] as const;

export function useSupportGrants(spaceId: string, enabled: boolean) {
  return useQuery({
    queryKey: grantsKey(spaceId),
    enabled,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/support-grants', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

export function useCreateSupportGrant(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { adminEmail: string; reason: string; days: number }) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/support-grants', {
          params: { path: { spaceId } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: grantsKey(spaceId) }),
  });
}

export function useRevokeSupportGrant(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (grantId: string) => {
      const result = await apiClient.POST(
        '/financial-spaces/{spaceId}/support-grants/{grantId}/revoke',
        { params: { path: { spaceId, grantId } } },
      );
      if (result.data === undefined) {
        throw new ApiRequestError(result.response.status, 'SUPPORT_REVOKE_FAILED');
      }
      return result.data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: grantsKey(spaceId) }),
  });
}

export function useMySupportGrants() {
  return useQuery({
    queryKey: ['admin', 'support-grants'],
    queryFn: async () => expectData(await apiClient.GET('/admin/support-grants')).items,
  });
}
