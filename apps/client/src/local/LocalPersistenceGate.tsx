import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';

import { LoadingScreen } from '../ui/LoadingScreen';
import { restoreQueryCache, startQueryCachePersistence } from './query-persistence';

interface LocalPersistenceGateProps {
  userId: string;
  children: ReactNode;
}

export function LocalPersistenceGate({ userId, children }: LocalPersistenceGateProps) {
  const queryClient = useQueryClient();
  const [restoredFor, setRestoredFor] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    restoreQueryCache(queryClient, userId)
      .catch(() => undefined)
      .finally(() => {
        if (!active) {
          return;
        }
        stop = startQueryCachePersistence(queryClient, userId);
        setRestoredFor(userId);
      });
    return () => {
      active = false;
      stop?.();
    };
  }, [queryClient, userId]);

  if (restoredFor !== userId) {
    return <LoadingScreen />;
  }
  return children;
}
