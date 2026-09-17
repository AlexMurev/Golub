import { getDb } from '../index';
import type { Attachment, AttachmentTransferState } from '@shared/types';

export function getAttachment(id: string): Attachment | null {
  const row = getDb().prepare('SELECT * FROM attachments WHERE id = ?').get(id) as
    Attachment | undefined;
  return row ?? null;
}

export function listForMessage(messageId: string): Attachment[] {
  return getDb()
    .prepare(
      'SELECT * FROM attachments WHERE messageId = ? AND deletedAt IS NULL ORDER BY orderIndex ASC'
    )
    .all(messageId) as Attachment[];
}

export function listForMessages(messageIds: string[]): Map<string, Attachment[]> {
  if (messageIds.length === 0) return new Map();

  const placeholders = messageIds.map(() => '?').join(',');
  const rows = getDb()
    .prepare(
      `SELECT * FROM attachments
       WHERE messageId IN (${placeholders}) AND deletedAt IS NULL
       ORDER BY messageId, orderIndex ASC`
    )
    .all(...messageIds) as Attachment[];

  const byMessage = new Map<string, Attachment[]>();
  for (const row of rows) {
    const list = byMessage.get(row.messageId) ?? [];
    list.push(row);
    byMessage.set(row.messageId, list);
  }
  return byMessage;
}

export function insertAttachment(att: Attachment): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO attachments
        (id, messageId, fileName, mimeType, size, filePath, transferState,
         width, height, duration, orderIndex, createdAt, deletedAt, fileDeletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      att.id,
      att.messageId,
      att.fileName,
      att.mimeType,
      att.size,
      att.filePath,
      att.transferState,
      att.width,
      att.height,
      att.duration,
      att.orderIndex,
      att.createdAt,
      att.deletedAt,
      att.fileDeletedAt
    );
}

export function setTransferState(id: string, state: AttachmentTransferState): void {
  getDb().prepare('UPDATE attachments SET transferState = ? WHERE id = ?').run(state, id);
}

export function softDeleteAttachment(id: string): void {
  getDb().prepare('UPDATE attachments SET deletedAt = ? WHERE id = ?').run(Date.now(), id);
}

export function updateAttachmentFile(
  id: string,
  filePath: string | null,
  transferState: AttachmentTransferState
): void {
  getDb()
    .prepare('UPDATE attachments SET filePath = ?, transferState = ? WHERE id = ?')
    .run(filePath, transferState, id);
}

export interface AttachmentForCleanup {
  id: string;
  filePath: string | null;
  size: number | null;
  createdAt: number | null;
}

// Все файлы-кандидаты на удаление: есть filePath, не удалены, fileDeletedAt ещё не стоит.
export function listAttachmentsForCleanup(): AttachmentForCleanup[] {
  return getDb()
    .prepare(
      `SELECT id, filePath, size, createdAt FROM attachments
       WHERE filePath IS NOT NULL
         AND deletedAt IS NULL
         AND fileDeletedAt IS NULL
       ORDER BY createdAt ASC`
    )
    .all() as AttachmentForCleanup[];
}

export function markFileDeleted(id: string): void {
  getDb()
    .prepare('UPDATE attachments SET fileDeletedAt = ?, filePath = NULL WHERE id = ?')
    .run(Date.now(), id);
}

// Статистика для UI настроек
export interface FilesStats {
  count: number;
  totalSize: number;
}

export function getFilesStats(): FilesStats {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS totalSize FROM attachments
       WHERE filePath IS NOT NULL AND deletedAt IS NULL AND fileDeletedAt IS NULL`
    )
    .get() as FilesStats;
  return row;
}
