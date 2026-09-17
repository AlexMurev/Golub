import { app } from 'electron';
import { dirname, join, isAbsolute } from 'path';
import { mkdirSync } from 'fs';

export function getDataDir(): string {
  const override = process.env.GOLUB_DATA_DIR;
  if (override) {
    if (isAbsolute(override)) return override;
    // Относительный путь — от корня проекта (dev) или от папки exe (prod)
    const base = app.isPackaged ? dirname(process.execPath) : app.getAppPath();
    return join(base, override);
  }

  if (app.isPackaged) {
    return join(dirname(process.execPath), 'data');
  }
  return join(app.getAppPath(), 'data');
}

export function ensureDataDir(): string {
  const dir = getDataDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDbPath(): string {
  return join(ensureDataDir(), 'golub.db');
}
