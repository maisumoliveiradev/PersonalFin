import type { CurrentUser } from '@personalfin/api-contract';
import { useQuery } from '@tanstack/react-query';

import { ApiRequestError, apiClient } from './api-client';

async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data, error, response } = await apiClient.GET('/me');
  if (data === undefined) {
    throw new ApiRequestError(response.status, error?.error.code ?? 'UNKNOWN');
  }
  return data;
}

export function useCurrentUser() {
  return useQuery({ queryKey: ['current-user'], queryFn: fetchCurrentUser });
}
