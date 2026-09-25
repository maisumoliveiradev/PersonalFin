import { onlineManager } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { useSyncExternalStore } from 'react';

import { apiUrl } from '../config';

const PROBE_INTERVAL_MS = 5000;

let serverUnreachable = false;
let probeTimer: ReturnType<typeof setTimeout> | undefined;

function isDeviceConnected(state: NetworkState): boolean {
  return state.isConnected !== false;
}

async function probeServer(): Promise<void> {
  probeTimer = undefined;
  try {
    const response = await fetch(`${apiUrl}/health`);
    if (response.ok) {
      reportRequestSuccess();
      return;
    }
  } catch {}
  scheduleProbe(PROBE_INTERVAL_MS);
}

function scheduleProbe(delay: number): void {
  if (serverUnreachable && probeTimer === undefined) {
    probeTimer = setTimeout(() => void probeServer(), delay);
  }
}

export function reportRequestFailure(): void {
  serverUnreachable = true;
  onlineManager.setOnline(false);
  scheduleProbe(PROBE_INTERVAL_MS);
}

export function reportRequestSuccess(): void {
  if (!serverUnreachable) {
    return;
  }
  serverUnreachable = false;
  if (probeTimer !== undefined) {
    clearTimeout(probeTimer);
    probeTimer = undefined;
  }
  onlineManager.setOnline(true);
}

function applyDeviceState(state: NetworkState, setOnline: (online: boolean) => void): void {
  if (!isDeviceConnected(state)) {
    setOnline(false);
    return;
  }
  if (serverUnreachable) {
    scheduleProbe(0);
    return;
  }
  setOnline(true);
}

export function startConnectivityMonitoring(): void {
  onlineManager.setEventListener((setOnline) => {
    const subscription = addNetworkStateListener((state) => applyDeviceState(state, setOnline));
    getNetworkStateAsync()
      .then((state) => applyDeviceState(state, setOnline))
      .catch(() => undefined);
    return () => subscription.remove();
  });
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true,
  );
}
