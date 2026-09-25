import type {
  ConfirmPrepaymentRequest,
  CreateDebtRequest,
  DebtPaymentRequest,
  PrepaymentMode,
  UpdateDebtRequest,
} from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const debtKeys = {
  forSpace: (spaceId: string) => ['financial-spaces', spaceId, 'debts'] as const,
  detail: (spaceId: string, debtId: string) =>
    ['financial-spaces', spaceId, 'debts', debtId] as const,
};

export function useDebts(spaceId: string) {
  return useQuery({
    queryKey: debtKeys.forSpace(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/debts', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

export function useDebt(spaceId: string, debtId: string) {
  return useQuery({
    queryKey: debtKeys.detail(spaceId, debtId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/debts/{debtId}', {
          params: { path: { spaceId, debtId } },
        }),
      ),
  });
}

function useInvalidateDebts(spaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: debtKeys.forSpace(spaceId) });
}

export function useCreateDebt(spaceId: string) {
  const invalidate = useInvalidateDebts(spaceId);
  return useMutation({
    mutationFn: async (input: CreateDebtRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/debts', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useUpdateDebt(spaceId: string, debtId: string) {
  const invalidate = useInvalidateDebts(spaceId);
  return useMutation({
    mutationFn: async (input: UpdateDebtRequest) =>
      expectData(
        await apiClient.PATCH('/financial-spaces/{spaceId}/debts/{debtId}', {
          params: { path: { spaceId, debtId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useRecordDebtPayment(spaceId: string, debtId: string) {
  const invalidate = useInvalidateDebts(spaceId);
  return useMutation({
    mutationFn: async (input: DebtPaymentRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/debts/{debtId}/payments', {
          params: { path: { spaceId, debtId } },
          body: input,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useRemoveDebtPayment(spaceId: string, debtId: string) {
  const invalidate = useInvalidateDebts(spaceId);
  return useMutation({
    mutationFn: async (paymentId: string) =>
      expectData(
        await apiClient.DELETE('/financial-spaces/{spaceId}/debts/{debtId}/payments/{paymentId}', {
          params: { path: { spaceId, debtId, paymentId } },
        }),
      ),
    onSettled: invalidate,
  });
}

export function useSimulatePrepayment(spaceId: string, debtId: string) {
  return useMutation({
    mutationFn: async (input: { amountMinor: number; mode: PrepaymentMode }) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/debts/{debtId}/simulations', {
          params: { path: { spaceId, debtId } },
          body: input,
        }),
      ),
  });
}

export function useConfirmPrepayment(spaceId: string, debtId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConfirmPrepaymentRequest) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/debts/{debtId}/prepayments', {
          params: { path: { spaceId, debtId } },
          body: input,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: debtKeys.forSpace(spaceId) }),
  });
}
