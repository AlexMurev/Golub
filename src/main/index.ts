import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import iconIco from '../../resources/icon.ico?asset';

import { initUpdater } from './updater';
import { initWebSocketServer } from './server';

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
}

initWebSocketServer();

app.whenReady().then((): void => {
  electronApp.setAppUserModelId('com.alexmurev.golub');

  app.on('browser-window-created', (_, window: BrowserWindow): void => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on('ping', (): void => console.log('pong'));

  createWindow();

  app.on('activate', function (): void {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
