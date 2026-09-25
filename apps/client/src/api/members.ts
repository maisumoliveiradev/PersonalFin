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

const memberKey = (spaceId: string) => ['financial-spaces', spaceId, 'members'] as const;

export function useMembers(spaceId: string) {
  return useQuery({
    queryKey: memberKey(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/members', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

async function expectNoContent(result: {
  error?: { error: { code: string } };
  response: Response;
}): Promise<void> {
  if (!result.response.ok) {
    throw new ApiRequestError(result.response.status, result.error?.error.code ?? 'UNKNOWN');
  }
}

export function useChangeMemberPermissions(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      version: number;
      permissions: SpacePermission[];
    }) =>
      expectNoContent(
        await apiClient.PATCH('/financial-spaces/{spaceId}/members/{userId}', {
          params: { path: { spaceId, userId: input.userId } },
          body: { version: input.version, permissions: input.permissions },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: memberKey(spaceId) }),
  });
}

export function useRemoveMember(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; version: number }) =>
      expectNoContent(
        await apiClient.DELETE('/financial-spaces/{spaceId}/members/{userId}', {
          params: { path: { spaceId, userId: input.userId }, query: { version: input.version } },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: memberKey(spaceId) }),
  });
}

export function useLeaveSpace(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      expectNoContent(
        await apiClient.POST('/financial-spaces/{spaceId}/leave', {
          params: { path: { spaceId } },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-spaces'] }),
  });
}

export function useTransferOwnership(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newOwnerUserId: string) =>
      expectNoContent(
        await apiClient.POST('/financial-spaces/{spaceId}/ownership-transfer', {
          params: { path: { spaceId } },
          body: { newOwnerUserId },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['financial-spaces'] }),
  });
}
