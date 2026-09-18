import { ipcMain } from 'electron';
import {
  setReaction,
  removeReaction,
  listMyReactions,
  addMyReaction,
  removeMyReaction,
  findMyReactionByDataUrl
} from '../db/repositories/reactionsRepo';
import { getMessage } from '../db/repositories/messagesRepo';
import { getSelf } from '../db/repositories/usersRepo';
import { sendTo } from '../transport';
import { getSetting, setSetting } from '../db/repositories/settingsRepo';
import { peerFromDirectChat } from './helpers';
import { DEFAULT_REACTIONS, DEFAULT_QUICK_REACTIONS } from '@shared/defaultReactions';
import type { IpcContext } from './context';
import type { MyReaction } from '@shared/types';

export function registerReactionsIpc(ctx: IpcContext): void {
  // Полный список для пикера: дефолтные + кастомные пользователя
  ipcMain.handle('reactions:list', () => {
    const custom = listMyReactions();
    return [...DEFAULT_REACTIONS, ...custom];
  });

  // Быстрые реакции (3 штуки на hover)
  ipcMain.handle('reactions:getQuick', () => {
    const raw = getSetting('reactions:quick');
    if (!raw) return DEFAULT_QUICK_REACTIONS;
    try {
      const parsed = JSON.parse(raw) as { name: string; dataUrl: string }[];
      if (!Array.isArray(parsed) || parsed.length !== 3) return DEFAULT_QUICK_REACTIONS;
      return parsed;
    } catch {
      return DEFAULT_QUICK_REACTIONS;
    }
  });

  ipcMain.handle('reactions:setQuick', (_, quick: { name: string; dataUrl: string }[]) => {
    setSetting('reactions:quick', JSON.stringify(quick));
    return { success: true };
  });

  // Поставить реакцию на сообщение
  ipcMain.handle(
    'reactions:set',
    async (_, messageId: string, reaction: { dataUrl: string; name: string }) => {
      const self = getSelf();
      if (!self) return { success: false };

      const msg = getMessage(messageId);
      if (!msg) return { success: false };

      const createdAt = Date.now();
      setReaction({
        messageId,
        peerId: self.peerId,
        dataUrl: reaction.dataUrl,
        name: reaction.name,
        createdAt
      });
      ctx.notifyDataChanged();

      const peerId = peerFromDirectChat(msg.chatId, self.peerId);
      if (peerId) {
        void sendTo(peerId, {
          type: 'reaction-set',
          payload: {
            messageId,
            dataUrl: reaction.dataUrl,
            name: reaction.name,
            createdAt
          }
        });
      }

      return { success: true };
    }
  );

  // Убрать свою реакцию с сообщения
  ipcMain.handle('reactions:remove', async (_, messageId: string) => {
    const self = getSelf();
    if (!self) return { success: false };

    const msg = getMessage(messageId);
    if (!msg) return { success: false };

    removeReaction(messageId, self.peerId);
    ctx.notifyDataChanged();

    const peerId = peerFromDirectChat(msg.chatId, self.peerId);
    if (peerId) {
      void sendTo(peerId, {
        type: 'reaction-remove',
        payload: { messageId }
      });
    }

    return { success: true };
  });

  // Добавить кастомную в палитру
  ipcMain.handle('reactions:addCustom', (_, payload: { dataUrl: string; name: string }) => {
    if (DEFAULT_REACTIONS.some((d) => d.name === payload.name)) {
      return { success: false, error: 'Дефолтные реакции нельзя сохранять' };
    }

    const existing = findMyReactionByDataUrl(payload.dataUrl);
    if (existing) return { success: true, reaction: existing };

    const list = listMyReactions();
    const reaction: MyReaction = {
      id: crypto.randomUUID(),
      dataUrl: payload.dataUrl,
      name: payload.name,
      orderIndex: list.length,
      createdAt: Date.now()
    };
    addMyReaction(reaction);
    return { success: true, reaction };
  });

  ipcMain.handle('reactions:removeCustom', (_, id: string) => {
    removeMyReaction(id);
    return { success: true };
  });
}
