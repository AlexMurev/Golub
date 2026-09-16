import { ipcMain, nativeImage, app } from 'electron';
import { getSetting, setSetting } from '../db/repositories/settingsRepo';
import { getLinkPreview } from 'link-preview-js';
import type { IpcContext } from './context';

export function registerAppIpc(ctx: IpcContext): void {
  // =========================================================================
  // Version / Updates
  // =========================================================================

  ipcMain.handle('app:getVersion', () => app.getVersion());

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

  // =========================================================================
  // Taskbar badge
  // =========================================================================

  let lastHasUnread = false;
  let overlayIcon: Electron.NativeImage | null = null;

  function createDotIcon(size = 16): Electron.NativeImage {
    const buf = Buffer.alloc(size * size * 4);
    const center = size / 2;
    const radius = size / 2 - 1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center + 0.5;
        const dy = y - center + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = (y * size + x) * 4;
        if (dist <= radius) {
          buf[i] = 0xf2; // B (Windows BGRA)
          buf[i + 1] = 0x3f; // G
          buf[i + 2] = 0x43; // R
          buf[i + 3] = 0xff; // A
        } else {
          buf[i + 3] = 0;
        }
      }
    }
    return nativeImage.createFromBuffer(buf, { width: size, height: size });
  }

  function applyBadge(): void {
    const enabled = getSetting('taskbar:badge') !== '0';
    const shouldShow = enabled && lastHasUnread;

    if (process.platform === 'win32') {
      if (shouldShow) {
        if (!overlayIcon) overlayIcon = createDotIcon();
        ctx.mainWindow.setOverlayIcon(overlayIcon, 'Непрочитанные сообщения');
      } else {
        ctx.mainWindow.setOverlayIcon(null, '');
      }
    } else {
      app.setBadgeCount(shouldShow ? 1 : 0);
    }
  }

  ipcMain.handle('app:setBadge', (_, hasUnread: boolean) => {
    lastHasUnread = hasUnread;
    applyBadge();
    return { success: true };
  });

  ipcMain.handle('app:getBadgeEnabled', () => getSetting('taskbar:badge') !== '0');

  ipcMain.handle('app:setBadgeEnabled', (_, enabled: boolean) => {
    setSetting('taskbar:badge', enabled ? '1' : '0');
    applyBadge();
    return { success: true };
  });

  ipcMain.handle('settings:getImageCompression', () => {
    return getSetting('images:compression') ?? 'medium';
  });

  ipcMain.handle('settings:setImageCompression', (_, level: string) => {
    setSetting('images:compression', level);
    return { success: true };
  });
}
