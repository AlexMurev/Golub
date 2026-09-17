import { ipcMain } from 'electron';
import {
  getMyInfo,
  sendTo,
  isConnectedTo,
  onMessage,
  onPeerOnline,
  onPeerOffline,
  onNewPeer,
  onPeerUpdated
} from '../transport';
import {
  getSelf,
  getUser,
  ensureUser,
  updateUserAddress,
  setContactStatus,
  removeUser
} from '../db/repositories/usersRepo';
import { ensureDirectChat, touchChat } from '../db/repositories/chatsRepo';
import {
  upsertMessage,
  editMessage,
  softDeleteMessage,
  getMessage,
  setMessageStatus,
  markSentMessagesAsRead
} from '../db/repositories/messagesRepo';
import { flushPendingForPeer } from './helpers';
import type { IpcContext } from './context';
import type { Message } from '@shared/types';
import {
  insertAttachment,
  listForMessage,
  softDeleteAttachment
} from '../db/repositories/attachmentsRepo';
import { handleIncoming, retryPendingForPeer } from '../transfer/manager';
import { deleteAttachmentFile } from '../files';
import { getSetting } from '../db/repositories/settingsRepo';

export function registerTransportIpc(ctx: IpcContext): void {
  // =========================================================================
  // Подписки на события транспорта
  // =========================================================================

  onMessage((from, payload) => {
    const p = payload as { type?: string; payload?: unknown };

    // Перехватываем file-* сообщения для TransferManager
    if (p.type && p.type.startsWith('file-')) {
      handleIncoming(from, payload);
      return;
    }

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
        ensureDirectChat(self.peerId, req.peerId);
        void sendTo(req.peerId, { type: 'friend-accept', payload: { peerId: self.peerId } });
        ctx.notifyDataChanged();
        return;
      }

      setContactStatus(req.peerId, 'pending_incoming');
      ctx.notifyDataChanged();
      return;
    }

    if (p.type === 'friend-accept') {
      setContactStatus(from, 'accepted');
      ensureDirectChat(self.peerId, from);
      ctx.notifyDataChanged();
      return;
    }

    if (p.type === 'friend-reject') {
      removeUser(from);
      ctx.notifyDataChanged();
      return;
    }

    if (p.type === 'message-delivered' && p.payload) {
      const { id } = p.payload as { id: string };
      const msg = getMessage(id);
      if (msg && msg.senderId === self.peerId && msg.status !== 'read') {
        setMessageStatus(id, 'delivered');
        ctx.send('transport:message', from, payload);
      }
      return;
    }

    if (p.type === 'message-read' && p.payload) {
      const { chatId } = p.payload as { chatId: string };
      markSentMessagesAsRead(chatId, self.peerId);
      ctx.send('transport:message', from, payload);
      return;
    }
    if (p.type === 'typing' && p.payload) {
      const { isTyping } = p.payload as { isTyping: boolean };
      ctx.send('transport:typing', from, isTyping);
      return;
    }
    if (p.type === 'message' && p.payload) {
      const incoming = p.payload as Message;
      ensureUser(incoming.senderId, incoming.senderNickname, incoming.senderAvatar);
      ensureDirectChat(self.peerId, incoming.senderId);
      upsertMessage({ ...incoming, status: null });

      // Сохраняем attachments как pending, БЕЗ filePath — файла у нас ещё нет
      for (const att of incoming.attachments ?? []) {
        insertAttachment({
          ...att,
          messageId: incoming.id,
          filePath: null,
          transferState: 'pending'
        });
      }

      touchChat(incoming.chatId);
      ctx.send('transport:message', from, payload);
      const privacy = getSetting('privacy:readReceipts') ?? 'immediate';
      if (privacy !== 'never') {
        void sendTo(from, { type: 'message-delivered', payload: { id: incoming.id } });
      }
      return;
    }

    if (p.type === 'edit-message' && p.payload) {
      const { id, text } = p.payload as { id: string; text: string };
      const existing = getMessage(id);
      if (existing) {
        editMessage(id, text);
        ctx.send('transport:message', from, payload);
      }
      return;
    }

    if (p.type === 'delete-message' && p.payload) {
      const { id } = p.payload as { id: string };

      // Удаляем файлы сообщения с диска и из БД
      const attachments = listForMessage(id);
      for (const att of attachments) {
        if (att.filePath) deleteAttachmentFile(att.filePath);
        softDeleteAttachment(att.id);
      }

      softDeleteMessage(id);
      ctx.send('transport:message', from, payload);
    }
  });

  onPeerOnline(async (peerId) => {
    ctx.send('transport:peerOnline', peerId);
    const flushed = await flushPendingForPeer(peerId);
    if (flushed > 0) ctx.notifyDataChanged();

    // Перезапускаем pending-передачи файлов для этого пира
    retryPendingForPeer(peerId);
  });
  onPeerOffline((peerId) => ctx.send('transport:peerOffline', peerId));
  onNewPeer((peerId) => ctx.send('transport:newPeer', peerId));
  onPeerUpdated((peerId) => ctx.send('transport:peerUpdated', peerId));

  // =========================================================================
  // IPC-каналы транспорта
  // =========================================================================

  ipcMain.handle('transport:getMyInfo', () => getMyInfo());
  ipcMain.handle('transport:isConnectedTo', (_, peerId: string) => isConnectedTo(peerId));
  ipcMain.handle('transport:sendTyping', async (_, peerId: string, isTyping: boolean) => {
    const self = getSelf();
    if (!self) return { success: false };

    const hide = getSetting('privacy:hideTyping') === '1';
    if (hide && isTyping) return { success: true, skipped: true };

    await sendTo(peerId, { type: 'typing', payload: { isTyping } });
    return { success: true };
  });
}
