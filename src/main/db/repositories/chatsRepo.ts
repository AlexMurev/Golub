import { getDb } from '../index';
import type { Chat, ChatListItem, ChatMember, Message, ChatRole } from '@shared/types';

export function getDirectChatId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `direct:${x}:${y}`;
}

export function getChat(id: string): Chat | null {
  const row = getDb().prepare('SELECT * FROM chats WHERE id = ?').get(id) as Chat | undefined;
  return row ?? null;
}

export function ensureDirectChat(selfId: string, otherId: string): string {
  const id = getDirectChatId(selfId, otherId);
  if (getChat(id)) return id;

  const now = Date.now();
  const tx = getDb().transaction((): void => {
    getDb()
      .prepare(
        `INSERT INTO chats (id, type, title, createdBy, createdAt, updatedAt)
         VALUES (?, 'direct', NULL, ?, ?, ?)`
      )
      .run(id, selfId, now, now);
    addMember(id, selfId, 'member');
    addMember(id, otherId, 'member');
  });
  tx();
  return id;
}

export function addMember(chatId: string, peerId: string, role: ChatRole): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO chatMembers (chatId, peerId, role, joinedAt, lastReadAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(chatId, peerId) DO UPDATE SET role = excluded.role, leftAt = NULL`
    )
    .run(chatId, peerId, role, now, now);
}

export function markChatRead(chatId: string, peerId: string, at: number = Date.now()): void {
  getDb()
    .prepare('UPDATE chatMembers SET lastReadAt = ? WHERE chatId = ? AND peerId = ?')
    .run(at, chatId, peerId);
}

export function listMembers(chatId: string): ChatMember[] {
  return getDb()
    .prepare('SELECT * FROM chatMembers WHERE chatId = ? AND leftAt IS NULL')
    .all(chatId) as ChatMember[];
}

export function touchChat(chatId: string): void {
  getDb().prepare('UPDATE chats SET updatedAt = ? WHERE id = ?').run(Date.now(), chatId);
}

// Список чатов для сайдбара с уже встроенным последним сообщением
interface ChatListRaw {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  chatUpdatedAt: number;
  otherPeerId: string | null;
  otherNickname: string | null;
  otherAvatar: string | null;
  lastMessageId: string | null;
  lastSenderId: string | null;
  lastSenderNickname: string | null;
  lastSenderAvatar: string | null;
  lastText: string | null;
  lastCreatedAt: number | null;
  lastEditedAt: number | null;
  lastDeletedAt: number | null;
  lastStatus: string | null;
  lastReplyToId: string | null;
  unreadCount: number;
}

export function listChatItems(selfPeerId: string): ChatListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT
        c.id, c.type, c.title, c.updatedAt AS chatUpdatedAt,
        (
          SELECT peerId FROM chatMembers
          WHERE chatId = c.id AND peerId != ? AND leftAt IS NULL LIMIT 1
        ) AS otherPeerId,
        (
          SELECT u.nickname FROM users u
          WHERE u.peerId = (
            SELECT peerId FROM chatMembers
            WHERE chatId = c.id AND peerId != ? AND leftAt IS NULL LIMIT 1
          )
        ) AS otherNickname,
        (
          SELECT u.avatar FROM users u
          WHERE u.peerId = (
            SELECT peerId FROM chatMembers
            WHERE chatId = c.id AND peerId != ? AND leftAt IS NULL LIMIT 1
          )
        ) AS otherAvatar,
         (
          SELECT COUNT(*) FROM messages um
          WHERE um.chatId = c.id
            AND um.senderId != ?
            AND um.deletedAt IS NULL
            AND um.createdAt > COALESCE(
              (SELECT lastReadAt FROM chatMembers WHERE chatId = c.id AND peerId = ?), 0
            )
        ) AS unreadCount,
        m.id AS lastMessageId,
        m.senderId AS lastSenderId,
        mu.nickname AS lastSenderNickname,
        mu.avatar AS lastSenderAvatar,
        m.text AS lastText,
        m.createdAt AS lastCreatedAt,
        m.editedAt AS lastEditedAt,
        m.deletedAt AS lastDeletedAt,
        m.status AS lastStatus,
        m.replyToId AS lastReplyToId
       FROM chats c
       LEFT JOIN messages m ON m.id = (
         SELECT id FROM messages
         WHERE chatId = c.id AND deletedAt IS NULL
         ORDER BY createdAt DESC, rowid DESC
         LIMIT 1
       )
       LEFT JOIN users mu ON mu.peerId = m.senderId
       WHERE c.deletedAt IS NULL
       ORDER BY COALESCE(m.createdAt, c.updatedAt) DESC, c.rowid DESC`
    )
    .all(selfPeerId, selfPeerId, selfPeerId, selfPeerId, selfPeerId) as ChatListRaw[];

  return rows.map((r) => {
    const lastMessage: Message | null = r.lastMessageId
      ? {
          id: r.lastMessageId,
          chatId: r.id,
          senderId: r.lastSenderId ?? '',
          senderNickname: r.lastSenderNickname ?? 'Аноним',
          senderAvatar: r.lastSenderAvatar,
          text: r.lastText ?? '',
          replyTo: null,
          createdAt: r.lastCreatedAt ?? 0,
          editedAt: r.lastEditedAt,
          deletedAt: r.lastDeletedAt,
          status: r.lastStatus as Message['status'],
          attachments: []
        }
      : null;

    const isDirect = r.type === 'direct';
    return {
      id: r.id,
      type: r.type,
      title: isDirect ? (r.otherNickname ?? 'Без имени') : (r.title ?? 'Группа'),
      avatar: isDirect ? r.otherAvatar : null,
      otherPeerId: isDirect ? r.otherPeerId : null,
      isOnline: false,
      lastMessage,
      updatedAt: r.lastCreatedAt ?? r.chatUpdatedAt,
      unreadCount: r.unreadCount
    };
  });
}

export function deleteChatCompletely(chatId: string): string[] {
  const rows = getDb()
    .prepare(
      `SELECT a.filePath FROM attachments a
       JOIN messages m ON m.id = a.messageId
       WHERE m.chatId = ? AND a.filePath IS NOT NULL`
    )
    .all(chatId) as { filePath: string }[];

  const filePaths = rows.map((r) => r.filePath);

  getDb().prepare('DELETE FROM chats WHERE id = ?').run(chatId);

  return filePaths;
}
