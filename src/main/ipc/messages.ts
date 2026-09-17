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
import type { Attachment, Message } from '@shared/types';
import {
  insertAttachment,
  listForMessage,
  softDeleteAttachment
} from '../db/repositories/attachmentsRepo';
import { enqueueOutgoing } from '../transfer/manager';
import { deleteAttachmentFile } from '../files';

export function registerMessagesIpc(ctx: IpcContext): void {
  ipcMain.handle('messages:list', (_, chatId: string, limit = 200, before?: number) => {
    return listMessages(chatId, limit, before);
  });

  ipcMain.handle(
    'messages:send',
    async (
      _,
      peerId: string,
      text: string,
      replyToId: string | null,
      attachments: Attachment[]
    ) => {
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
        status: 'pending',
        attachments: []
      };

      insertMessage(message, replyToId);

      // Сохраняем attachments
      const insertedAttachments: Attachment[] = [];
      for (const att of attachments) {
        const full: Attachment = {
          ...att,
          messageId: message.id
        };
        insertAttachment(full);
        insertedAttachments.push(full);
      }
      message.attachments = insertedAttachments;

      touchChat(chatId);
      ctx.notifyDataChanged();

      // Отправляем метаданные сообщения в фоне
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

      // Ставим файлы в очередь на передачу
      for (const att of insertedAttachments) {
        enqueueOutgoing(peerId, att);
      }

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
    ctx.notifyDataChanged();

    const updated = getMessage(messageId);
    if (updated?.editedAt) {
      const peerId = peerFromDirectChat(msg.chatId, self.peerId);
      if (peerId) {
        void sendTo(peerId, {
          type: 'edit-message',
          payload: { id: messageId, text: newText, editedAt: updated.editedAt }
        });
      }
    }

    return { success: true };
  });

  ipcMain.handle('messages:delete', async (_, messageId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    const msg = getMessage(messageId);
    if (!msg) return { success: false };
    if (msg.senderId !== self.peerId) return { success: false, error: 'Не ваше сообщение' };

    // Удаляем файлы сообщения с диска и из БД
    const attachments = listForMessage(messageId);
    for (const att of attachments) {
      if (att.filePath) deleteAttachmentFile(att.filePath);
      softDeleteAttachment(att.id);
    }

    softDeleteMessage(messageId);
    ctx.notifyDataChanged();

    const peerId = peerFromDirectChat(msg.chatId, self.peerId);
    if (peerId) {
      void sendTo(peerId, { type: 'delete-message', payload: { id: messageId } });
    }

    return { success: true };
  });
}
