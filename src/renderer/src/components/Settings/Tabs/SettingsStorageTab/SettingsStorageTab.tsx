import React, { useEffect, useState } from 'react';
import {
  useImageCompression,
  setImageCompression,
  type CompressionLevel
} from '@renderer/utils/imageCompression';
import './SettingsStorageTab.css';
import { formatSize } from '@renderer/utils/format';

const LEVEL_LABELS: Record<CompressionLevel, string> = {
  none: 'Без сжатия',
  light: 'Слабое сжатие',
  medium: 'Среднее сжатие',
  strong: 'Сильное сжатие'
};

interface CleanupSettings {
  enabled: boolean;
  byAge: { enabled: boolean; days: number };
  bySize: { enabled: boolean; maxGb: number; targetGb: number };
  byCount: { enabled: boolean; maxCount: number; targetCount: number };
}

interface Stats {
  count: number;
  totalSize: number;
}

export const SettingsStorageTab: React.FC = (): React.JSX.Element => {
  const compression = useImageCompression();
  const [settings, setSettings] = useState<CleanupSettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    void window.api.files.cleanupGetSettings().then(setSettings);
    void window.api.files.cleanupStats().then(setStats);
  }, []);

  const handleCompressionChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    void setImageCompression(e.target.value as CompressionLevel);
  };

  const updateAndSave = (next: CleanupSettings): void => {
    setSettings(next);
    void window.api.files.cleanupSetSettings(next);
  };

  const handleEnabledToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!settings) return;
    updateAndSave({ ...settings, enabled: e.target.checked });
  };

  const handleAgeToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!settings) return;
    updateAndSave({
      ...settings,
      byAge: { ...settings.byAge, enabled: e.target.checked }
    });
  };

  const handleAgeDays = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!settings) return;
    const days = Math.max(1, Math.min(3650, Number(e.target.value) || 1));
    updateAndSave({ ...settings, byAge: { ...settings.byAge, days } });
  };

  const handleCountToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!settings) return;
    updateAndSave({
      ...settings,
      byCount: { ...settings.byCount, enabled: e.target.checked }
    });
  };

  const handleCountMax = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!settings) return;
    const max = Math.max(1, Number(e.target.value) || 1);
    const target = Math.min(settings.byCount.targetCount, Math.floor(max * 0.8));
    updateAndSave({
      ...settings,
      byCount: { ...settings.byCount, maxCount: max, targetCount: target }
    });
  };

  const handleSizeToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!settings) return;
    updateAndSave({
      ...settings,
      bySize: { ...settings.bySize, enabled: e.target.checked }
    });
  };

  const handleSizeMax = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!settings) return;
    const maxGb = Math.max(0.1, Number(e.target.value) || 0.1);
    const targetGb = Math.min(settings.bySize.targetGb, Math.round(maxGb * 0.8 * 10) / 10);
    updateAndSave({
      ...settings,
      bySize: { ...settings.bySize, maxGb, targetGb }
    });
  };

  const handleRunNow = async (): Promise<void> => {
    setIsCleaning(true);
    setLastResult(null);
    try {
      const result = await window.api.files.cleanupRun();
      const newStats = await window.api.files.cleanupStats();
      setStats(newStats);
      setLastResult(
        `Удалено файлов: ${result.filesDeleted}, освобождено ${formatSize(result.bytesFreed)}`
      );
    } catch (err) {
      console.error('cleanup run failed:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  if (!settings) {
    return (
      <div className="settings-tab">
        <div className="settings-tab__hint">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="settings-tab">
      {/* ---------------- Сжатие изображений ---------------- */}
      <section className="settings-tab__section">
        <label className="settings-tab__field">
          <span className="settings-tab__label">Сжатие изображений при отправке</span>
          <select
            className="settings-tab__input"
            value={compression}
            onChange={handleCompressionChange}
          >
            {(Object.keys(LEVEL_LABELS) as CompressionLevel[]).map((lvl) => (
              <option key={lvl} value={lvl}>
                {LEVEL_LABELS[lvl]}
              </option>
            ))}
          </select>
          <span className="settings-tab__hint">
            Применяется ко всем картинкам. Для файлов больше 3 МБ будет предложено подтверждение.
          </span>
        </label>
      </section>

      {/* ---------------- Статистика ---------------- */}
      <section className="settings-tab__section">
        <h3 className="settings-tab__section-title">Занято на диске</h3>

        <div className="settings-storage__stats">
          <div className="settings-storage__stats-row">
            <span className="settings-storage__stats-label">Файлов</span>
            <span className="settings-storage__stats-value">{stats?.count ?? '—'}</span>
          </div>
          <div className="settings-storage__stats-row">
            <span className="settings-storage__stats-label">Общий размер</span>
            <span className="settings-storage__stats-value">
              {stats ? formatSize(stats.totalSize) : '—'}
            </span>
          </div>
        </div>

        <div className="settings-tab__actions">
          <button
            type="button"
            className="settings-tab__button"
            onClick={(): void => void handleRunNow()}
            disabled={isCleaning || !settings.enabled}
            title={!settings.enabled ? 'Включите автоочистку ниже' : ''}
          >
            {isCleaning ? 'Очистка...' : 'Очистить сейчас'}
          </button>
        </div>
        {lastResult && <span className="settings-tab__hint">{lastResult}</span>}
      </section>

      {/* ---------------- Автоочистка ---------------- */}
      <section className="settings-tab__section">
        <label className="settings-tab__toggle">
          <span className="settings-tab__label">Автоматическая очистка файлов</span>
          <input type="checkbox" checked={settings.enabled} onChange={handleEnabledToggle} />
        </label>
        <span className="settings-tab__hint">
          Файлы старше 24 часов могут быть удалены по правилам ниже. Свежие файлы не трогаются.
        </span>
      </section>

      {/* По возрасту */}
      <section
        className={`settings-storage__rule ${!settings.enabled ? 'settings-storage__rule--disabled' : ''}`}
      >
        <label className="settings-tab__toggle">
          <span className="settings-tab__label">По возрасту</span>
          <input
            type="checkbox"
            checked={settings.byAge.enabled}
            onChange={handleAgeToggle}
            disabled={!settings.enabled}
          />
        </label>
        <div className="settings-storage__rule-row">
          <span className="settings-storage__rule-text">Удалять файлы старше</span>
          <input
            type="number"
            className="settings-storage__rule-input"
            value={settings.byAge.days}
            onChange={handleAgeDays}
            min={1}
            max={3650}
            disabled={!settings.enabled || !settings.byAge.enabled}
          />
          <span className="settings-storage__rule-text">дней</span>
        </div>
      </section>

      {/* По количеству */}
      <section
        className={`settings-storage__rule ${!settings.enabled ? 'settings-storage__rule--disabled' : ''}`}
      >
        <label className="settings-tab__toggle">
          <span className="settings-tab__label">По количеству</span>
          <input
            type="checkbox"
            checked={settings.byCount.enabled}
            onChange={handleCountToggle}
            disabled={!settings.enabled}
          />
        </label>
        <div className="settings-storage__rule-row">
          <span className="settings-storage__rule-text">Не более</span>
          <input
            type="number"
            className="settings-storage__rule-input"
            value={settings.byCount.maxCount}
            onChange={handleCountMax}
            min={1}
            disabled={!settings.enabled || !settings.byCount.enabled}
          />
          <span className="settings-storage__rule-text">файлов</span>
        </div>
        <span className="settings-tab__hint">
          Удаляются самые старые, пока не станет {settings.byCount.targetCount}
        </span>
      </section>

      {/* По размеру */}
      <section
        className={`settings-storage__rule ${!settings.enabled ? 'settings-storage__rule--disabled' : ''}`}
      >
        <label className="settings-tab__toggle">
          <span className="settings-tab__label">По размеру</span>
          <input
            type="checkbox"
            checked={settings.bySize.enabled}
            onChange={handleSizeToggle}
            disabled={!settings.enabled}
          />
        </label>
        <div className="settings-storage__rule-row">
          <span className="settings-storage__rule-text">Не более</span>
          <input
            type="number"
            className="settings-storage__rule-input"
            value={settings.bySize.maxGb}
            onChange={handleSizeMax}
            min={0.1}
            step={0.1}
            disabled={!settings.enabled || !settings.bySize.enabled}
          />
          <span className="settings-storage__rule-text">ГБ</span>
        </div>
        <span className="settings-tab__hint">
          Удаляются самые старые, пока не станет {settings.bySize.targetGb} ГБ
        </span>
      </section>
    </div>
  );
};
