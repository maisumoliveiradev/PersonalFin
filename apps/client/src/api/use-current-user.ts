import { useQuery } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => expectData(await apiClient.GET('/me')),
  });
}
