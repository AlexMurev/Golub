import { ipcMain } from 'electron';
import { WebSocket } from 'ws';
import {
  getSelf,
  updateSelf,
  listUsers,
  getUser,
  ensureUser,
  updateUserAddress,
  setContactStatus,
  removeUser
} from '../db/repositories/usersRepo';
import { ensureDirectChat } from '../db/repositories/chatsRepo';
import { isConnectedTo, sendTo, refreshMyInfo, getMyInfo } from '../transport';
import type { IpcContext } from './context';

export function registerUsersIpc(ctx: IpcContext): void {
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

  ipcMain.handle('users:get', (_, peerId: string) => getUser(peerId));

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
      ensureDirectChat(self.peerId, peerId);
      await sendTo(peerId, { type: 'friend-accept', payload: { peerId: self.peerId } });
      ctx.notifyDataChanged();
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
    ctx.notifyDataChanged();
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
    ensureDirectChat(self.peerId, peerId);
    await sendTo(peerId, { type: 'friend-accept', payload: { peerId: self.peerId } });
    ctx.notifyDataChanged();
    return { success: true, contact: getUser(peerId) };
  });

  ipcMain.handle('users:rejectRequest', async (_, peerId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    await sendTo(peerId, { type: 'friend-reject', payload: { peerId: self.peerId } });
    removeUser(peerId);
    ctx.notifyDataChanged();
    return { success: true };
  });

  ipcMain.handle('users:cancelRequest', async (_, peerId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    await sendTo(peerId, { type: 'friend-reject', payload: { peerId: self.peerId } });
    removeUser(peerId);
    ctx.notifyDataChanged();
    return { success: true };
  });
}
