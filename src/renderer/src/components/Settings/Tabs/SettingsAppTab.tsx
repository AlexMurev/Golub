import React, { useEffect, useState } from 'react';
import type { UpdateStatus } from '@shared/types';
import {
  useImageCompression,
  setImageCompression,
  type CompressionLevel
} from '@renderer/utils/imageCompression';

const LEVEL_LABELS: Record<CompressionLevel, string> = {
  none: 'Без сжатия',
  light: 'Слабое сжатие',
  medium: 'Среднее сжатие',
  strong: 'Сильное сжатие'
};

export const SettingsAppTab: React.FC = (): React.JSX.Element => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [versions] = useState(window.electron.process.versions);
  const [appVersion, setAppVersion] = useState<string>('—');
  const compression = useImageCompression();

  useEffect(() => {
    if (window.api && typeof window.api.onUpdateStatus === 'function') {
      const unsubscribe = window.api.onUpdateStatus((status: UpdateStatus): void => {
        setUpdateStatus(status);

        if (status === 'not-available') {
          alert('У вас установлена последняя версия.');
          setUpdateStatus('idle');
        }
      });

      return (): void => {
        unsubscribe();
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    window.api.app
      .getVersion()
      .then((v: string): void => setAppVersion(v))
      .catch((err: unknown): void => {
        console.error('Failed to load app version:', err);
      });
  }, []);

  const handleUpdateClick = (): void => {
    if (updateStatus === 'idle') {
      window.api.checkForUpdates();
    } else if (updateStatus === 'available' || updateStatus === 'ready') {
      window.api.downloadAndInstall();
    }
  };

  const getUpdateButtonText = (): string => {
    switch (updateStatus) {
      case 'checking':
        return 'Проверка...';
      case 'available':
        return 'Скачать обновление';
      case 'downloading':
        return 'Скачивание...';
      case 'ready':
        return 'Обновить и перезапустить';
      default:
        return 'Проверить обновления';
    }
  };

  const handleCompressionChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    void setImageCompression(e.target.value as CompressionLevel);
  };

  return (
    <div className="settings-tab">
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

      <section className="settings-tab__section">
        <div className="settings-tab__actions">
          <button
            className={`settings-tab__button ${updateStatus === 'ready' ? 'settings-tab__button--success' : ''}`}
            onClick={handleUpdateClick}
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
          >
            {getUpdateButtonText()}
          </button>
        </div>
      </section>

      <section className="settings-tab__section">
        <h3 className="settings-tab__section-title">Версии</h3>
        <ul className="settings-tab__versions">
          <li className="settings-tab__version">
            <span className="settings-tab__version-name">Golub</span>
            <span className="settings-tab__version-value">v{appVersion}</span>
          </li>
          <li className="settings-tab__version">
            <span className="settings-tab__version-name">Electron</span>
            <span className="settings-tab__version-value">v{versions.electron}</span>
          </li>
          <li className="settings-tab__version">
            <span className="settings-tab__version-name">Chromium</span>
            <span className="settings-tab__version-value">v{versions.chrome}</span>
          </li>
          <li className="settings-tab__version">
            <span className="settings-tab__version-name">Node</span>
            <span className="settings-tab__version-value">v{versions.node}</span>
          </li>
        </ul>
      </section>
    </div>
  );
};
