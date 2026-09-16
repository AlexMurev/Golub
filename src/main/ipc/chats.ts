import { ipcMain } from 'electron';
import { ensureDirectChat, listChatItems, markChatRead } from '../db/repositories/chatsRepo';
import { getSelf, ensureUser } from '../db/repositories/usersRepo';
import { isConnectedTo } from '../transport';
import type { IpcContext } from './context';

export function registerChatsIpc(ctx: IpcContext): void {
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

  ipcMain.handle('chats:markRead', (_, chatId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    markChatRead(chatId, self.peerId);
    ctx.notifyDataChanged();
    return { success: true };
  });
}
