import { unlinkSync, existsSync } from 'fs';
import { getAttachmentFullPath } from './files';
import {
  listAttachmentsForCleanup,
  markFileDeleted,
  getFilesStats
} from './db/repositories/attachmentsRepo';
import { getSetting, setSetting } from './db/repositories/settingsRepo';

const MIN_AGE_MS = 1 * 60 * 60 * 1000; // не удаляем файлы младше суток

export interface CleanupSettings {
  enabled: boolean;
  byAge: { enabled: boolean; days: number };
  bySize: { enabled: boolean; maxGb: number; targetGb: number };
  byCount: { enabled: boolean; maxCount: number; targetCount: number };
}

const DEFAULTS: CleanupSettings = {
  enabled: false,
  byAge: { enabled: false, days: 30 },
  bySize: { enabled: false, maxGb: 5, targetGb: 4 },
  byCount: { enabled: false, maxCount: 1000, targetCount: 800 }
};

export function getCleanupSettings(): CleanupSettings {
  const raw = getSetting('files:cleanup');
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<CleanupSettings>;
    return {
      ...DEFAULTS,
      ...parsed,
      byAge: { ...DEFAULTS.byAge, ...(parsed.byAge ?? {}) },
      bySize: { ...DEFAULTS.bySize, ...(parsed.bySize ?? {}) },
      byCount: { ...DEFAULTS.byCount, ...(parsed.byCount ?? {}) }
    };
  } catch {
    return DEFAULTS;
  }
}

export function setCleanupSettings(s: CleanupSettings): void {
  setSetting('files:cleanup', JSON.stringify(s));
}

export interface CleanupResult {
  filesDeleted: number;
  bytesFreed: number;
}

export function runCleanup(force = false): CleanupResult {
  const settings = getCleanupSettings();
  if (!settings.enabled) return { filesDeleted: 0, bytesFreed: 0 };

  const all = listAttachmentsForCleanup();
  const now = Date.now();

  const candidates = force ? all : all.filter((a) => (a.createdAt ?? 0) < now - MIN_AGE_MS);

  const toDelete = new Set<string>();

  // 1. По возрасту
  if (settings.byAge.enabled) {
    const threshold = now - settings.byAge.days * 24 * 60 * 60 * 1000;
    for (const a of candidates) {
      if ((a.createdAt ?? 0) < threshold) toDelete.add(a.id);
    }
  }

  // Оставшиеся (не помеченные) — для следующих правил
  const remaining = candidates.filter((a) => !toDelete.has(a.id));

  // 2. По количеству: если файлов больше лимита, удаляем самые старые
  if (settings.byCount.enabled) {
    const total = remaining.length;
    if (total > settings.byCount.maxCount) {
      const needToRemove = total - settings.byCount.targetCount;
      for (let i = 0; i < needToRemove && i < remaining.length; i++) {
        toDelete.add(remaining[i].id);
      }
    }
  }

  // 3. По размеру: если общий размер больше лимита, удаляем самые старые
  if (settings.bySize.enabled) {
    const limitBytes = settings.bySize.maxGb * 1024 * 1024 * 1024;
    const targetBytes = settings.bySize.targetGb * 1024 * 1024 * 1024;

    // Считаем только те, что остались (не помечены)
    const stillAlive = remaining.filter((a) => !toDelete.has(a.id));
    let totalSize = stillAlive.reduce((sum, a) => sum + (a.size ?? 0), 0);

    if (totalSize > limitBytes) {
      for (const a of stillAlive) {
        if (totalSize <= targetBytes) break;
        toDelete.add(a.id);
        totalSize -= a.size ?? 0;
      }
    }
  }

  // Физически удаляем
  let filesDeleted = 0;
  let bytesFreed = 0;

  for (const id of toDelete) {
    const att = candidates.find((c) => c.id === id);
    if (!att?.filePath) continue;

    const fullPath = getAttachmentFullPath(att.filePath);
    try {
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
        bytesFreed += att.size ?? 0;
      }
      markFileDeleted(id);
      filesDeleted++;
    } catch (err) {
      console.error(`Failed to delete ${fullPath}:`, err);
    }
  }
  setLastCleanupAt(Date.now());

  if (filesDeleted > 0) {
    console.log(
      `Cleanup: ${filesDeleted} files, ${(bytesFreed / 1024 / 1024).toFixed(1)} MB freed`
    );
  }

  return { filesDeleted, bytesFreed };
}

export function getStats(): { count: number; totalSize: number } {
  return getFilesStats();
}

export function getLastCleanupAt(): number {
  const raw = getSetting('files:cleanup:lastRun');
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function setLastCleanupAt(ts: number): void {
  setSetting('files:cleanup:lastRun', String(ts));
}

export function shouldRunCleanup(): boolean {
  const s = getCleanupSettings();
  if (!s.enabled) return false;
  const last = getLastCleanupAt();
  return Date.now() - last >= 24 * 60 * 60 * 1000;
}
