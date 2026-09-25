import { useSyncExternalStore } from 'react';

let upgradeRequired = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function markUpgradeRequired(): void {
  if (!upgradeRequired) {
    upgradeRequired = true;
    notify();
  }
}

export function clearUpgradeRequired(): void {
  if (upgradeRequired) {
    upgradeRequired = false;
    notify();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUpgradeRequired(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => upgradeRequired,
    () => upgradeRequired,
  );
}
