import type {
  CreateTransactionRequest,
  Transaction,
  TransactionList,
  TransactionStatus,
  UpdateTransactionRequest,
} from '@personalfin/api-contract';
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { TransactionFilters } from '../features/transactions/transaction-filters';
import { isNetworkFailure, isOffline, queueUpdate } from '../sync/offline-writes';

import { apiClient, expectData } from './api-client';

export const transactionKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'transactions'] as const,
  detail: (spaceId: string, transactionId: string) =>
    ['financial-spaces', spaceId, 'transactions', transactionId] as const,
  deleted: (spaceId: string) => ['financial-spaces', spaceId, 'transactions', 'deleted'] as const,
};

export function useDeletedTransactions(spaceId: string) {
  return useQuery({
    queryKey: transactionKeys.deleted(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/transactions', {
          params: { path: { spaceId }, query: { state: 'deleted' } },
        }),
      ),
  });
}

export function useDeleteTransaction(spaceId: string, transactionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (version: number) =>
      expectData(
        await apiClient.DELETE('/financial-spaces/{spaceId}/transactions/{transactionId}', {
          params: { path: { spaceId, transactionId }, query: { version } },
        }),
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.forSpace(spaceId) });
    },
  });
}

export function useRestoreTransaction(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, version }: { transactionId: string; version: number }) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/transactions/{transactionId}/restore', {
          params: { path: { spaceId, transactionId } },
          body: { version },
        }),
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.forSpace(spaceId) });
    },
  });
}

function findInLists(
  queryClient: QueryClient,
  spaceId: string,
  transactionId: string,
): Transaction | undefined {
  const lists = queryClient.getQueriesData<InfiniteData<TransactionList>>({
    queryKey: [...transactionKeys.forSpace(spaceId), 'list'],
  });
  for (const [, data] of lists) {
    for (const page of data?.pages ?? []) {
      const match = page.items.find((item) => item.id === transactionId);
      if (match !== undefined) {
        return match;
      }
    }
  }
  return undefined;
}

export function useTransaction(spaceId: string, transactionId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: transactionKeys.detail(spaceId, transactionId),
    initialData: () => findInLists(queryClient, spaceId, transactionId),
    initialDataUpdatedAt: 0,
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

const PAGE_SIZE = 50;

export function useTransactions(spaceId: string, filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: [...transactionKeys.forSpace(spaceId), 'list', filters] as const,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/transactions', {
          params: {
            path: { spaceId },
            query: {
              ...filters,
              limit: PAGE_SIZE,
              ...(pageParam === null ? {} : { cursor: pageParam }),
            },
          },
        }),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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

export function useChangeTransactionStatus(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      transaction,
      status,
    }: {
      transaction: Transaction;
      status: TransactionStatus;
    }): Promise<'saved' | 'queued'> => {
      if (isOffline()) {
        await queueUpdate(spaceId, transaction, { status });
        return 'queued';
      }
      try {
        expectData(
          await apiClient.PATCH('/financial-spaces/{spaceId}/transactions/{transactionId}', {
            params: { path: { spaceId, transactionId: transaction.id } },
            body: { version: transaction.version, status },
          }),
        );
        return 'saved';
      } catch (error) {
        if (!isNetworkFailure(error)) {
          throw error;
        }
        await queueUpdate(spaceId, transaction, { status });
        return 'queued';
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.forSpace(spaceId) });
    },
  });
}
