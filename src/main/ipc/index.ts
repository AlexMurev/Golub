import { BrowserWindow } from 'electron';
import { createContext } from './context';
import { registerTransportIpc } from './transport';
import { registerUsersIpc } from './users';
import { registerChatsIpc } from './chats';
import { registerMessagesIpc } from './messages';
import { registerSoundsIpc } from './sounds';
import { registerAppIpc } from './app';
import { registerFilesIpc } from './files';
import { registerTransferIpc } from './transfer';
import { registerReactionsIpc } from './reactions';

export function initIpc(mainWindow: BrowserWindow): void {
  const ctx = createContext(mainWindow);

  // Порядок не принципиален, но transport первый — он навешивает подписки,
  // которые используются обработчиками остальных модулей.
  registerTransportIpc(ctx);
  registerUsersIpc(ctx);
  registerChatsIpc(ctx);
  registerMessagesIpc(ctx);
  registerReactionsIpc(ctx);
  registerSoundsIpc(ctx);
  registerTransferIpc(ctx);
  registerFilesIpc(ctx);
  registerAppIpc(ctx);

  console.log('IPC initialized');
}
