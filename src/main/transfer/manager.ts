import { createReadStream, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { sendTo } from '../transport';
import { setTransferState, updateAttachmentFile } from '../db/repositories/attachmentsRepo';
import { getDb } from '../db/index';
import { getSelf } from '../db/repositories/usersRepo';
import { getDirectChatId } from '../db/repositories/chatsRepo';
import type { Attachment } from '@shared/types';
import { getDataDir } from '../paths';

const CHUNK_SIZE = 256 * 1024; // 256 КБ
const PROGRESS_THROTTLE_MS = 100;

// =============================================================================
// Ошибки
// =============================================================================

class PeerOfflineError extends Error {
  constructor() {
    super('Пир недоступен');
    this.name = 'PeerOfflineError';
  }
}

// =============================================================================
// Типы
// =============================================================================

interface OutgoingTransfer {
  transferId: string;
  peerId: string;
  attachmentId: string;
  messageId: string;
  fileName: string;
  mimeType: string | null;
  size: number;
  filePath: string; // имя файла на диске
}

interface IncomingTransfer {
  transferId: string;
  peerId: string;
  attachmentId: string;
  messageId: string;
  fileName: string;
  mimeType: string | null;
  size: number;
  totalChunks: number;
  chunks: Buffer[];
  receivedChunks: number;
}

export interface ProgressEvent {
  attachmentId: string;
  direction: 'up' | 'down';
  transferred: number;
  total: number;
}

// =============================================================================
// Состояние
// =============================================================================

const outgoingQueue: OutgoingTransfer[] = [];
const incoming = new Map<string, IncomingTransfer>();
const cancelledIds = new Set<string>();
const pendingAcks = new Map<string, string>();

let isProcessing = false;
let currentOutgoing: OutgoingTransfer | null = null;

const progressListeners: ((data: ProgressEvent) => void)[] = [];
const completedListeners: ((attachmentId: string, direction: 'up' | 'down') => void)[] = [];
const failedListeners: ((attachmentId: string, direction: 'up' | 'down', error: string) => void)[] =
  [];

// =============================================================================
// Подписки
// =============================================================================

export function onTransferProgress(cb: (data: ProgressEvent) => void): void {
  progressListeners.push(cb);
}

export function onTransferComplete(
  cb: (attachmentId: string, direction: 'up' | 'down') => void
): void {
  completedListeners.push(cb);
}

export function onTransferFailed(
  cb: (attachmentId: string, direction: 'up' | 'down', error: string) => void
): void {
  failedListeners.push(cb);
}

function emitProgress(data: ProgressEvent): void {
  for (const cb of progressListeners) cb(data);
}

function emitComplete(attachmentId: string, direction: 'up' | 'down'): void {
  for (const cb of completedListeners) cb(attachmentId, direction);
}

function emitFailed(attachmentId: string, direction: 'up' | 'down', error: string): void {
  for (const cb of failedListeners) cb(attachmentId, direction, error);
}

// =============================================================================
// Утилиты
// =============================================================================

function attachmentsDir(): string {
  const dir = join(getDataDir(), 'attachments');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getFullPath(fileName: string): string {
  return join(attachmentsDir(), fileName);
}

function getSelfPeerId(): string | null {
  const self = getSelf();
  return self?.peerId ?? null;
}

// =============================================================================
// Исходящие передачи
// =============================================================================

export function enqueueOutgoing(peerId: string, attachment: Attachment): void {
  if (!attachment.filePath) {
    console.warn(`Attachment ${attachment.id} has no filePath, skipping transfer`);
    return;
  }

  const transfer: OutgoingTransfer = {
    transferId: crypto.randomUUID(),
    peerId,
    attachmentId: attachment.id,
    messageId: attachment.messageId,
    fileName: attachment.fileName ?? 'file',
    mimeType: attachment.mimeType,
    size: attachment.size ?? 0,
    filePath: attachment.filePath
  };

  setTransferState(attachment.id, 'pending');
  outgoingQueue.push(transfer);
  void processQueue();
}

export function cancelTransfer(attachmentId: string): void {
  cancelledIds.add(attachmentId);

  // Если это текущая передача — флаг сработает в цикле runTransfer
  if (currentOutgoing?.attachmentId === attachmentId) {
    return;
  }

  // Убираем из очереди, если ещё не началась
  const idx = outgoingQueue.findIndex((t) => t.attachmentId === attachmentId);
  if (idx !== -1) {
    const [removed] = outgoingQueue.splice(idx, 1);
    setTransferState(removed.attachmentId, 'failed');
    emitFailed(removed.attachmentId, 'up', 'Отменено');
  }

  // Убираем входящие передачи того же attachment
  for (const [transferId, inc] of incoming.entries()) {
    if (inc.attachmentId === attachmentId) {
      incoming.delete(transferId);
      emitFailed(attachmentId, 'down', 'Отменено');
      break;
    }
  }
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (outgoingQueue.length > 0) {
    const transfer = outgoingQueue.shift()!;
    currentOutgoing = transfer;

    try {
      await runTransfer(transfer);
    } catch (err) {
      if (err instanceof PeerOfflineError) {
        // Пир оффлайн — оставляем attachment в pending.
        // Перезапустится при следующем онлайне через retryPendingForPeer.
        console.log(`Peer ${transfer.peerId} offline, deferring transfer`);
        setTransferState(transfer.attachmentId, 'pending');
      } else {
        console.error(`Transfer failed for ${transfer.attachmentId}:`, err);
        setTransferState(transfer.attachmentId, 'failed');
        emitFailed(transfer.attachmentId, 'up', String(err));
      }
    } finally {
      cancelledIds.delete(transfer.attachmentId);
      currentOutgoing = null;
    }
  }

  isProcessing = false;
}

async function runTransfer(t: OutgoingTransfer): Promise<void> {
  const fullPath = getFullPath(t.filePath);
  if (!existsSync(fullPath)) {
    throw new Error('Файл не найден на диске');
  }

  const totalChunks = Math.max(1, Math.ceil(t.size / CHUNK_SIZE));

  const beginSent = await sendTo(t.peerId, {
    type: 'file-begin',
    payload: {
      transferId: t.transferId,
      attachmentId: t.attachmentId,
      messageId: t.messageId,
      fileName: t.fileName,
      mimeType: t.mimeType,
      size: t.size,
      totalChunks
    }
  });

  if (!beginSent) {
    throw new PeerOfflineError();
  }

  const stream = createReadStream(fullPath, { highWaterMark: CHUNK_SIZE });
  let index = 0;
  let transferred = 0;
  let lastProgressAt = 0;

  for await (const chunk of stream) {
    if (cancelledIds.has(t.attachmentId)) {
      await sendTo(t.peerId, {
        type: 'file-cancel',
        payload: { transferId: t.transferId }
      });
      throw new Error('Отменено пользователем');
    }

    const data = (chunk as Buffer).toString('base64');
    const ok = await sendTo(t.peerId, {
      type: 'file-chunk',
      payload: { transferId: t.transferId, index, data }
    });

    if (!ok) {
      throw new PeerOfflineError();
    }

    transferred += (chunk as Buffer).length;
    index++;

    const now = Date.now();
    if (now - lastProgressAt > PROGRESS_THROTTLE_MS || index === totalChunks) {
      emitProgress({
        attachmentId: t.attachmentId,
        direction: 'up',
        transferred,
        total: t.size
      });
      lastProgressAt = now;
    }
  }

  await sendTo(t.peerId, {
    type: 'file-end',
    payload: { transferId: t.transferId }
  });

  // Успешно отправили все чанки — считаем файл доставленным.
  // Отправитель не должен ждать ack от получателя, иначе UI будет висеть в pending.
  setTransferState(t.attachmentId, 'complete');
  emitProgress({
    attachmentId: t.attachmentId,
    direction: 'up',
    transferred: t.size,
    total: t.size
  });
  emitComplete(t.attachmentId, 'up');

  // Запоминаем на случай, если получатель откажет
  pendingAcks.set(t.transferId, t.attachmentId);
  setTimeout(() => pendingAcks.delete(t.transferId), 60_000);

  // Не помечаем complete здесь — ждём file-ack от получателя.
}

export function handleAck(transferId: string, ok: boolean, error?: string): void {
  const attachmentId = pendingAcks.get(transferId);
  if (!attachmentId) return;

  if (ok) {
    // Уже complete — просто чистим Map
    pendingAcks.delete(transferId);
    return;
  }

  // Получатель не смог сохранить — помечаем failed
  pendingAcks.delete(transferId);
  setTransferState(attachmentId, 'failed');
  emitFailed(attachmentId, 'up', error ?? 'Получатель отклонил');
}

// =============================================================================
// Входящие передачи
// =============================================================================

export function handleIncoming(from: string, payload: unknown): void {
  const p = payload as { type?: string; payload?: unknown };
  if (!p.type || !p.type.startsWith('file-')) return;

  const data = p.payload as Record<string, unknown>;

  switch (p.type) {
    case 'file-begin':
      handleBegin(from, data);
      return;
    case 'file-chunk':
      void handleChunk(from, data);
      return;
    case 'file-end':
      void handleEnd(from, data);
      return;
    case 'file-ack':
      handleAck(data.transferId as string, data.ok as boolean, data.error as string | undefined);
      return;
    case 'file-cancel': {
      const transferId = data.transferId as string;
      for (const [tid, inc] of incoming.entries()) {
        if (tid === transferId) {
          incoming.delete(tid);
          emitFailed(inc.attachmentId, 'down', 'Отменено отправителем');
          break;
        }
      }
      return;
    }
  }
}

function handleBegin(from: string, data: Record<string, unknown>): void {
  const inc: IncomingTransfer = {
    transferId: data.transferId as string,
    peerId: from,
    attachmentId: data.attachmentId as string,
    messageId: data.messageId as string,
    fileName: data.fileName as string,
    mimeType: (data.mimeType as string | null) ?? null,
    size: data.size as number,
    totalChunks: data.totalChunks as number,
    chunks: [],
    receivedChunks: 0
  };

  incoming.set(inc.transferId, inc);
  emitProgress({
    attachmentId: inc.attachmentId,
    direction: 'down',
    transferred: 0,
    total: inc.size
  });
}

async function handleChunk(_from: string, data: Record<string, unknown>): Promise<void> {
  const transferId = data.transferId as string;
  const inc = incoming.get(transferId);
  if (!inc) return;

  const index = data.index as number;
  const buf = Buffer.from(data.data as string, 'base64');

  inc.chunks[index] = buf;
  inc.receivedChunks++;

  emitProgress({
    attachmentId: inc.attachmentId,
    direction: 'down',
    transferred: Math.min(inc.receivedChunks * CHUNK_SIZE, inc.size),
    total: inc.size
  });
}

async function handleEnd(from: string, data: Record<string, unknown>): Promise<void> {
  const transferId = data.transferId as string;
  const inc = incoming.get(transferId);
  if (!inc) return;

  try {
    const buffer = Buffer.concat(inc.chunks, inc.size);

    const ext = extname(inc.fileName).toLowerCase().slice(1);
    const uuid = crypto.randomUUID();
    const diskName = ext ? `${uuid}.${ext}` : uuid;
    const fullPath = getFullPath(diskName);

    writeFileSync(fullPath, buffer);

    updateAttachmentFile(inc.attachmentId, diskName, 'complete');

    incoming.delete(transferId);
    emitProgress({
      attachmentId: inc.attachmentId,
      direction: 'down',
      transferred: inc.size,
      total: inc.size
    });
    emitComplete(inc.attachmentId, 'down');

    await sendTo(from, {
      type: 'file-ack',
      payload: { transferId, ok: true }
    });
  } catch (err) {
    console.error('Failed to finalize incoming transfer:', err);
    incoming.delete(transferId);
    emitFailed(inc.attachmentId, 'down', String(err));
    await sendTo(from, {
      type: 'file-ack',
      payload: { transferId, ok: false, error: String(err) }
    });
  }
}

// =============================================================================
// Перезапуск pending-передач при онлайне пира
// =============================================================================

export function retryPendingForPeer(peerId: string): void {
  const self = getSelfPeerId();
  if (!self) return;

  const chatId = getDirectChatId(self, peerId);

  const rows = getDb()
    .prepare(
      `SELECT a.* FROM attachments a
       JOIN messages m ON m.id = a.messageId
       WHERE m.chatId = ?
         AND m.senderId = ?
         AND a.transferState = 'pending'
         AND a.deletedAt IS NULL
       ORDER BY m.createdAt ASC, a.orderIndex ASC`
    )
    .all(chatId, self) as Attachment[];

  for (const att of rows) {
    if (outgoingQueue.some((t) => t.attachmentId === att.id)) continue;
    if (currentOutgoing?.attachmentId === att.id) continue;
    enqueueOutgoing(peerId, att);
  }
}
