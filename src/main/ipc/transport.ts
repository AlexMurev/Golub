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
  getMessage
} from '../db/repositories/messagesRepo';
import { flushPendingForPeer } from './helpers';
import type { IpcContext } from './context';
import type { Message } from '@shared/types';

export function registerTransportIpc(ctx: IpcContext): void {
  // =========================================================================
  // Подписки на события транспорта
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

    if (p.type === 'message' && p.payload) {
      const incoming = p.payload as Message;
      ensureUser(incoming.senderId, incoming.senderNickname, incoming.senderAvatar);
      ensureDirectChat(self.peerId, incoming.senderId);
      upsertMessage({ ...incoming, status: null });
      touchChat(incoming.chatId);
      ctx.send('transport:message', from, payload);
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
      softDeleteMessage(id);
      ctx.send('transport:message', from, payload);
    }
  });

  onPeerOnline(async (peerId) => {
    ctx.send('transport:peerOnline', peerId);
    const flushed = await flushPendingForPeer(peerId);
    if (flushed > 0) ctx.notifyDataChanged();
  });
  onPeerOffline((peerId) => ctx.send('transport:peerOffline', peerId));
  onNewPeer((peerId) => ctx.send('transport:newPeer', peerId));
  onPeerUpdated((peerId) => ctx.send('transport:peerUpdated', peerId));

  // =========================================================================
  // IPC-каналы транспорта
  // =========================================================================

  ipcMain.handle('transport:getMyInfo', () => getMyInfo());
  ipcMain.handle('transport:isConnectedTo', (_, peerId: string) => isConnectedTo(peerId));
}
