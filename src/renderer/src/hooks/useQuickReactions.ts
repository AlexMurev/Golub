import { useSyncExternalStore } from 'react';

export interface QuickReaction {
  name: string;
  dataUrl: string;
}

let quick: QuickReaction[] = [];
const listeners = new Set<() => void>();
let started = false;

function emit(): void {
  listeners.forEach((l) => l());
}

async function load(): Promise<void> {
  try {
    quick = await window.api.reactions.getQuick();
    emit();
  } catch (err) {
    console.error('Failed to load quick reactions:', err);
  }
}

function subscribe(listener: () => void): () => void {
  if (!started) {
    started = true;
    void load();
    window.api.transport.onDataChanged((): void => {
      void load();
    });
  }
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): QuickReaction[] {
  return quick;
}

export function useQuickReactions(): QuickReaction[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
