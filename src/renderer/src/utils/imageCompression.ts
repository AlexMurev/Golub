import { useSyncExternalStore } from 'react';

export type CompressionLevel = 'none' | 'light' | 'medium' | 'strong';

interface LevelConfig {
  maxDimension: number | null;
  quality: number;
}

const LEVELS: Record<CompressionLevel, LevelConfig | null> = {
  none: null,
  light: { maxDimension: 2560, quality: 0.9 },
  medium: { maxDimension: 1920, quality: 0.8 },
  strong: { maxDimension: 1280, quality: 0.65 }
};

let level: CompressionLevel = 'medium';
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) {
    loadPromise = window.api.settings.getImageCompression().then((v) => {
      level = v;
      loaded = true;
    });
  }
  await loadPromise;
}

function subscribe(listener: () => void): () => void {
  if (!loaded) void ensureLoaded();
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CompressionLevel {
  return level;
}

export function useImageCompression(): CompressionLevel {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function getImageCompression(): CompressionLevel {
  return level;
}

export async function setImageCompression(next: CompressionLevel): Promise<void> {
  await window.api.settings.setImageCompression(next);
  level = next;
  emit();
}

// =============================================================================
// Сжатие
// =============================================================================

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = (): void => resolve();
      img.onerror = (): void => reject(new Error('Не удалось открыть изображение'));
      img.src = url;
    });
    return img;
  } finally {
    // URL.revokeObjectURL(url) — сделаем после использования в compressImage
  }
}

export async function compressImage(
  file: File,
  overrideLevel?: CompressionLevel
): Promise<CompressResult | null> {
  await ensureLoaded();
  const lvl = overrideLevel ?? level;
  const config = LEVELS[lvl];

  // "none" — возвращаем оригинал, но всё равно читаем размеры
  if (!config) {
    try {
      const img = await loadImage(file);
      const result: CompressResult = {
        blob: file,
        width: img.naturalWidth,
        height: img.naturalHeight,
        originalSize: file.size,
        compressedSize: file.size
      };
      URL.revokeObjectURL(img.src);
      return result;
    } catch {
      return null;
    }
  }

  try {
    const img = await loadImage(file);
    const { naturalWidth: w, naturalHeight: h } = img;

    let targetW = w;
    let targetH = h;
    if (config.maxDimension && Math.max(w, h) > config.maxDimension) {
      const ratio = config.maxDimension / Math.max(w, h);
      targetW = Math.round(w * ratio);
      targetH = Math.round(h * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(img.src);
      return null;
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);

    URL.revokeObjectURL(img.src);

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', config.quality);
    });

    if (!blob) return null;

    // Если сжатие дало файл больше оригинала (редко, но бывает) — берём оригинал
    if (blob.size >= file.size) {
      return {
        blob: file,
        width: w,
        height: h,
        originalSize: file.size,
        compressedSize: file.size
      };
    }

    return {
      blob,
      width: targetW,
      height: targetH,
      originalSize: file.size,
      compressedSize: blob.size
    };
  } catch (err) {
    console.error('compressImage error:', err);
    return null;
  }
}

export function isHeavyImage(file: File, thresholdBytes = 3 * 1024 * 1024): boolean {
  return file.type.startsWith('image/') && file.size > thresholdBytes;
}
