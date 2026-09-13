import { ElectronAPI } from '@electron-toolkit/preload';

interface API {
  startServer: (port: number) => Promise<{ success: boolean; port?: number; error?: string }>;
  setTitlebarColor: (color: string) => void;
  checkForUpdates: () => void;
  downloadAndInstall: () => void;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
  }
}
