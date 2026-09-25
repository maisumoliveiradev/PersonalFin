import type { ImportMapping } from '@personalfin/api-contract';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

type RowFilter = 'all' | 'invalid' | 'duplicates' | 'importable';

export const importKeys = {
  list: (spaceId: string) => ['financial-spaces', spaceId, 'imports'] as const,
  detail: (spaceId: string, importId: string) =>
    ['financial-spaces', spaceId, 'imports', importId] as const,
  rows: (spaceId: string, importId: string, filter: RowFilter) =>
    ['financial-spaces', spaceId, 'imports', importId, 'rows', filter] as const,
};

export function useImports(spaceId: string) {
  return useQuery({
    queryKey: importKeys.list(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/imports', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

export function useImport(spaceId: string, importId: string) {
  return useQuery({
    queryKey: importKeys.detail(spaceId, importId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/imports/{importId}', {
          params: { path: { spaceId, importId } },
        }),
      ),
  });
}

export function useImportRows(
  spaceId: string,
  importId: string,
  filter: RowFilter,
  enabled: boolean,
) {
  return useQuery({
    queryKey: importKeys.rows(spaceId, importId, filter),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/imports/{importId}/rows', {
          params: { path: { spaceId, importId }, query: { filter, limit: 200 } },
        }),
      ),
  });
}

export function useCreateImport(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fileName: string; format: 'csv' | 'xlsx'; contentBase64: string }) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/imports', {
          params: { path: { spaceId } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: importKeys.list(spaceId) }),
  });
}

function useImportAction<Input>(spaceId: string, run: (input: Input) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId] }),
  });
}

export function useMapImport(spaceId: string, importId: string) {
  return useImportAction(spaceId, async (body: { version: number; mapping: ImportMapping }) =>
    expectData(
      await apiClient.PUT('/financial-spaces/{spaceId}/imports/{importId}/mapping', {
        params: { path: { spaceId, importId } },
        body,
      }),
    ),
  );
}

export function useDecideDuplicates(spaceId: string, importId: string) {
  return useImportAction(
    spaceId,
    async (
      body:
        | { version: number; all: 'import' | 'skip' }
        | { version: number; decisions: { rowNumber: number; decision: 'import' | 'skip' }[] },
    ) =>
      expectData(
        await apiClient.PUT('/financial-spaces/{spaceId}/imports/{importId}/decisions', {
          params: { path: { spaceId, importId } },
          body,
        }),
      ),
  );
}

export function useImportCommand(
  spaceId: string,
  importId: string,
  command: 'confirm' | 'undo' | 'discard',
) {
  return useImportAction(spaceId, async (version: number) => {
    const options = { params: { path: { spaceId, importId } }, body: { version } };
    if (command === 'confirm') {
      return expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/imports/{importId}/confirm', options),
      );
    }
    if (command === 'undo') {
      return expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/imports/{importId}/undo', options),
      );
    }
    return expectData(
      await apiClient.POST('/financial-spaces/{spaceId}/imports/{importId}/discard', options),
    );
  });
}
