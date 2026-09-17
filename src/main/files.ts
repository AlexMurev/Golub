import { join, extname } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { getDataDir } from './paths';

const MAX_SIZE_BYTES = 50 * 1024 * 1024 * 1024;

function attachmentsDir(): string {
  const dir = join(getDataDir(), 'attachments');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getAttachmentFullPath(filePath: string): string {
  return join(attachmentsDir(), filePath);
}

export interface SaveFileResult {
  success: boolean;
  filePath?: string;
  size?: number;
  error?: string;
}

export function saveAttachmentFile(base64Data: string, originalName: string): SaveFileResult {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_SIZE_BYTES) {
      return { success: false, error: 'Файл слишком большой' };
    }

    const ext = extname(originalName).toLowerCase().slice(1);
    const uuid = crypto.randomUUID();
    const fileName = ext ? `${uuid}.${ext}` : uuid;

    writeFileSync(join(attachmentsDir(), fileName), buffer);
    return { success: true, filePath: fileName, size: buffer.length };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function deleteAttachmentFile(filePath: string): void {
  try {
    const full = join(attachmentsDir(), filePath);
    if (existsSync(full)) unlinkSync(full);
  } catch {
    /* ignore */
  }
}
