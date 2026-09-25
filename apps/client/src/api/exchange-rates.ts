import type { ForeignCurrencyCode } from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

const ratesKey = (spaceId: string) => ['financial-spaces', spaceId, 'exchange-rates'] as const;

export function useExchangeRates(spaceId: string) {
  return useQuery({
    queryKey: ratesKey(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/exchange-rates', {
          params: { path: { spaceId } },
        }),
      ).items,
  });
}

export function useRecordExchangeRate(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { currency: ForeignCurrencyCode; rateDate: string; rate: string }) =>
      expectData(
        await apiClient.POST('/financial-spaces/{spaceId}/exchange-rates', {
          params: { path: { spaceId } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ratesKey(spaceId) }),
  });
}
