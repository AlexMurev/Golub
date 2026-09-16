import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let address: string | null = null;
let started = false;

function emit(): void {
  listeners.forEach((listener): void => listener());
}

async function loadAddress(): Promise<void> {
  try {
    const info = await window.api.transport.getMyInfo();
    address = info?.address ?? null;
  } catch (err) {
    console.error('Failed to load transport info:', err);
    address = null;
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  if (!started) {
    started = true;
    void loadAddress();
  }
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string | null {
  return address;
}

export const useMyAddress = (): string | null => {
  return useSyncExternalStore(subscribe, getSnapshot);
};
