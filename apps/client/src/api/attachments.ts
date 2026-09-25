import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiRequestError, apiClient, expectData } from './api-client';

const attachmentsKey = (spaceId: string, transactionId: string) =>
  ['financial-spaces', spaceId, 'transactions', transactionId, 'attachments'] as const;

export function useAttachments(spaceId: string, transactionId: string) {
  return useQuery({
    queryKey: attachmentsKey(spaceId, transactionId),
    queryFn: async () =>
      expectData(
        await apiClient.GET(
          '/financial-spaces/{spaceId}/transactions/{transactionId}/attachments',
          {
            params: { path: { spaceId, transactionId } },
          },
        ),
      ).items,
  });
}

function useInvalidate(spaceId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId, 'transactions'] });
}

export function useAddAttachment(spaceId: string, transactionId: string) {
  const invalidate = useInvalidate(spaceId);
  return useMutation({
    mutationFn: async (body: { fileName: string; contentBase64: string }) =>
      expectData(
        await apiClient.POST(
          '/financial-spaces/{spaceId}/transactions/{transactionId}/attachments',
          {
            params: { path: { spaceId, transactionId } },
            body,
          },
        ),
      ),
    onSettled: invalidate,
  });
}

export function useRemoveAttachment(spaceId: string) {
  const invalidate = useInvalidate(spaceId);
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const result = await apiClient.DELETE(
        '/financial-spaces/{spaceId}/attachments/{attachmentId}',
        {
          params: { path: { spaceId, attachmentId } },
        },
      );
      if (!result.response.ok) {
        throw new ApiRequestError(result.response.status, 'ATTACHMENT_REMOVE_FAILED');
      }
    },
    onSettled: invalidate,
  });
}

export function useOpenAttachment(spaceId: string) {
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const result = await apiClient.GET(
        '/financial-spaces/{spaceId}/attachments/{attachmentId}/content',
        { params: { path: { spaceId, attachmentId } }, parseAs: 'arrayBuffer' },
      );
      if (!result.response.ok || result.data === undefined) {
        throw new ApiRequestError(result.response.status, 'ATTACHMENT_OPEN_FAILED');
      }
      return result.data as ArrayBuffer;
    },
  });
}
