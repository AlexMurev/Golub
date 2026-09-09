import { ElectronAPI } from '@electron-toolkit/preload';

interface API {
  startServer: (port: number) => Promise<{ success: boolean; port?: number; error?: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
  }
}
