import { useSyncExternalStore } from 'react';
import type { SoundData } from '@shared/types';

let globalSound: SoundData | null = null;
const peerSoundCache = new Map<string, SoundData>();
const stereoAudioCache = new Map<string, HTMLAudioElement>();
const listeners = new Set<() => void>();
let started = false;
let loaded = false;
let loadPromise: Promise<void> | null = null;
let audioCtx: AudioContext | null = null;

function emit(): void {
  listeners.forEach((l) => l());
}

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function getStereoAudio(dataUrl: string): HTMLAudioElement {
  let audio = stereoAudioCache.get(dataUrl);
  if (!audio) {
    audio = new Audio(dataUrl);
    audio.preload = 'auto';
    stereoAudioCache.set(dataUrl, audio);
  }
  return audio;
}

async function loadGlobal(): Promise<void> {
  globalSound = await window.api.sounds.getGlobal();
  emit();
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) {
    loadPromise = loadGlobal().then(() => {
      loaded = true;
    });
  }
  await loadPromise;
}

async function playAudio(sound: SoundData): Promise<void> {
  if (!sound.dataUrl) return;

  if (!sound.mono) {
    const audio = getStereoAudio(sound.dataUrl);
    audio.currentTime = 0;
    audio.volume = sound.volume;
    await audio.play();
    return;
  }

  // Mono: принудительно микшируем в один канал через WebAudio.
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') await ctx.resume();

  const audio = new Audio(sound.dataUrl);
  audio.crossOrigin = 'anonymous';

  const source = ctx.createMediaElementSource(audio);
  const gain = ctx.createGain();
  gain.gain.value = sound.volume;
  gain.channelCount = 1;
  gain.channelCountMode = 'explicit';
  gain.channelInterpretation = 'speakers';

  source.connect(gain);
  gain.connect(ctx.destination);

  audio.onended = (): void => {
    try {
      source.disconnect();
      gain.disconnect();
    } catch {
      /* ignore */
    }
  };

  audio.currentTime = 0;
  await audio.play();
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

export async function playForPeer(peerId: string): Promise<void> {
  try {
    let sound = peerSoundCache.get(peerId);
    if (!sound) {
      sound = await window.api.sounds.getForPeer(peerId);
      peerSoundCache.set(peerId, sound);
    }
    await playAudio(sound);
  } catch {
    /* блокировка автоплея или битый файл */
  }
}

export async function setGlobal(dataUrl: string, name: string): Promise<void> {
  await window.api.sounds.setGlobal(dataUrl, name);
  await loadGlobal();
}

export async function clearGlobal(): Promise<void> {
  await window.api.sounds.clearGlobal();
  await loadGlobal();
}

export async function setGlobalVolume(v: number): Promise<void> {
  await window.api.sounds.setGlobalVolume(v);
  if (globalSound) {
    globalSound = { ...globalSound, volume: v };
    emit();
  }
}

export async function setGlobalMono(v: boolean): Promise<void> {
  await window.api.sounds.setGlobalMono(v);
  if (globalSound) {
    globalSound = { ...globalSound, mono: v };
    emit();
  }
}

export async function previewGlobal(): Promise<void> {
  await ensureLoaded();
  if (globalSound) await playAudio(globalSound);
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

export async function setForPeerVolume(peerId: string, v: number | null): Promise<void> {
  await window.api.sounds.setForPeerVolume(peerId, v);
  peerSoundCache.delete(peerId);
}

export async function setForPeerMono(peerId: string, v: boolean | null): Promise<void> {
  await window.api.sounds.setForPeerMono(peerId, v);
  peerSoundCache.delete(peerId);
}

export function useGlobalSound(): SoundData | null {
  return useSyncExternalStore(subscribe, getGlobalSound);
}

export async function previewForPeer(peerId: string): Promise<void> {
  try {
    const sound = await window.api.sounds.getForPeer(peerId);
    await playAudio(sound);
  } catch {
    /* ignore */
  }
}
