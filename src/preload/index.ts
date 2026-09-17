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
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
    setBadge: (hasUnread: boolean) => ipcRenderer.invoke('app:setBadge', hasUnread),
    getBadgeEnabled: () => ipcRenderer.invoke('app:getBadgeEnabled') as Promise<boolean>,
    setBadgeEnabled: (enabled: boolean) =>
      ipcRenderer.invoke('app:setBadgeEnabled', enabled) as Promise<{ success: boolean }>
  },
  settings: {
    getImageCompression: () => ipcRenderer.invoke('settings:getImageCompression'),
    setImageCompression: (level: string) =>
      ipcRenderer.invoke('settings:setImageCompression', level)
  },
  privacy: {
    getReadReceipts: () => ipcRenderer.invoke('privacy:getReadReceipts'),
    setReadReceipts: (value: string) => ipcRenderer.invoke('privacy:setReadReceipts', value),
    getHideTyping: () => ipcRenderer.invoke('privacy:getHideTyping') as Promise<boolean>,
    setHideTyping: (value: boolean) => ipcRenderer.invoke('privacy:setHideTyping', value)
  },
  transfer: {
    cancel: (attachmentId: string) => ipcRenderer.invoke('transfer:cancel', attachmentId),
    onProgress: (cb: (data: unknown) => void) => {
      const listener = (_e: unknown, data: unknown): void => cb(data);
      ipcRenderer.on('transfer:progress', listener);
      return (): void => {
        ipcRenderer.removeListener('transfer:progress', listener);
      };
    },
    onComplete: (cb: (attachmentId: string, direction: string) => void) => {
      const listener = (_e: unknown, id: string, dir: string): void => cb(id, dir);
      ipcRenderer.on('transfer:complete', listener);
      return (): void => {
        ipcRenderer.removeListener('transfer:complete', listener);
      };
    },
    onFailed: (cb: (attachmentId: string, direction: string, error: string) => void) => {
      const listener = (_e: unknown, id: string, dir: string, error: string): void =>
        cb(id, dir, error);
      ipcRenderer.on('transfer:failed', listener);
      return (): void => {
        ipcRenderer.removeListener('transfer:failed', listener);
      };
    }
  },
  files: {
    save: (base64: string, name: string) => ipcRenderer.invoke('files:save', base64, name),
    open: (attachmentId: string) => ipcRenderer.invoke('files:open', attachmentId),
    saveAs: (attachmentId: string) => ipcRenderer.invoke('files:saveAs', attachmentId),
    delete: (attachmentId: string) => ipcRenderer.invoke('files:delete', attachmentId),
    cleanupGetSettings: () => ipcRenderer.invoke('files:cleanupGetSettings'),
    cleanupSetSettings: (settings: unknown) =>
      ipcRenderer.invoke('files:cleanupSetSettings', settings),
    cleanupRun: () => ipcRenderer.invoke('files:cleanupRun'),
    cleanupStats: () => ipcRenderer.invoke('files:cleanupStats')
  },
  link: {
    getPreview: (url: string) => ipcRenderer.invoke('link:preview', url)
  },
  sounds: {
    getGlobal: () => ipcRenderer.invoke('sounds:getGlobal'),
    setGlobal: (dataUrl: string, name: string) =>
      ipcRenderer.invoke('sounds:setGlobal', dataUrl, name),
    clearGlobal: () => ipcRenderer.invoke('sounds:clearGlobal'),
    setGlobalVolume: (v: number) => ipcRenderer.invoke('sounds:setGlobalVolume', v),
    setGlobalMono: (v: boolean) => ipcRenderer.invoke('sounds:setGlobalMono', v),

    getForPeer: (peerId: string) => ipcRenderer.invoke('sounds:getForPeer', peerId),
    setForPeer: (peerId: string, dataUrl: string, name: string) =>
      ipcRenderer.invoke('sounds:setForPeer', peerId, dataUrl, name),
    clearForPeer: (peerId: string) => ipcRenderer.invoke('sounds:clearForPeer', peerId),
    setForPeerVolume: (peerId: string, v: number | null) =>
      ipcRenderer.invoke('sounds:setForPeerVolume', peerId, v),
    setForPeerMono: (peerId: string, v: boolean | null) =>
      ipcRenderer.invoke('sounds:setForPeerMono', peerId, v)
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
    },
    sendTyping: (peerId: string, isTyping: boolean) =>
      ipcRenderer.invoke('transport:sendTyping', peerId, isTyping),
    onTyping: (cb: (peerId: string, isTyping: boolean) => void) => {
      const listener = (_e: unknown, peerId: string, isTyping: boolean): void =>
        cb(peerId, isTyping);
      ipcRenderer.on('transport:typing', listener);
      return (): void => {
        ipcRenderer.removeListener('transport:typing', listener);
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
      cancelRequest: (peerId: string) => ipcRenderer.invoke('users:cancelRequest', peerId),
      get: (peerId: string) => ipcRenderer.invoke('users:get', peerId)
    },
    chats: {
      list: () => ipcRenderer.invoke('chats:list'),
      ensureDirect: (peerId: string) => ipcRenderer.invoke('chats:ensureDirect', peerId),
      markRead: (chatId: string) => ipcRenderer.invoke('chats:markRead', chatId)
    },
    messages: {
      list: (chatId: string, limit?: number, before?: number) =>
        ipcRenderer.invoke('messages:list', chatId, limit, before),
      send: (peerId: string, text: string, replyToId: string | null, attachments: unknown[]) =>
        ipcRenderer.invoke('messages:send', peerId, text, replyToId, attachments),
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
