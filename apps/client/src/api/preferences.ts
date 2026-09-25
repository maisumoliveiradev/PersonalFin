import type { DashboardSections } from '@personalfin/api-contract';
import type { ExperienceProfile, SectionOverrides } from '@personalfin/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export const ALL_SECTIONS: DashboardSections = {
  observedBalance: true,
  realized: true,
  forecast: true,
  projection: true,
  projectionSeries: true,
  commitments: true,
  analytics: true,
};

const preferenceKey = (spaceId: string) =>
  ['financial-spaces', spaceId, 'dashboard-preferences'] as const;

export function useDashboardPreferences(spaceId: string) {
  return useQuery({
    queryKey: preferenceKey(spaceId),
    queryFn: async () =>
      expectData(
        await apiClient.GET('/financial-spaces/{spaceId}/dashboard-preferences', {
          params: { path: { spaceId } },
        }),
      ),
  });
}

export function useSaveDashboardPreferences(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { profile: ExperienceProfile; overrides: SectionOverrides }) =>
      expectData(
        await apiClient.PUT('/financial-spaces/{spaceId}/dashboard-preferences', {
          params: { path: { spaceId } },
          body: input,
        }),
      ),
    onSuccess: (saved) => queryClient.setQueryData(preferenceKey(spaceId), saved),
  });
}
