import { ipcMain } from 'electron';
import {
  insertMessage,
  editMessage,
  softDeleteMessage,
  setMessageStatus,
  listMessages,
  getMessage
} from '../db/repositories/messagesRepo';
import { ensureUser, getSelf } from '../db/repositories/usersRepo';
import { ensureDirectChat, touchChat } from '../db/repositories/chatsRepo';
import { sendTo } from '../transport';
import { peerFromDirectChat } from './helpers';
import type { IpcContext } from './context';
import type { Message } from '@shared/types';

export function registerMessagesIpc(ctx: IpcContext): void {
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
      ctx.notifyDataChanged();

      // Отправляем в фоне — не блокируем ответ renderer'у
      const payload = {
        ...message,
        replyTo: replyToId ? { id: replyToId } : null
      };
      void sendTo(peerId, { type: 'message', payload }).then((sent) => {
        if (sent) {
          setMessageStatus(message.id, 'sent');
          ctx.notifyDataChanged();
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
    ctx.notifyDataChanged();

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
    ctx.notifyDataChanged();

    return { success: true };
  });
}
