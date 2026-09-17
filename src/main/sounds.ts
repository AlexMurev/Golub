import { extname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import defaultSoundPath from '../../resources/sounds/default.mp3?asset';
import { getDataDir } from './paths';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 МБ

const MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a'
};

const EXT_TO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  m4a: 'audio/mp4'
};

function soundsDir(): string {
  const dir = join(getDataDir(), 'sounds');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export interface SaveResult {
  success: boolean;
  fileName?: string;
  error?: string;
}

export function saveSound(dataUrl: string, originalName: string): SaveResult {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return { success: false, error: 'Некорректный формат файла' };

    const [, mime, base64] = match;
    const ext = MIME_TO_EXT[mime];
    if (!ext) return { success: false, error: `Неподдерживаемый формат: ${mime}` };

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_SIZE_BYTES) {
      return { success: false, error: 'Файл слишком большой (макс. 5 МБ)' };
    }

    const safeBase = originalName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
    const fileName = `${safeBase}-${Date.now()}.${ext}`;

    writeFileSync(join(soundsDir(), fileName), buffer);
    return { success: true, fileName };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function readSoundAsDataUrl(fileName: string): string | null {
  try {
    const path = join(soundsDir(), fileName);
    if (!existsSync(path)) return null;

    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const mime = EXT_TO_MIME[ext] ?? 'audio/mpeg';
    const buffer = readFileSync(path);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export function deleteSound(fileName: string): void {
  try {
    const path = join(soundsDir(), fileName);
    if (existsSync(path)) unlinkSync(path);
  } catch {
    /* ignore */
  }
}

let cachedDefaultDataUrl: string | null = null;

export function getDefaultSoundDataUrl(): string | null {
  if (cachedDefaultDataUrl) return cachedDefaultDataUrl;
  try {
    const ext = extname(defaultSoundPath).toLowerCase().slice(1);
    const mime = EXT_TO_MIME[ext] ?? 'audio/mpeg';
    const buffer = readFileSync(defaultSoundPath);
    cachedDefaultDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
    return cachedDefaultDataUrl;
  } catch (err) {
    console.error('Cannot load default sound:', err);
    return null;
  }
}
