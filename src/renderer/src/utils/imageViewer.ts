import { useSyncExternalStore } from 'react';
import type { Attachment } from '@shared/types';

interface ViewerState {
  attachment: Attachment | null;
}

let state: ViewerState = { attachment: null };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function openImage(attachment: Attachment): void {
  state = { attachment };
  emit();
}

export function closeImage(): void {
  state = { attachment: null };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ViewerState {
  return state;
}

export function useImageViewer(): ViewerState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
