import { useSyncExternalStore } from 'react';

const dismissedSpaceIds = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dismissBalancePrompt(spaceId: string): void {
  dismissedSpaceIds.add(spaceId);
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function useBalancePromptDismissed(spaceId: string): boolean {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
  return dismissedSpaceIds.has(spaceId);
}
