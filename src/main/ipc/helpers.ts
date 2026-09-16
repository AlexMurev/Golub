import { getSelf, getUser, setUserNotificationSound } from '../db/repositories/usersRepo';
import { getDirectChatId } from '../db/repositories/chatsRepo';
import { listPendingForChat, setMessageStatus } from '../db/repositories/messagesRepo';
import { getSetting, setSetting } from '../db/repositories/settingsRepo';
import { readSoundAsDataUrl, getDefaultSoundDataUrl } from '../sounds';
import { sendTo } from '../transport';
import type { SoundData } from '@shared/types';

export function peerFromDirectChat(chatId: string, selfId: string): string | null {
  const parts = chatId.split(':');
  if (parts.length !== 3 || parts[0] !== 'direct') return null;
  const [, a, b] = parts;
  return a === selfId ? b : a;
}

export async function flushPendingForPeer(peerId: string): Promise<number> {
  const self = getSelf();
  if (!self) return 0;

  const chatId = getDirectChatId(self.peerId, peerId);
  const pending = listPendingForChat(chatId);
  let sent = 0;

  for (const msg of pending) {
    const payload = {
      ...msg,
      replyTo: msg.replyTo ? { id: msg.replyTo.id } : null
    };
    const ok = await sendTo(peerId, { type: 'message', payload });
    if (ok) {
      setMessageStatus(msg.id, 'sent');
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`Flushed ${sent} pending messages to ${peerId}`);
  }
  return sent;
}

export function getGlobalVolume(): number {
  const raw = getSetting('sound:volume');
  if (raw === null) return 1;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

export function getGlobalMono(): boolean {
  return getSetting('sound:mono') === '1';
}

export function resolveGlobalSound(): SoundData {
  const name = getSetting('sound:global');
  if (name) {
    const dataUrl = readSoundAsDataUrl(name);
    if (dataUrl) {
      return { name, dataUrl, volume: getGlobalVolume(), mono: getGlobalMono() };
    }
    setSetting('sound:global', '');
  }
  return {
    name: null,
    dataUrl: getDefaultSoundDataUrl(),
    volume: getGlobalVolume(),
    mono: getGlobalMono()
  };
}

export function resolveSoundForPeer(peerId: string): SoundData {
  const user = getUser(peerId);

  // Звук: per-peer → глобальный → дефолтный
  let name = user?.notificationSound ?? null;
  let dataUrl: string | null = null;

  if (name) {
    dataUrl = readSoundAsDataUrl(name);
    if (!dataUrl) {
      setUserNotificationSound(peerId, null);
      name = null;
    }
  }
  if (!dataUrl) {
    const globalName = getSetting('sound:global');
    if (globalName) {
      dataUrl = readSoundAsDataUrl(globalName);
      name = globalName;
    }
  }
  if (!dataUrl) {
    dataUrl = getDefaultSoundDataUrl();
    name = null;
  }

  const volume = user?.notificationVolume != null ? user.notificationVolume : getGlobalVolume();
  const mono = user?.notificationMono != null ? user.notificationMono : getGlobalMono();

  return { name, dataUrl, volume, mono };
}
