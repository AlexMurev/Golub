import { ipcMain } from 'electron';
import {
  getUser,
  setUserNotificationSound,
  setUserNotificationVolume,
  setUserNotificationMono
} from '../db/repositories/usersRepo';
import { getSetting, setSetting } from '../db/repositories/settingsRepo';
import { saveSound, deleteSound } from '../sounds';
import { resolveGlobalSound, resolveSoundForPeer } from './helpers';
import type { IpcContext } from './context';

export function registerSoundsIpc(ctx: IpcContext): void {
  // =========================================================================
  // Global
  // =========================================================================

  ipcMain.handle('sounds:getGlobal', () => resolveGlobalSound());

  ipcMain.handle('sounds:setGlobal', (_, dataUrl: string, originalName: string) => {
    const old = getSetting('sound:global');
    const result = saveSound(dataUrl, originalName);
    if (!result.success || !result.fileName) return { success: false, error: result.error };
    if (old && old !== result.fileName) deleteSound(old);
    setSetting('sound:global', result.fileName);
    return { success: true };
  });

  ipcMain.handle('sounds:clearGlobal', () => {
    const old = getSetting('sound:global');
    if (old) deleteSound(old);
    setSetting('sound:global', '');
    return { success: true };
  });

  ipcMain.handle('sounds:setGlobalVolume', (_, v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setSetting('sound:volume', String(clamped));
    return { success: true };
  });

  ipcMain.handle('sounds:setGlobalMono', (_, v: boolean) => {
    setSetting('sound:mono', v ? '1' : '0');
    return { success: true };
  });

  // =========================================================================
  // Per-peer
  // =========================================================================

  ipcMain.handle('sounds:getForPeer', (_, peerId: string) => resolveSoundForPeer(peerId));

  ipcMain.handle(
    'sounds:setForPeer',
    (_, peerId: string, dataUrl: string, originalName: string) => {
      const user = getUser(peerId);
      const old = user?.notificationSound ?? null;
      const result = saveSound(dataUrl, originalName);
      if (!result.success || !result.fileName) return { success: false, error: result.error };
      if (old && old !== result.fileName) deleteSound(old);
      setUserNotificationSound(peerId, result.fileName);
      ctx.notifyDataChanged();
      return { success: true };
    }
  );

  ipcMain.handle('sounds:clearForPeer', (_, peerId: string) => {
    const user = getUser(peerId);
    if (user?.notificationSound) {
      deleteSound(user.notificationSound);
      setUserNotificationSound(peerId, null);
      ctx.notifyDataChanged();
    }
    return { success: true };
  });

  ipcMain.handle('sounds:setForPeerVolume', (_, peerId: string, v: number | null) => {
    setUserNotificationVolume(peerId, v);
    ctx.notifyDataChanged();
    return { success: true };
  });

  ipcMain.handle('sounds:setForPeerMono', (_, peerId: string, v: boolean | null) => {
    setUserNotificationMono(peerId, v);
    ctx.notifyDataChanged();
    return { success: true };
  });
}
