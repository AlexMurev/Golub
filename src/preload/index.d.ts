import { ElectronAPI } from '@electron-toolkit/preload';
import type { UpdateStatus, User, ChatListItem, Message, SoundData } from '@shared/types';

interface API {
  setTitlebarColor: (color: string) => void;
  checkForUpdates: () => void;
  downloadAndInstall: () => void;
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => () => void;
  app: {
    getVersion: () => Promise<string>;
  };
  link: {
    getPreview: (url: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  };
  sounds: {
    getGlobal: () => Promise<SoundData>;
    setGlobal: (
      dataUrl: string,
      name: string
    ) => Promise<{ success: boolean; sound?: SoundData; error?: string }>;
    clearGlobal: () => Promise<{ success: boolean }>;
    getForPeer: (peerId: string) => Promise<SoundData>;
    setForPeer: (
      peerId: string,
      dataUrl: string,
      name: string
    ) => Promise<{ success: boolean; error?: string }>;
    clearForPeer: (peerId: string) => Promise<{ success: boolean }>;
    getVolume: () => Promise<number>;
    setVolume: (v: number) => Promise<{ success: boolean; volume: number }>;
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
        replyToId: string | null
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
