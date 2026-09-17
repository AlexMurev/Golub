import { ipcMain, shell, dialog } from 'electron';
import { saveAttachmentFile, getAttachmentFullPath, deleteAttachmentFile } from '../files';
import { getAttachment } from '../db/repositories/attachmentsRepo';
import type { IpcContext } from './context';
import { runCleanup, getCleanupSettings, setCleanupSettings, getStats } from '../filesCleanup';
import type { CleanupSettings } from '../filesCleanup';

export function registerFilesIpc(ctx: IpcContext): void {
  // Сохранить файл из base64 (полученный из renderer после чтения File)
  ipcMain.handle('files:save', (_, base64: string, originalName: string) => {
    return saveAttachmentFile(base64, originalName);
  });

  // Открыть файл системным приложением
  ipcMain.handle('files:open', async (_, attachmentId: string) => {
    const att = getAttachment(attachmentId);
    if (!att?.filePath) return { success: false, error: 'Not found' };

    const fullPath = getAttachmentFullPath(att.filePath);
    const err = await shell.openPath(fullPath);
    if (err) return { success: false, error: err };
    return { success: true };
  });

  // Открыть системный "Сохранить как"
  ipcMain.handle('files:saveAs', async (_, attachmentId: string) => {
    const att = getAttachment(attachmentId);
    if (!att?.filePath || !att.fileName) return { success: false, error: 'Not found' };

    const result = await dialog.showSaveDialog(ctx.mainWindow, {
      defaultPath: att.fileName
    });
    if (result.canceled || !result.filePath) return { success: false, error: 'Cancelled' };

    // Копируем
    const { copyFileSync } = await import('fs');
    try {
      copyFileSync(getAttachmentFullPath(att.filePath), result.filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Удалить файл (только локально; сообщение остаётся)
  ipcMain.handle('files:delete', (_, attachmentId: string) => {
    const att = getAttachment(attachmentId);
    if (!att?.filePath) return { success: false };

    deleteAttachmentFile(att.filePath);
    // softDelete в БД — сделаем позже, когда дойдём до UI удаления
    return { success: true };
  });

  ipcMain.handle('files:cleanupGetSettings', () => getCleanupSettings());

  ipcMain.handle('files:cleanupSetSettings', (_, settings: CleanupSettings) => {
    setCleanupSettings(settings);
    return { success: true };
  });

  ipcMain.handle('files:cleanupRun', () => {
    const result = runCleanup(true);
    ctx.notifyDataChanged();
    return result;
  });

  ipcMain.handle('files:cleanupStats', () => getStats());
}
