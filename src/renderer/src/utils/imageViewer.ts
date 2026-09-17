import { useSyncExternalStore } from 'react';
import type { Attachment } from '@shared/types';

interface ViewerState {
  attachments: Attachment[];
  index: number;
}

let state: ViewerState = { attachments: [], index: 0 };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function openImage(attachments: Attachment[], index: number): void {
  state = { attachments, index };
  emit();
}

export function closeImage(): void {
  state = { attachments: [], index: 0 };
  emit();
}

export function setImageIndex(index: number): void {
  if (index < 0 || index >= state.attachments.length) return;
  state = { ...state, index };
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
