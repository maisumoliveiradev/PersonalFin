import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiRequestError, apiClient, expectData } from './api-client';

export const tagKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'tags'] as const,
};

export function useTags(spaceId: string) {
  return useQuery({
    queryKey: tagKeys.forSpace(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/tags', { params: { path: { spaceId } } }),
      ).items,
  });
}

function useInvalidateSpace(spaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId] });
}

export function useCreateTag(spaceId: string) {
  const invalidate = useInvalidateSpace(spaceId);
  return useMutation({
    mutationFn: async (name: string) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/tags', {
          params: { path: { spaceId } },
          body: { name },
        }),
      ),
    onSettled: invalidate,
  });
}

export function useUpdateTag(spaceId: string, tagId: string) {
  const invalidate = useInvalidateSpace(spaceId);
  return useMutation({
    mutationFn: async (input: { version: number; name?: string; archived?: boolean }) =>
      expectData(
        await apiClient.PATCH('/financial-spaces/{spaceId}/tags/{tagId}', {
          params: { path: { spaceId, tagId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useDeleteTag(spaceId: string, tagId: string) {
  const invalidate = useInvalidateSpace(spaceId);
  return useMutation({
    mutationFn: async (version: number) => {
      const { error, response } = await apiClient.DELETE(
        '/financial-spaces/{spaceId}/tags/{tagId}',
        { params: { path: { spaceId, tagId }, query: { version } } },
      );
      if (!response.ok) {
        throw new ApiRequestError(response.status, error?.error.code ?? 'UNKNOWN');
      }
    },
    onSettled: invalidate,
  });
}
