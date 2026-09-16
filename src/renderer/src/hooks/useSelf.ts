import { useCallback, useSyncExternalStore } from 'react';
import type { User } from '@shared/types';

export interface UseSelfResult {
  self: User | null;
  isLoading: boolean;
  updateSelf: (patch: { nickname?: string; avatar?: string | null }) => Promise<void>;
  reload: () => Promise<void>;
}

interface SelfSnapshot {
  self: User | null;
  isLoading: boolean;
}

const initialSnapshot: SelfSnapshot = { self: null, isLoading: true };

let snapshot: SelfSnapshot = initialSnapshot;
const listeners = new Set<() => void>();
let started = false;

function emit(): void {
  listeners.forEach((listener): void => listener());
}

function setSnapshot(next: SelfSnapshot): void {
  snapshot = next;
  emit();
}

async function loadSelf(): Promise<void> {
  try {
    const data = await window.api.db.users.getSelf();
    setSnapshot({ self: data, isLoading: false });
  } catch (err) {
    console.error('Failed to load self:', err);
    setSnapshot({ self: null, isLoading: false });
  }
}

function subscribe(listener: () => void): () => void {
  if (!started) {
    started = true;
    void loadSelf();
  }
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SelfSnapshot {
  return snapshot;
}

export function useSelf(): UseSelfResult {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  const reload = useCallback(async (): Promise<void> => {
    await loadSelf();
  }, []);

  const updateSelf = useCallback(
    async (patch: { nickname?: string; avatar?: string | null }): Promise<void> => {
      const data = await window.api.db.users.updateSelf(patch);
      setSnapshot({ self: data, isLoading: false });
    },
    []
  );

  return {
    self: snap.self,
    isLoading: snap.isLoading,
    updateSelf,
    reload
  };
}
