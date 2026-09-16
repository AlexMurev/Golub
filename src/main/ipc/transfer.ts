import { ipcMain } from 'electron';
import {
  onTransferProgress,
  onTransferComplete,
  onTransferFailed,
  cancelTransfer
} from '../transfer/manager';
import type { IpcContext } from './context';

export function registerTransferIpc(ctx: IpcContext): void {
  onTransferProgress((data) => ctx.send('transfer:progress', data));
  onTransferComplete((attachmentId, direction) => {
    ctx.send('transfer:complete', attachmentId, direction);
    ctx.notifyDataChanged();
  });
  onTransferFailed((attachmentId, direction, error) => {
    ctx.send('transfer:failed', attachmentId, direction, error);
    ctx.notifyDataChanged();
  });

  ipcMain.handle('transfer:cancel', (_, attachmentId: string) => {
    cancelTransfer(attachmentId);
    return { success: true };
  });
}
