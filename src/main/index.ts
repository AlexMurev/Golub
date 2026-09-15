import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import iconIco from '../../resources/icon.ico?asset';
import { initDb, closeDb } from './db';
import { initIpc } from './ipc';
import { ensureSelfUser } from './bootstrap';
import { startTransportAuto, stopTransport } from './transport';

import { initUpdater } from './updater';

const windowIcon: string = process.platform === 'win32' ? iconIco : icon;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minHeight: 300,
    minWidth: 300,
    show: false,
    autoHideMenuBar: true,
    icon: windowIcon,
    titleBarStyle: 'hidden',
    titleBarOverlay:
      process.platform === 'darwin'
        ? false
        : {
            color: '#2b2d31',
            symbolColor: '#fff',
            height: 30
          },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  ipcMain.on('set-titlebar-color', (_event: Electron.IpcMainEvent, color: string): void => {
    mainWindow.setTitleBarOverlay({
      color: color,
      symbolColor: '#fff'
    });
  });

  mainWindow.on('ready-to-show', (): void => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(
    (details: Electron.HandlerDetails): { action: 'deny' } => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    }
  );

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  initUpdater(mainWindow);
  initIpc(mainWindow);
}

app.whenReady().then(async (): Promise<void> => {
  electronApp.setAppUserModelId('com.alexmurev.golub');

  initDb();
  ensureSelfUser();

  app.on('browser-window-created', (_, window: BrowserWindow): void => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on('ping', (): void => console.log('pong'));

  createWindow();

  try {
    const { port, address } = await startTransportAuto(8080);
    console.log(`Transport started at ${address} (port ${port})`);
  } catch (err) {
    console.error('Failed to start transport:', err);
  }

  app.on('activate', function (): void {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', (): void => {
  stopTransport();
  closeDb();
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
