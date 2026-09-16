import { ipcMain, BrowserWindow, app } from 'electron';
import { WebSocket } from 'ws';
import {
  getMyInfo,
  sendTo,
  isConnectedTo,
  onMessage,
  onPeerOnline,
  onPeerOffline,
  onNewPeer,
  onPeerUpdated,
  refreshMyInfo
} from './transport';
import {
  getSelf,
  updateSelf,
  listUsers,
  getUser,
  ensureUser,
  updateUserAddress,
  setContactStatus,
  removeUser,
  setUserNotificationSound
} from './db/repositories/usersRepo';
import {
  ensureDirectChat,
  getDirectChatId,
  listChatItems,
  markChatRead,
  touchChat
} from './db/repositories/chatsRepo';
import {
  insertMessage,
  upsertMessage,
  editMessage,
  softDeleteMessage,
  setMessageStatus,
  listMessages,
  getMessage,
  listPendingForChat
} from './db/repositories/messagesRepo';
import type { Message, SoundData } from '@shared/types';
import { getLinkPreview } from 'link-preview-js';
import { deleteSound, getDefaultSoundDataUrl, readSoundAsDataUrl, saveSound } from './sounds';
import { getSetting, setSetting } from './db/repositories/settingsRepo';

function peerFromDirectChat(chatId: string, selfId: string): string | null {
  const parts = chatId.split(':');
  if (parts.length !== 3 || parts[0] !== 'direct') return null;
  const [, a, b] = parts;
  return a === selfId ? b : a;
}

async function flushPendingForPeer(peerId: string): Promise<number> {
  const self = getSelf();
  if (!self) return 0;

  const chatId = getDirectChatId(self.peerId, peerId);
  const pending = listPendingForChat(chatId);
  let sent = 0;

  for (const msg of pending) {
    // Восстанавливаем payload как при обычной отправке
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
    return sent;
  }
  return 0;
}

function resolveSoundForPeer(peerId: string): SoundData {
  const user = getUser(peerId);
  if (user?.notificationSound) {
    const dataUrl = readSoundAsDataUrl(user.notificationSound);
    if (dataUrl) return { name: user.notificationSound, dataUrl };
  }

  const globalName = getSetting('sound:global');
  if (globalName) {
    const dataUrl = readSoundAsDataUrl(globalName);
    if (dataUrl) return { name: globalName, dataUrl };
  }

  return { name: null, dataUrl: getDefaultSoundDataUrl() };
}

