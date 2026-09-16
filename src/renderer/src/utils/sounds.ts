import { useSyncExternalStore } from 'react';
import type { SoundData } from '@shared/types';

let globalSound: SoundData | null = null;
let volume = 1;
const peerSoundCache = new Map<string, SoundData>();
const audioCache = new Map<string, HTMLAudioElement>();
const listeners = new Set<() => void>();
let started = false;
let loaded = false;
let loadPromise: Promise<void> | null = null;

function emit(): void {
  listeners.forEach((l) => l());
}

async function loadGlobal(): Promise<void> {
  globalSound = await window.api.sounds.getGlobal();
  emit();
}

async function loadVolume(): Promise<void> {
  volume = await window.api.sounds.getVolume();
  emit();
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) {
    loadPromise = Promise.all([loadGlobal(), loadVolume()]).then(() => {
      loaded = true;
    });
  }
  await loadPromise;
}

function getAudio(dataUrl: string): HTMLAudioElement {
  let audio = audioCache.get(dataUrl);
  if (!audio) {
    audio = new Audio(dataUrl);
    audio.preload = 'auto';
    audioCache.set(dataUrl, audio);
  }
  return audio;
}

export function subscribe(listener: () => void): () => void {
  if (!started) {
    started = true;
    void ensureLoaded();
    window.api.transport.onDataChanged((): void => {
      peerSoundCache.clear();
      void loadGlobal();
    });
  }
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

export function getGlobalSound(): SoundData | null {
  return globalSound;
}

export function getVolume(): number {
  return volume;
}

export async function playForPeer(peerId: string): Promise<void> {
  await ensureLoaded();
  try {
    let sound = peerSoundCache.get(peerId);
    if (!sound) {
      sound = await window.api.sounds.getForPeer(peerId);
      peerSoundCache.set(peerId, sound);
    }
    if (!sound.dataUrl) return;
    const audio = getAudio(sound.dataUrl);
    audio.currentTime = 0;
    audio.volume = volume;
    await audio.play();
  } catch {
    /* звук может быть заблокирован */
  }
}

export async function setGlobal(dataUrl: string, name: string): Promise<void> {
  const result = await window.api.sounds.setGlobal(dataUrl, name);
  if (result.success && result.sound) {
    globalSound = result.sound;
    emit();
  }
}

export async function clearGlobal(): Promise<void> {
  await window.api.sounds.clearGlobal();
  await loadGlobal();
}

export async function setVolume(v: number): Promise<void> {
  const result = await window.api.sounds.setVolume(v);
  volume = result.volume;
  emit();
}

export async function getForPeer(peerId: string): Promise<SoundData> {
  const cached = peerSoundCache.get(peerId);
  if (cached) return cached;
  const sound = await window.api.sounds.getForPeer(peerId);
  peerSoundCache.set(peerId, sound);
  return sound;
}

export async function setForPeer(peerId: string, dataUrl: string, name: string): Promise<void> {
  await window.api.sounds.setForPeer(peerId, dataUrl, name);
  peerSoundCache.delete(peerId);
}

export async function clearForPeer(peerId: string): Promise<void> {
  await window.api.sounds.clearForPeer(peerId);
  peerSoundCache.delete(peerId);
}

export function useGlobalSound(): SoundData | null {
  return useSyncExternalStore(subscribe, getGlobalSound);
}

export function useVolume(): number {
  return useSyncExternalStore(subscribe, getVolume);
}
