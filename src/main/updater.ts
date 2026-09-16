/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, BrowserWindow } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import { is } from '@electron-toolkit/utils';
import log from 'electron-log';

// Настройка логирования автообновлений
autoUpdater.logger = log;
log.transports.file.level = 'info';
autoUpdater.autoDownload = false;

export type UpdateStatus =
  'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready';

let isUpdateReady = false;

export function initUpdater(mainWindow: BrowserWindow): void {
  if (is.dev) return;

  const sendStatus = (status: UpdateStatus): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', status);
    }
  };

  // 1. Запрос на проверку обновлений из интерфейса
  ipcMain.on('check-for-updates', (): void => {
    sendStatus('checking');
    autoUpdater.checkForUpdates().catch((err: Error): void => {
      log.error('Ошибка при проверке обновлений:', err);
      sendStatus('idle');
    });
  });

  // 2. Запрос на скачивание или установку из интерфейса
  ipcMain.on('download-and-install', (): void => {
    if (isUpdateReady) {
      autoUpdater.quitAndInstall(false, true);
    } else {
      sendStatus('downloading');
      autoUpdater.downloadUpdate().catch((err: Error): void => {
        log.error('Ошибка при скачивании обновления:', err);
        sendStatus('idle');
      });
    }
  });

  // События autoUpdater
  autoUpdater.on('update-available', (_info: UpdateInfo): void => {
    sendStatus('available');
  });

  autoUpdater.on('update-not-available', (_info: UpdateInfo): void => {
    sendStatus('not-available');
  });

  autoUpdater.on('error', (err: Error): void => {
    log.error('Ошибка autoUpdater:', err);
    sendStatus('idle');
  });

  autoUpdater.on('update-downloaded', (_info: UpdateInfo): void => {
    isUpdateReady = true;
    sendStatus('ready');
  });
}
