import { BrowserWindow } from 'electron';

export interface IpcContext {
  mainWindow: BrowserWindow;
  send: (channel: string, ...args: unknown[]) => void;
  notifyDataChanged: () => void;
}

export function createContext(mainWindow: BrowserWindow): IpcContext {
  const send = (channel: string, ...args: unknown[]): void => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args);
  };

  return {
    mainWindow,
    send,
    notifyDataChanged: (): void => send('data:changed')
  };
}
