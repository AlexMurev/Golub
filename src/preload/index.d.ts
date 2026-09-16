import { ElectronAPI } from '@electron-toolkit/preload';
import type { UpdateStatus, User, ChatListItem, Message, SoundData } from '@shared/types';

interface API {
  setTitlebarColor: (color: string) => void;
  checkForUpdates: () => void;
  downloadAndInstall: () => void;
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => () => void;
  app: {
    getVersion: () => Promise<string>;
    setBadge: (hasUnread: boolean) => Promise<{ success: boolean }>;
    getBadgeEnabled: () => Promise<boolean>;
    setBadgeEnabled: (enabled: boolean) => Promise<{ success: boolean }>;
  };
  settings: {
    getImageCompression: () => Promise<'none' | 'light' | 'medium' | 'strong'>;
    setImageCompression: (
      level: 'none' | 'light' | 'medium' | 'strong'
    ) => Promise<{ success: boolean }>;
  };
  transfer: {
    cancel: (attachmentId: string) => Promise<{ success: boolean }>;
    onProgress: (
      cb: (data: {
        attachmentId: string;
        direction: 'up' | 'down';
        transferred: number;
        total: number;
      }) => void
    ) => () => void;
    onComplete: (cb: (attachmentId: string, direction: 'up' | 'down') => void) => () => void;
    onFailed: (
      cb: (attachmentId: string, direction: 'up' | 'down', error: string) => void
    ) => () => void;
  };
  files: {
    save: (
      base64: string,
      name: string
    ) => Promise<{
      success: boolean;
      filePath?: string;
      size?: number;
      error?: string;
    }>;
    open: (attachmentId: string) => Promise<{ success: boolean; error?: string }>;
    saveAs: (attachmentId: string) => Promise<{ success: boolean; error?: string }>;
    delete: (attachmentId: string) => Promise<{ success: boolean }>;
  };
  link: {
    getPreview: (url: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  };
  sounds: {
    getGlobal: () => Promise<SoundData>;
    setGlobal: (dataUrl: string, name: string) => Promise<{ success: boolean; error?: string }>;
    clearGlobal: () => Promise<{ success: boolean }>;
    setGlobalVolume: (v: number) => Promise<{ success: boolean }>;
    setGlobalMono: (v: boolean) => Promise<{ success: boolean }>;

    getForPeer: (peerId: string) => Promise<SoundData>;
    setForPeer: (
      peerId: string,
      dataUrl: string,
      name: string
    ) => Promise<{ success: boolean; error?: string }>;
    clearForPeer: (peerId: string) => Promise<{ success: boolean }>;
    setForPeerVolume: (peerId: string, v: number | null) => Promise<{ success: boolean }>;
    setForPeerMono: (peerId: string, v: boolean | null) => Promise<{ success: boolean }>;
  };
  transport: {
    getMyInfo: () => Promise<{
      peerId: string;
      nickname: string;
      avatar: string | null;
      address: string;
    } | null>;
    isConnectedTo: (peerId: string) => Promise<boolean>;
    onMessage: (cb: (from: string, payload: unknown) => void) => () => void;
    onPeerOnline: (cb: (peerId: string) => void) => () => void;
    onPeerOffline: (cb: (peerId: string) => void) => () => void;
    onNewPeer: (cb: (peerId: string) => void) => () => void;
    onPeerUpdated: (cb: (peerId: string) => void) => () => void;
    onDataChanged: (cb: () => void) => () => void;
  };

  db: {
    users: {
      getSelf: () => Promise<User | null>;
      updateSelf: (patch: { nickname?: string; avatar?: string | null }) => Promise<User | null>;
      list: () => Promise<(User & { isOnline: boolean })[]>;
      addByAddress: (
        address: string
      ) => Promise<{ success: boolean; contact?: User | null; error?: string }>;
      remove: (peerId: string) => Promise<{ success: boolean }>;
      acceptRequest: (peerId: string) => Promise<{ success: boolean; contact?: User | null }>;
      rejectRequest: (peerId: string) => Promise<{ success: boolean }>;
      cancelRequest: (peerId: string) => Promise<{ success: boolean }>;
      get: (peerId: string) => Promise<User | null>;
    };
    chats: {
      list: () => Promise<ChatListItem[]>;
      ensureDirect: (
        peerId: string
      ) => Promise<{ success: boolean; chatId?: string; error?: string }>;
      markRead: (chatId: string) => Promise<{ success: boolean }>;
    };
    messages: {
      list: (chatId: string, limit?: number, before?: number) => Promise<Message[]>;
      send: (
        peerId: string,
        text: string,
        replyToId: string | null,
        attachments: Attachment[]
      ) => Promise<{ success: boolean; message?: Message; error?: string }>;
      edit: (messageId: string, newText: string) => Promise<{ success: boolean }>;
      delete: (messageId: string) => Promise<{ success: boolean }>;
    };
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
  }
}
