import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { WebSocketServer } from 'ws';

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 850,
    height: 900,
    minHeight: 300,
    minWidth: 300,
    maxWidth: 850,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  let wss: WebSocketServer | null = null;

  ipcMain.handle('start-server', async (_event, port: number) => {
    try {
      if (wss) {
        // Если сервер уже запущен, закрываем его
        wss.close();
        wss = null;
      }
      wss = new WebSocketServer({ port });
      console.log(`WebSocket сервер запущен на порту ${port}`);

      wss.on('connection', (ws) => {
        console.log('Новый клиент подключился');

        ws.on('message', (message) => {
          try {
            // Парсим как JSON, чтобы сохранить структуру
            const data = JSON.parse(message.toString());
            // Рассылаем всем, кроме отправителя
            wss?.clients.forEach((client) => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data));
              }
            });
          } catch (error) {
            console.error('Ошибка парсинга сообщения:', error);
          }
        });

        ws.on('close', () => {
          console.log('Клиент отключился');
        });
      });

      return { success: true, port };
    } catch (error) {
      console.error('Ошибка запуска сервера:', error);
      return { success: false, error: String(error) };
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
