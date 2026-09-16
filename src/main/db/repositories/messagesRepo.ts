import { getDb } from '../index';
import type { Message, MessageStatus } from '@shared/types';
import { listForMessages } from './attachmentsRepo';

interface MessageRaw {
  id: string;
  chatId: string;
  senderId: string;
  text: string | null;
  replyToId: string | null;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
  status: MessageStatus | null;
  senderNickname: string | null;
  senderAvatar: string | null;
  replySenderId: string | null;
  replySenderNickname: string | null;
  replySenderAvatar: string | null;
  replyText: string | null;
  replyDeletedAt: number | null;
}

const SELECT_WITH_JOINS = `
  SELECT
    m.*,
    u.nickname AS senderNickname,
    u.avatar AS senderAvatar,
    r.senderId AS replySenderId,
    ru.nickname AS replySenderNickname,
    ru.avatar AS replySenderAvatar,
    r.text AS replyText,
    r.deletedAt AS replyDeletedAt
  FROM messages m
  LEFT JOIN users u ON u.peerId = m.senderId
  LEFT JOIN messages r ON r.id = m.replyToId
  LEFT JOIN users ru ON ru.peerId = r.senderId
`;

function attachAttachments(messages: Message[]): Message[] {
  if (messages.length === 0) return messages;

  const ids = messages.map((m) => m.id);
  const byMessage = listForMessages(ids);

  return messages.map((m) => ({
    ...m,
    attachments: byMessage.get(m.id) ?? []
  }));
}

function toMessage(raw: MessageRaw): Message {
  return {
    id: raw.id,
    chatId: raw.chatId,
    senderId: raw.senderId,
    senderNickname: raw.senderNickname ?? 'Аноним',
    senderAvatar: raw.senderAvatar,
    text: raw.text ?? '',
    replyTo: raw.replyToId
      ? {
          id: raw.replyToId,
          senderId: raw.replySenderId ?? '',
          senderNickname: raw.replySenderNickname ?? 'Аноним',
          senderAvatar: raw.replySenderAvatar,
          text: raw.replyText ?? '',
          replyDeleted: raw.replyDeletedAt !== null
        }
      : null,
    createdAt: raw.createdAt,
    editedAt: raw.editedAt,
    deletedAt: raw.deletedAt,
    status: raw.status,
    attachments: []
  };
}

export function listMessages(chatId: string, limit = 200, before?: number): Message[] {
  const sql =
    before !== undefined
      ? `${SELECT_WITH_JOINS} WHERE m.chatId = ? AND m.createdAt < ? ORDER BY m.createdAt DESC LIMIT ?`
      : `${SELECT_WITH_JOINS} WHERE m.chatId = ? ORDER BY m.createdAt DESC LIMIT ?`;

  const stmt = getDb().prepare(sql);
  const rows = (
    before !== undefined ? stmt.all(chatId, before, limit) : stmt.all(chatId, limit)
  ) as MessageRaw[];

  const messages = rows.reverse().map(toMessage);
  return attachAttachments(messages);
}

export function getMessage(id: string): Message | null {
  const row = getDb().prepare(`${SELECT_WITH_JOINS} WHERE m.id = ?`).get(id) as
    MessageRaw | undefined;
  if (!row) return null;
  const [msg] = attachAttachments([toMessage(row)]);
  return msg;
}

export function insertMessage(msg: Message, replyToId?: string | null): void {
  const replyId = replyToId !== undefined ? replyToId : (msg.replyTo?.id ?? null);
  getDb()
    .prepare(
      `INSERT INTO messages (id, chatId, senderId, text, replyToId, createdAt, editedAt, deletedAt, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      msg.id,
      msg.chatId,
      msg.senderId,
      msg.text,
      replyId,
      msg.createdAt,
      msg.editedAt,
      msg.deletedAt,
      msg.status
    );
}

const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3
};

export function upsertMessage(msg: Message): void {
  const existing = getMessage(msg.id);
  if (!existing) {
    insertMessage(msg);
    return;
  }

  const newerEdit = (msg.editedAt ?? 0) > (existing.editedAt ?? 0);
  const text = newerEdit ? msg.text : existing.text;
  const editedAt = newerEdit ? msg.editedAt : existing.editedAt;
  const deletedAt = existing.deletedAt ?? msg.deletedAt;

  let status = existing.status;
  if (msg.status) {
    const existingRank = status ? STATUS_RANK[status] : -1;
    if (STATUS_RANK[msg.status] > existingRank) status = msg.status;
  }

  getDb()
    .prepare('UPDATE messages SET text = ?, editedAt = ?, deletedAt = ?, status = ? WHERE id = ?')
    .run(text, editedAt, deletedAt, status, msg.id);
}

export function editMessage(id: string, newText: string): void {
  getDb()
    .prepare('UPDATE messages SET text = ?, editedAt = ? WHERE id = ?')
    .run(newText, Date.now(), id);
}

export function softDeleteMessage(id: string): void {
  getDb().prepare('UPDATE messages SET deletedAt = ? WHERE id = ?').run(Date.now(), id);
}

export function setMessageStatus(id: string, status: MessageStatus): void {
  getDb().prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, id);
}

export function listPendingForChat(chatId: string): Message[] {
  const rows = getDb()
    .prepare(
      `${SELECT_WITH_JOINS} WHERE m.chatId = ? AND m.status = 'pending'
       ORDER BY m.createdAt ASC`
    )
    .all(chatId) as MessageRaw[];
  return attachAttachments(rows.map(toMessage));
}
