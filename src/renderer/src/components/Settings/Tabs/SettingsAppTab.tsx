import React, { useEffect, useState } from 'react';
import type { UpdateStatus } from '@shared/types';
// TODO: прописать актуальный путь до BlackJack
import BlackJack from '@renderer/components/BlackJack/BlackJack';

const GOLUB_CLICKS_TO_OPEN = 10;

export const SettingsAppTab: React.FC = (): React.JSX.Element => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [versions] = useState(window.electron.process.versions);
  const [appVersion, setAppVersion] = useState<string>('—');
  const [devEnabled, setDevEnabled] = useState<boolean>(false);

  // Пасхалка: 10 кликов по строке с версией Golub
  const [golubClicks, setGolubClicks] = useState<number>(0);
  const [showBlackjack, setShowBlackjack] = useState<boolean>(false);

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

    void window.api.dev.getEnabled().then(setDevEnabled);
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

  const handleDevToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.checked;
    setDevEnabled(value);
    void window.api.dev.setEnabled(value);
    if (value) {
      void window.api.dev.openDevTools();
    }
  };

  const handleOpenDevTools = (): void => {
    void window.api.dev.openDevTools();
  };

  const handleGolubClick = (): void => {
    const next = golubClicks + 1;
    if (next >= GOLUB_CLICKS_TO_OPEN) {
      setGolubClicks(0);
      setShowBlackjack(true);
    } else {
      setGolubClicks(next);
    }
  };

  return (
    <>
      <div className="settings-tab">
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
          <h3 className="settings-tab__section-title">Разработка</h3>
          <label className="settings-tab__toggle">
            <span className="settings-tab__label">Режим разработчика</span>
            <input type="checkbox" checked={devEnabled} onChange={handleDevToggle} />
          </label>
          <span className="settings-tab__hint">
            Открывает доступ к инструментам разработчика: F12 или Ctrl+Shift+I. При включении
            DevTools откроется сразу.
          </span>

          {devEnabled && (
            <div className="settings-tab__actions" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="settings-tab__button" onClick={handleOpenDevTools}>
                Открыть DevTools
              </button>
            </div>
          )}
        </section>

        <section className="settings-tab__section">
          <h3 className="settings-tab__section-title">Версии</h3>
          <ul className="settings-tab__versions">
            <li
              className="settings-tab__version settings-tab__version--golub"
              onClick={handleGolubClick}
            >
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

      {showBlackjack && <BlackJack onClose={(): void => setShowBlackjack(false)} />}
    </>
  );
};
