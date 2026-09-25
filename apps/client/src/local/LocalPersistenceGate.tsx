import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';

import { startSyncEngine } from '../sync/sync-engine';
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
    const stops: (() => void)[] = [];
    Promise.all([
      restoreQueryCache(queryClient, userId).catch(() => undefined),
      startSyncEngine(userId).then((stop) => {
        stops.push(stop);
      }),
    ]).finally(() => {
      if (!active) {
        for (const stop of stops) {
          stop();
        }
        return;
      }
      stops.push(startQueryCachePersistence(queryClient, userId));
      setRestoredFor(userId);
    });
    return () => {
      active = false;
      for (const stop of stops) {
        stop();
      }
    };
  }, [queryClient, userId]);

  if (restoredFor !== userId) {
    return <LoadingScreen />;
  }
  return children;
}
