import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import iconIco from '../../resources/icon.ico?asset';
import { initDb, closeDb } from './db';
import { initIpc } from './ipc';
import { ensureSelfUser } from './bootstrap';
import { startTransportAuto, stopTransport } from './transport';
import { getAttachment, markFileDeleted } from './db/repositories/attachmentsRepo';
import { getAttachmentFullPath } from './files';
import { runCleanup, shouldRunCleanup } from './filesCleanup';
import { protocol, app, BrowserWindow, ipcMain, shell } from 'electron';
import { createReadStream, statSync, existsSync } from 'fs';
import { Readable } from 'stream';
import { initUpdater } from './updater';

const windowIcon: string = process.platform === 'win32' ? iconIco : icon;

let cleanupInterval: NodeJS.Timeout | null = null;

// Регистрируем привилегированную схему ДО app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'golub-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
      bypassCSP: false
    }
  }
]);

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

  // Обработчик кастомного протокола golub-file://<attachmentId>
  // Отдаёт файл с диска с поддержкой Range-запросов (важно для видео).
  protocol.handle('golub-file', async (request) => {
    try {
      const url = new URL(request.url);
      const attachmentId = url.hostname;
      if (!attachmentId) return new Response(null, { status: 400 });

      const att = getAttachment(attachmentId);
      if (!att?.filePath) return new Response(null, { status: 404 });

      const fullPath = getAttachmentFullPath(att.filePath);
      if (!existsSync(fullPath)) {
        // Файл пропал с диска — синхронизируем БД
        markFileDeleted(att.id);
        return new Response(null, { status: 404 });
      }

      const stat = statSync(fullPath);
      const contentType = att.mimeType ?? 'application/octet-stream';
      const range = request.headers.get('Range');

      const baseHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      };

      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (!match) {
          return new Response(null, { status: 416 });
        }

        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;

        if (start >= stat.size || end >= stat.size || start > end) {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${stat.size}` }
          });
        }

        const nodeStream = createReadStream(fullPath, { start, end });
        const webStream = Readable.toWeb(nodeStream) as ReadableStream;

        return new Response(webStream, {
          status: 206,
          headers: {
            ...baseHeaders,
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${stat.size}`
          }
        });
      }

      const nodeStream = createReadStream(fullPath);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new Response(webStream, {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Length': String(stat.size)
        }
      });
    } catch (err) {
      console.error('golub-file error:', err);
      return new Response(null, { status: 500 });
    }
  });

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

  // Автоочистка файлов: первый запуск через 30 секунд после старта,
  // затем раз в сутки. Сработает только если в настройках включено.
  setTimeout((): void => {
    if (shouldRunCleanup()) runCleanup();
  }, 30_000);

  // Раз в час проверяем, не прошло ли 24 часа с последней очистки
  cleanupInterval = setInterval(
    (): void => {
      if (shouldRunCleanup()) runCleanup();
    },
    60 * 60 * 1000
  );

  app.on('activate', function (): void {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  stopTransport();
  closeDb();
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
