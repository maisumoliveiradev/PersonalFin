import type {
  CreateCardRequest,
  InvoiceDatesRequest,
  RecordCardLimitRequest,
  UpdateCardRequest,
} from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const cardKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'cards'] as const,
};

export function useCards(spaceId: string) {
  return useQuery({
    queryKey: cardKeys.forSpace(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/cards', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

function useInvalidateCards(spaceId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: cardKeys.forSpace(spaceId) }),
      queryClient.invalidateQueries({
        queryKey: ['financial-spaces', spaceId, 'transactions', 'card-limits'],
      }),
    ]);
}

export function useCreateCard(spaceId: string) {
  const invalidate = useInvalidateCards(spaceId);
  return useMutation({
    mutationFn: async (input: CreateCardRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/cards', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useUpdateCard(spaceId: string, cardId: string) {
  const invalidate = useInvalidateCards(spaceId);
  return useMutation({
    mutationFn: async (input: UpdateCardRequest) =>
      expectData(
        await apiClient.PATCH('/financial-spaces/{spaceId}/cards/{cardId}', {
          params: { path: { spaceId, cardId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useRecordCardLimit(spaceId: string, cardId: string) {
  const invalidate = useInvalidateCards(spaceId);
  return useMutation({
    mutationFn: async (input: RecordCardLimitRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/cards/{cardId}/limit-changes', {
          params: { path: { spaceId, cardId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export const invoiceKeys = {
  month: (spaceId: string, cardId: string, month: string) =>
    ['financial-spaces', spaceId, 'transactions', 'card-invoices', cardId, month] as const,
};

export function useCardInvoice(spaceId: string, cardId: string, month: string) {
  return useQuery({
    queryKey: invoiceKeys.month(spaceId, cardId, month),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/cards/{cardId}/invoices/{month}', {
          params: { path: { spaceId, cardId, month } },
        }),
      ),
  });
}

export function useSetInvoiceDates(spaceId: string, cardId: string, month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvoiceDatesRequest) =>
      expectData(
        await apiClient.PUT('/financial-spaces/{spaceId}/cards/{cardId}/invoices/{month}/dates', {
          params: { path: { spaceId, cardId, month } },
          body: input,
        }),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId, 'transactions'] }),
  });
}

export function useCancelInstallments(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { purchaseId: string; afterMonth: string }) =>
      expectData(
        await apiClient.POST(
          '/financial-spaces/{spaceId}/installment-purchases/{purchaseId}/cancel',
          {
            params: { path: { spaceId, purchaseId: input.purchaseId } },
            body: { afterMonth: input.afterMonth },
          },
        ),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId, 'transactions'] }),
  });
}

export function usePayInvoice(spaceId: string, cardId: string, month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amountMinor: number; paidOn: string }) =>
      expectData(
        await apiClient.POST(
          '/financial-spaces/{spaceId}/cards/{cardId}/invoices/{month}/payments',
          {
            params: { path: { spaceId, cardId, month } },
            body: input,
          },
        ),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId, 'transactions'] }),
  });
}

export function useRemoveInvoicePayment(spaceId: string, cardId: string, month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) =>
      expectData(
        await apiClient.DELETE(
          '/financial-spaces/{spaceId}/cards/{cardId}/invoices/{month}/payments/{paymentId}',
          { params: { path: { spaceId, cardId, month, paymentId } } },
        ),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId, 'transactions'] }),
  });
}

export function useCardLimits(spaceId: string, on: string) {
  return useQuery({
    queryKey: ['financial-spaces', spaceId, 'transactions', 'card-limits', on] as const,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/card-limits', {
          params: { path: { spaceId }, query: { on } },
        }),
      ).items,
  });
}

export function useCardInvoiceSummaries(
  spaceId: string,
  cardId: string,
  fromMonth: string,
  months: number,
) {
  return useQuery({
    queryKey: [
      'financial-spaces',
      spaceId,
      'transactions',
      'card-invoice-summaries',
      cardId,
      fromMonth,
      months,
    ] as const,
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/cards/{cardId}/invoices', {
          params: { path: { spaceId, cardId }, query: { fromMonth, months } },
        }),
      ).items,
  });
}
