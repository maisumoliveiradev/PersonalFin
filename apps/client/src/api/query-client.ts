import { QueryClient } from '@tanstack/react-query';

import { startConnectivityMonitoring } from '../local/connectivity';

startConnectivityMonitoring();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
    mutations: {
      networkMode: 'always',
    },
  },
});
