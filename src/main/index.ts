import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { autoUpdater } from 'electron-updater';
import icon from '../../resources/icon.png?asset';
import iconIco from '../../resources/icon.ico?asset';
import { WebSocketServer } from 'ws';
import log from 'electron-log';

// Настройка логирования автообновлений (логи сохраняются в %USERPROFILE%\AppData\Roaming\golub\logs)
autoUpdater.logger = log;
log.transports.file.level = 'info';

const windowIcon = process.platform === 'win32' ? iconIco : icon;

// Функция для управления логикой автообновления
function checkUpdates(): void {
  // Не запускаем автообновление в режиме разработки, чтобы избежать лишних ошибок в консоли
  if (is.dev) return;

  // Автоматически проверяет обновления и скачивает их в фоне
  autoUpdater.checkForUpdatesAndNotify();

  // Событие: Обнаружено обновление на GitHub, начинается фоновое скачивание
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Доступно обновление',
      message: 'Обнаружена новая версия приложения. Она уже скачивается в фоновом режиме.',
      buttons: ['Ок']
    });
  });

  // Событие: Файлы скачаны и готовы к установке
  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'question',
        buttons: ['Установить и перезапустить', 'Позже'],
        defaultId: 0,
        title: 'Обновление готово к установке',
        message:
          'Новая версия успешно скачана. Перезапустить приложение сейчас, чтобы применить изменения?'
      })
      .then((result) => {
        // Если пользователь нажал первую кнопку ("Установить и перезапустить")
        if (result.response === 0) {
          // closeBeforeQuit = false, restart = true
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });
}

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

  ipcMain.on('set-titlebar-color', (_event, color) => {
    mainWindow.setTitleBarOverlay({
      color: color,
      symbolColor: '#fff'
    });
  });

  let wss: WebSocketServer | null = null;

  ipcMain.handle('start-server', async (_event, port: number) => {
    try {
      if (wss) {
        wss.close();
        wss = null;
      }
      wss = new WebSocketServer({ port });
      console.log(`WebSocket сервер запущен на порту ${port}`);

      wss.on('connection', (ws) => {
        console.log('Новый клиент подключился');

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());

            // Ретранслируем любые типы событий (и message, и delete-message)
            wss?.clients.forEach((client) => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data));
              }
            });
          } catch (error) {
            console.error('Ошибка обработки события на сервере:', error);
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.alexmurev.golub');

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  createWindow();

  // Запуск проверки обновлений (будет работать только в прод-сборке благодаря проверке !is.dev)
  checkUpdates();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
