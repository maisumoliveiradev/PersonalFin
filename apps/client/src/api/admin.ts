import { useQuery } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export function usePlatformOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => expectData(await apiClient.GET('/admin/overview')),
  });
}
