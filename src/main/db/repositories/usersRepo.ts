import { getDb } from '../index';
import type { ContactStatus, User } from '@shared/types';

interface UserRaw extends Omit<User, 'isSelf'> {
  isSelf: number;
}

function toUser(raw: UserRaw | undefined): User | null {
  if (!raw) return null;
  return { ...raw, isSelf: raw.isSelf === 1 };
}

export function getSelf(): User | null {
  const row = getDb().prepare('SELECT * FROM users WHERE isSelf = 1 LIMIT 1').get() as
    UserRaw | undefined;
  return toUser(row);
}

export function getUser(peerId: string): User | null {
  const row = getDb().prepare('SELECT * FROM users WHERE peerId = ?').get(peerId) as
    UserRaw | undefined;
  return toUser(row);
}

export function listUsers(): User[] {
  const rows = getDb()
    .prepare('SELECT * FROM users WHERE isSelf = 0 ORDER BY nickname COLLATE NOCASE')
    .all() as UserRaw[];
  return rows.map((r) => toUser(r)!);
}

export function upsertSelf(peerId: string, nickname: string, avatar: string | null): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO users (peerId, nickname, avatar, isSelf, createdAt, updatedAt)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(peerId) DO UPDATE SET
         nickname = excluded.nickname,
         avatar = excluded.avatar,
         updatedAt = excluded.updatedAt`
    )
    .run(peerId, nickname, avatar, now, now);
}

export function updateSelf(patch: { nickname?: string; avatar?: string | null }): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.nickname !== undefined) {
    fields.push('nickname = ?');
    values.push(patch.nickname);
  }
  if (patch.avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(patch.avatar);
  }
  if (fields.length === 0) return;

  fields.push('updatedAt = ?');
  values.push(Date.now());

  getDb()
    .prepare(`UPDATE users SET ${fields.join(', ')} WHERE isSelf = 1`)
    .run(...values);
}

// Умный upsert: не перетирает nickname, если пришло пустое значение
export function ensureUser(peerId: string, nickname: string | null, avatar: string | null): User {
  const existing = getUser(peerId);
  if (existing) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (nickname && nickname !== existing.nickname) {
      fields.push('nickname = ?');
      values.push(nickname);
    }
    if (avatar !== null && avatar !== existing.avatar) {
      fields.push('avatar = ?');
      values.push(avatar);
    }
    if (fields.length > 0) {
      fields.push('updatedAt = ?');
      values.push(Date.now());
      values.push(peerId);
      getDb()
        .prepare(`UPDATE users SET ${fields.join(', ')} WHERE peerId = ?`)
        .run(...values);
    }
    return getUser(peerId)!;
  }

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO users (peerId, nickname, avatar, isSelf, addedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, ?, ?, ?)`
    )
    .run(peerId, nickname ?? 'Аноним', avatar, now, now, now);
  return getUser(peerId)!;
}

export function updateUserAddress(peerId: string, address: string | null): void {
  getDb()
    .prepare('UPDATE users SET address = ?, updatedAt = ? WHERE peerId = ?')
    .run(address, Date.now(), peerId);
}

export function setContactStatus(peerId: string, status: ContactStatus): void {
  getDb()
    .prepare('UPDATE users SET contactStatus = ?, updatedAt = ? WHERE peerId = ?')
    .run(status, Date.now(), peerId);
}

export function removeUser(peerId: string): void {
  getDb().prepare('DELETE FROM users WHERE peerId = ? AND isSelf = 0').run(peerId);
}
