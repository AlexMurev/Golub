import { ipcMain } from 'electron';
import { WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;

export function initWebSocketServer(): void {
  ipcMain.handle(
    'start-server',
    async (
      _event: Electron.IpcMainInvokeEvent,
      port: number
    ): Promise<{ success: boolean; port?: number; error?: string }> => {
      try {
        if (wss) {
          wss.close();
          wss = null;
        }

        wss = new WebSocketServer({ port });
        console.log(`WebSocket сервер запущен на порту ${port}`);

        wss.on('connection', (ws): void => {
          console.log('Новый клиент подключился');

          ws.on('message', (message: Buffer): void => {
            try {
              const data = JSON.parse(message.toString());

              wss?.clients.forEach((client): void => {
                if (client !== ws && client.readyState === 1) {
                  client.send(JSON.stringify(data));
                }
              });
            } catch (error) {
              console.error('Ошибка обработки события на сервере:', error);
            }
          });

          ws.on('close', (): void => {
            console.log('Клиент отключился');
          });
        });

        return { success: true, port };
      } catch (error) {
        console.error('Ошибка запуска сервера:', error);
        return { success: false, error: String(error) };
      }
    }
  );
}
