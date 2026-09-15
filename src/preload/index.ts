import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { UpdateStatus } from '@shared/types';

const api = {
  setTitlebarColor: (color: string) => ipcRenderer.send('set-titlebar-color', color),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadAndInstall: () => ipcRenderer.send('download-and-install'),
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => {
    const listener = (_e: unknown, status: UpdateStatus): void => cb(status);
    ipcRenderer.on('update-status', listener);
    return (): void => {
      ipcRenderer.removeListener('update-status', listener);
    };
  },
  link: {
    getPreview: (url: string) => ipcRenderer.invoke('link:preview', url)
  },
  transport: {
    getMyInfo: () => ipcRenderer.invoke('transport:getMyInfo'),
    isConnectedTo: (peerId: string) => ipcRenderer.invoke('transport:isConnectedTo', peerId),
    onDataChanged: (cb: () => void) => {
      const listener = (): void => cb();
      ipcRenderer.on('data:changed', listener);
      return (): void => {
        ipcRenderer.removeListener('data:changed', listener);
      };
    },
    onMessage: (cb: (from: string, payload: unknown) => void) => {
      const listener = (_e: unknown, from: string, payload: unknown): void => cb(from, payload);
      ipcRenderer.on('transport:message', listener);
      return (): void => {
        ipcRenderer.removeListener('transport:message', listener);
      };
    },
    onPeerOnline: (cb: (peerId: string) => void) => {
      const listener = (_e: unknown, peerId: string): void => cb(peerId);
      ipcRenderer.on('transport:peerOnline', listener);
      return (): void => {
        ipcRenderer.removeListener('transport:peerOnline', listener);
      };
    },
    onPeerOffline: (cb: (peerId: string) => void) => {
      const listener = (_e: unknown, peerId: string): void => cb(peerId);
      ipcRenderer.on('transport:peerOffline', listener);
      return (): void => {
        ipcRenderer.removeListener('transport:peerOffline', listener);
      };
    },
    onNewPeer: (cb: (peerId: string) => void) => {
      const listener = (_e: unknown, peerId: string): void => cb(peerId);
      ipcRenderer.on('transport:newPeer', listener);
      return (): void => {
        ipcRenderer.removeListener('transport:newPeer', listener);
      };
    },
    onPeerUpdated: (cb: (peerId: string) => void) => {
      const listener = (_e: unknown, peerId: string): void => cb(peerId);
      ipcRenderer.on('transport:peerUpdated', listener);
      return (): void => {
        ipcRenderer.removeListener('transport:peerUpdated', listener);
      };
    }
  },

  db: {
    users: {
      getSelf: () => ipcRenderer.invoke('users:getSelf'),
      updateSelf: (patch: { nickname?: string; avatar?: string | null }) =>
        ipcRenderer.invoke('users:updateSelf', patch),
      list: () => ipcRenderer.invoke('users:list'),
      addByAddress: (address: string) => ipcRenderer.invoke('users:addByAddress', address),
      remove: (peerId: string) => ipcRenderer.invoke('users:remove', peerId),
      acceptRequest: (peerId: string) => ipcRenderer.invoke('users:acceptRequest', peerId),
      rejectRequest: (peerId: string) => ipcRenderer.invoke('users:rejectRequest', peerId),
      cancelRequest: (peerId: string) => ipcRenderer.invoke('users:cancelRequest', peerId)
    },
    chats: {
      list: () => ipcRenderer.invoke('chats:list'),
      ensureDirect: (peerId: string) => ipcRenderer.invoke('chats:ensureDirect', peerId)
    },
    messages: {
      list: (chatId: string, limit?: number, before?: number) =>
        ipcRenderer.invoke('messages:list', chatId, limit, before),
      send: (peerId: string, text: string, replyToId: string | null) =>
        ipcRenderer.invoke('messages:send', peerId, text, replyToId),
      edit: (messageId: string, newText: string) =>
        ipcRenderer.invoke('messages:edit', messageId, newText),
      delete: (messageId: string) => ipcRenderer.invoke('messages:delete', messageId)
    }
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
