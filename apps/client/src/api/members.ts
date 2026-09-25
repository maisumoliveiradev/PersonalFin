import type { SpacePermission } from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiRequestError, apiClient, expectData } from './api-client';

const invitationKey = (spaceId: string) => ['financial-spaces', spaceId, 'invitations'] as const;

export function useInvitations(spaceId: string, enabled: boolean) {
  return useQuery({
    queryKey: invitationKey(spaceId),
    enabled,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/invitations', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

export function useCreateInvitation(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; permissions: SpacePermission[] }) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/invitations', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: invitationKey(spaceId) }),
  });
}

export function useCancelInvitation(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error, response } = await apiClient.DELETE(
        '/financial-spaces/{spaceId}/invitations/{invitationId}',
        { params: { path: { spaceId, invitationId } } },
      );
      if (!response.ok) {
        throw new ApiRequestError(response.status, error?.error.code ?? 'UNKNOWN');
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: invitationKey(spaceId) }),
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ['invitations', token] as const,
    retry: false,
    queryFn: async () =>
      expectData(await apiClient.GET('/invitations/{token}', { params: { path: { token } } })),
  });
}

export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      expectData(
        await apiClient.POST('/invitations/{token}/accept', { params: { path: { token } } }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-spaces'] }),
  });
}