export function initIpc(mainWindow: BrowserWindow): void {
  const notifyDataChanged = (): void => send('data:changed');
  const send = (channel: string, ...args: unknown[]): void => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args);
  };

  // =========================================================================
  // Подписки транспорта
  // =========================================================================

  onMessage((from, payload) => {
    const p = payload as { type?: string; payload?: unknown };
    const self = getSelf();
    if (!self) return;

    if (p.type === 'friend-request' && p.payload) {
      const req = p.payload as {
        peerId: string;
        nickname?: string;
        avatar?: string | null;
        address?: string;
      };

      ensureUser(req.peerId, req.nickname ?? 'Аноним', req.avatar ?? null);
      if (req.address) updateUserAddress(req.peerId, req.address);

      const existing = getUser(req.peerId);

      // Коллизия: мы тоже отправили заявку — авто-accept
      if (existing?.contactStatus === 'pending_outgoing') {
        setContactStatus(req.peerId, 'accepted');
        ensureDirectChat(self.peerId, req.peerId); // <-- создать чат
        void sendTo(req.peerId, { type: 'friend-accept', payload: { peerId: self.peerId } });
        send('data:changed');
        return;
      }

      setContactStatus(req.peerId, 'pending_incoming');
      send('data:changed');
      return;
    }

    if (p.type === 'friend-accept') {
      setContactStatus(from, 'accepted');
      ensureDirectChat(self.peerId, from);
      send('data:changed');
      return;
    }

    if (p.type === 'friend-reject') {
      removeUser(from);
      send('data:changed');
      return;
    }

    if (p.type === 'message' && p.payload) {
      const incoming = p.payload as Message;
      ensureUser(incoming.senderId, incoming.senderNickname, incoming.senderAvatar);
      ensureDirectChat(self.peerId, incoming.senderId);
      upsertMessage({ ...incoming, status: null });
      touchChat(incoming.chatId);
      send('transport:message', from, payload);
      return;
    }

    if (p.type === 'edit-message' && p.payload) {
      const { id, text } = p.payload as { id: string; text: string };
      const existing = getMessage(id);
      if (existing) {
        editMessage(id, text);
        send('transport:message', from, payload);
      }
      return;
    }

    if (p.type === 'delete-message' && p.payload) {
      const { id } = p.payload as { id: string };
      softDeleteMessage(id);
      send('transport:message', from, payload);
    }
  });

  onPeerOnline(async (peerId) => {
    send('transport:peerOnline', peerId);
    const flushed = await flushPendingForPeer(peerId);
    if (flushed > 0) notifyDataChanged();
  });
  onPeerOffline((peerId) => send('transport:peerOffline', peerId));
  onNewPeer((peerId) => send('transport:newPeer', peerId));
  onPeerUpdated((peerId) => send('transport:peerUpdated', peerId));

  // =========================================================================
  // Transport
  // =========================================================================

  ipcMain.handle('transport:getMyInfo', () => getMyInfo());
  ipcMain.handle('transport:isConnectedTo', (_, peerId: string) => isConnectedTo(peerId));
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // =========================================================================
  // Self
  // =========================================================================

  ipcMain.handle('users:getSelf', () => getSelf());

  ipcMain.handle('users:updateSelf', (_, patch) => {
    updateSelf(patch);
    refreshMyInfo();
    return getSelf();
  });

  // =========================================================================
  // Users
  // =========================================================================

  ipcMain.handle('users:list', () => {
    return listUsers().map((u) => ({ ...u, isOnline: isConnectedTo(u.peerId) }));
  });

  ipcMain.handle('users:addByAddress', async (_, address: string) => {
    const self = getSelf();
    if (!self) return { success: false, error: 'Self not initialized' };

    const info = getMyInfo();
    if (!info) return { success: false, error: 'Transport not started' };

    const result = await new Promise<{
      success: boolean;
      peerId?: string;
      error?: string;
    }>((resolve) => {
      const url = address.startsWith('ws://') ? address : `ws://${address}`;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        resolve({ success: false, error: `Bad address: ${String(err)}` });
        return;
      }

      let resolved = false;
      const finish = (r: typeof result): void => {
        if (resolved) return;
        resolved = true;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve(r);
      };

      const timeout = setTimeout(
        () => finish({ success: false, error: 'Превышено время ожидания' }),
        8000
      );

      ws.on('open', () => {
        try {
          ws.send(JSON.stringify({ type: 'hello', ...info }));
        } catch (err) {
          clearTimeout(timeout);
          finish({ success: false, error: String(err) });
        }
      });

      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type?: string; peerId?: string };
          if (msg.type !== 'hello' || !msg.peerId) return;
          if (msg.peerId === self.peerId) {
            clearTimeout(timeout);
            finish({ success: false, error: 'Cannot add yourself' });
            return;
          }
          clearTimeout(timeout);
          finish({ success: true, peerId: msg.peerId });
        } catch (err) {
          clearTimeout(timeout);
          finish({ success: false, error: String(err) });
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        finish({ success: false, error: err.message });
      });
    });

    if (!result.success || !result.peerId) return result;

    const peerId = result.peerId;
    ensureUser(peerId, null, null);
    updateUserAddress(peerId, address);

    const existing = getUser(peerId);
    // Если это входящая заявка — сразу принимаем
    if (existing?.contactStatus === 'pending_incoming') {
      setContactStatus(peerId, 'accepted');
      ensureDirectChat(self.peerId, peerId); // <-- создать чат
      await sendTo(peerId, { type: 'friend-accept', payload: { peerId: self.peerId } });
      notifyDataChanged();
      return { success: true, contact: getUser(peerId), autoAccepted: true };
    }

    // Иначе отправляем заявку
    setContactStatus(peerId, 'pending_outgoing');
    await sendTo(peerId, {
      type: 'friend-request',
      payload: {
        peerId: self.peerId,
        nickname: self.nickname,
        avatar: self.avatar,
        address: info.address
      }
    });
    notifyDataChanged();
    return { success: true, contact: getUser(peerId) };
  });

  ipcMain.handle('users:remove', (_, peerId: string) => {
    removeUser(peerId);
    return { success: true };
  });

  ipcMain.handle('users:acceptRequest', async (_, peerId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    setContactStatus(peerId, 'accepted');
    ensureDirectChat(self.peerId, peerId); // <-- создать чат
    await sendTo(peerId, { type: 'friend-accept', payload: { peerId: self.peerId } });
    notifyDataChanged();
    return { success: true, contact: getUser(peerId) };
  });

  ipcMain.handle('users:rejectRequest', async (_, peerId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    await sendTo(peerId, { type: 'friend-reject', payload: { peerId: self.peerId } });
    removeUser(peerId);
    notifyDataChanged();
    return { success: true };
  });

  ipcMain.handle('users:cancelRequest', async (_, peerId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    await sendTo(peerId, { type: 'friend-reject', payload: { peerId: self.peerId } });
    removeUser(peerId);
    notifyDataChanged();
    return { success: true };
  });

  // =========================================================================
  // Chats
  // =========================================================================

  ipcMain.handle('chats:list', () => {
    const self = getSelf();
    if (!self) return [];

    return listChatItems(self.peerId).map((c) => ({
      ...c,
      isOnline: c.otherPeerId ? isConnectedTo(c.otherPeerId) : false
    }));
  });

  ipcMain.handle('chats:ensureDirect', (_, peerId: string) => {
    const self = getSelf();
    if (!self) return { success: false, error: 'Self not initialized' };

    ensureUser(peerId, null, null);
    const chatId = ensureDirectChat(self.peerId, peerId);
    return { success: true, chatId };
  });

  // =========================================================================
  // Sounds
  // =========================================================================

  ipcMain.handle('sounds:getGlobal', () => {
    const name = getSetting('sound:global');
    if (name) {
      const dataUrl = readSoundAsDataUrl(name);
      if (dataUrl) return { name, dataUrl };
      setSetting('sound:global', '');
    }
    return { name: null, dataUrl: getDefaultSoundDataUrl() };
  });

  ipcMain.handle('sounds:setGlobal', (_, dataUrl: string, originalName: string) => {
    const old = getSetting('sound:global');
    const result = saveSound(dataUrl, originalName);
    if (!result.success || !result.fileName) {
      return { success: false, error: result.error };
    }
    if (old && old !== result.fileName) deleteSound(old);

    setSetting('sound:global', result.fileName);
    const url = readSoundAsDataUrl(result.fileName);
    return { success: true, sound: { name: result.fileName, dataUrl: url } as SoundData };
  });

  ipcMain.handle('sounds:clearGlobal', () => {
    const old = getSetting('sound:global');
    if (old) deleteSound(old);
    setSetting('sound:global', '');
    return { success: true };
  });

  ipcMain.handle('sounds:getForPeer', (_, peerId: string) => resolveSoundForPeer(peerId));

  ipcMain.handle(
    'sounds:setForPeer',
    (_, peerId: string, dataUrl: string, originalName: string) => {
      const user = getUser(peerId);
      const old = user?.notificationSound ?? null;

      const result = saveSound(dataUrl, originalName);
      if (!result.success || !result.fileName) {
        return { success: false, error: result.error };
      }
      if (old && old !== result.fileName) deleteSound(old);

      setUserNotificationSound(peerId, result.fileName);
      notifyDataChanged();
      return { success: true };
    }
  );

  ipcMain.handle('sounds:clearForPeer', (_, peerId: string) => {
    const user = getUser(peerId);
    if (user?.notificationSound) {
      deleteSound(user.notificationSound);
      setUserNotificationSound(peerId, null);
      notifyDataChanged();
    }
    return { success: true };
  });

  ipcMain.handle('sounds:getVolume', () => {
    const raw = getSetting('sound:volume');
    if (raw === null) return 1;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
  });

  ipcMain.handle('sounds:setVolume', (_, v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setSetting('sound:volume', String(clamped));
    return { success: true, volume: clamped };
  });

  // =========================================================================
  // Mark chat as read
  // =========================================================================

  ipcMain.handle('chats:markRead', (_, chatId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    markChatRead(chatId, self.peerId);
    notifyDataChanged();
    return { success: true };
  });

  // =========================================================================
  // Messages
  // =========================================================================

  ipcMain.handle('messages:list', (_, chatId: string, limit = 200, before?: number) => {
    return listMessages(chatId, limit, before);
  });

  ipcMain.handle(
    'messages:send',
    async (_, peerId: string, text: string, replyToId: string | null) => {
      const self = getSelf();
      if (!self) return { success: false, error: 'Self not initialized' };

      ensureUser(peerId, null, null);
      const chatId = ensureDirectChat(self.peerId, peerId);

      const message: Message = {
        id: crypto.randomUUID(),
        chatId,
        senderId: self.peerId,
        senderNickname: self.nickname,
        senderAvatar: self.avatar,
        text,
        replyTo: null,
        createdAt: Date.now(),
        editedAt: null,
        deletedAt: null,
        status: 'pending'
      };

      insertMessage(message, replyToId);
      touchChat(chatId);
      notifyDataChanged();

      // Отправляем в фоне — не блокируем ответ renderer'у
      const payload = {
        ...message,
        replyTo: replyToId ? { id: replyToId } : null
      };
      void sendTo(peerId, { type: 'message', payload }).then((sent) => {
        if (sent) {
          setMessageStatus(message.id, 'sent');
          notifyDataChanged();
        }
      });

      return { success: true, message };
    }
  );

  ipcMain.handle('messages:edit', async (_, messageId: string, newText: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    const msg = getMessage(messageId);
    if (!msg) return { success: false };
    if (msg.senderId !== self.peerId) return { success: false, error: 'Не ваше сообщение' };

    editMessage(messageId, newText);
    const updated = getMessage(messageId);

    if (updated?.editedAt) {
      const peerId = peerFromDirectChat(msg.chatId, self.peerId);
      if (peerId) {
        await sendTo(peerId, {
          type: 'edit-message',
          payload: { id: messageId, text: newText, editedAt: updated.editedAt }
        });
      }
    }
    notifyDataChanged();

    return { success: true };
  });

  ipcMain.handle('messages:delete', async (_, messageId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    const msg = getMessage(messageId);
    if (!msg) return { success: false };
    if (msg.senderId !== self.peerId) return { success: false, error: 'Не ваше сообщение' };

    softDeleteMessage(messageId);

    const peerId = peerFromDirectChat(msg.chatId, self.peerId);
    if (peerId) {
      await sendTo(peerId, { type: 'delete-message', payload: { id: messageId } });
    }
    notifyDataChanged();

    return { success: true };
  });

  ipcMain.handle('link:preview', async (_, url: string) => {
    try {
      const data = await getLinkPreview(url, {
        timeout: 5000,
        headers: { 'user-agent': 'Golub/1.0' }
      });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
}
