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
import { readFile } from 'fs/promises';
import { Readable } from 'stream';
import { createServer, Server } from 'http';
import { extname } from 'path';
import { initUpdater } from './updater';
import { getSetting } from './db/repositories/settingsRepo';

const windowIcon: string = process.platform === 'win32' ? iconIco : icon;

let cleanupInterval: NodeJS.Timeout | null = null;
let staticServer: Server | null = null;
let staticServerUrl: string | null = null;

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

// =============================================================================
// Локальный HTTP-сервер для renderer (нужен для работы YouTube-embed в проде)
// =============================================================================

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.map': 'application/json'
};

function startStaticServer(): Promise<string> {
  const rootDir = join(__dirname, '../renderer');

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
        const safePath = pathname.replace(/\.\./g, '').replace(/^\/+/, '');
        const filePath = join(rootDir, safePath);

        try {
          const data = await readFile(filePath);
          const ext = extname(filePath).toLowerCase();
          res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-store');
          res.end(data);
        } catch {
          // SPA fallback
          const data = await readFile(join(rootDir, 'index.html'));
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(data);
        }
      } catch (err) {
        console.error('Static server error:', err);
        res.statusCode = 500;
        res.end('Server error');
      }
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        staticServer = server;
        staticServerUrl = `http://127.0.0.1:${addr.port}`;
        console.log(`Static server on ${staticServerUrl}`);
        resolve(staticServerUrl);
      } else {
        reject(new Error('Failed to start static server'));
      }
    });
  });
}

// =============================================================================
// Window
// =============================================================================

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

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const isF12 = input.key === 'F12';
    const isCtrlShiftI = input.control && input.shift && input.key.toLowerCase() === 'i';

    if (!isF12 && !isCtrlShiftI) return;

    if (getSetting('dev:enabled') !== '1') return;

    event.preventDefault();
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
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
  } else if (staticServerUrl) {
    mainWindow.loadURL(staticServerUrl);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  if (getSetting('dev:enabled') === '1') {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
  }

  initUpdater(mainWindow);
  initIpc(mainWindow);
}

// =============================================================================
// Bootstrap
// =============================================================================

app.whenReady().then(async (): Promise<void> => {
  electronApp.setAppUserModelId('com.alexmurev.golub');

  initDb();
  ensureSelfUser();

  protocol.handle('golub-file', async (request) => {
    try {
      const url = new URL(request.url);
      const attachmentId = url.hostname;
      if (!attachmentId) return new Response(null, { status: 400 });

      const att = getAttachment(attachmentId);
      if (!att?.filePath) return new Response(null, { status: 404 });

      const fullPath = getAttachmentFullPath(att.filePath);
      if (!existsSync(fullPath)) {
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

  // В проде поднимаем локальный HTTP-сервер до создания окна.
  // Это даёт странице нормальный origin, без которого YouTube-embed не работает.
  if (!(is.dev && process.env['ELECTRON_RENDERER_URL'])) {
    try {
      await startStaticServer();
    } catch (err) {
      console.error('Failed to start static server:', err);
    }
  }

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

  setTimeout((): void => {
    if (shouldRunCleanup()) runCleanup();
  }, 30_000);

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
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
  stopTransport();
  closeDb();
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
