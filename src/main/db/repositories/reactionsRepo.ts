import { getDb } from '../index';
import type { Reaction, MyReaction } from '@shared/types';

// =============================================================================
// Реакции на сообщения
// =============================================================================

// Список реакций для набора сообщений: Map<messageId, Reaction[]>
export function listReactionsForMessages(messageIds: string[]): Map<string, Reaction[]> {
  if (messageIds.length === 0) return new Map();

  const placeholders = messageIds.map(() => '?').join(',');
  const rows = getDb()
    .prepare(`SELECT * FROM reactions WHERE messageId IN (${placeholders}) ORDER BY createdAt ASC`)
    .all(...messageIds) as Reaction[];

  const byMessage = new Map<string, Reaction[]>();
  for (const r of rows) {
    const list = byMessage.get(r.messageId) ?? [];
    list.push(r);
    byMessage.set(r.messageId, list);
  }
  return byMessage;
}

export function listReactionsForMessage(messageId: string): Reaction[] {
  return getDb()
    .prepare('SELECT * FROM reactions WHERE messageId = ? ORDER BY createdAt ASC')
    .all(messageId) as Reaction[];
}

// Одна реакция на пользователя на сообщение. Upsert.
export function setReaction(reaction: Reaction): void {
  getDb()
    .prepare(
      `INSERT INTO reactions (messageId, peerId, dataUrl, name, createdAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(messageId, peerId) DO UPDATE SET
         dataUrl = excluded.dataUrl,
         name = excluded.name,
         createdAt = excluded.createdAt`
    )
    .run(
      reaction.messageId,
      reaction.peerId,
      reaction.dataUrl,
      reaction.name,
      reaction.createdAt ?? Date.now()
    );
}

export function removeReaction(messageId: string, peerId: string): void {
  getDb()
    .prepare('DELETE FROM reactions WHERE messageId = ? AND peerId = ?')
    .run(messageId, peerId);
}

// =============================================================================
// Личная палитра пользователя (кастомные реакции)
// =============================================================================

export function listMyReactions(): MyReaction[] {
  return getDb()
    .prepare('SELECT * FROM myReactions ORDER BY orderIndex ASC, createdAt ASC')
    .all() as MyReaction[];
}

export function addMyReaction(reaction: MyReaction): void {
  getDb()
    .prepare(
      `INSERT INTO myReactions (id, dataUrl, name, orderIndex, createdAt)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(reaction.id, reaction.dataUrl, reaction.name, reaction.orderIndex, reaction.createdAt);
}

export function removeMyReaction(id: string): void {
  getDb().prepare('DELETE FROM myReactions WHERE id = ?').run(id);
}

// Проверка: есть ли уже такая реакция в палитре (по dataUrl)
export function findMyReactionByDataUrl(dataUrl: string): MyReaction | null {
  const row = getDb()
    .prepare('SELECT * FROM myReactions WHERE dataUrl = ? LIMIT 1')
    .get(dataUrl) as MyReaction | undefined;
  return row ?? null;
}
