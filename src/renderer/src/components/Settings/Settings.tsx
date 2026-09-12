import React, { useEffect, useRef } from 'react';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import './Settings.css';

interface SettingsProps {
  nickname: string;
  setNickname: (value: string) => void;
  avatar?: string;
  setAvatar: (value: string) => void;
  userId: string;
  serverAddress: string;
  setServerAddress: (value: string) => void;
  isServerRunning: boolean;
  startServer: () => void;
  connectToServer: () => void;
  isConnected: boolean;
  onClose: () => void;
  isOpen: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
  nickname,
  setNickname,
  avatar,
  setAvatar,
  userId,
  serverAddress,
  setServerAddress,
  isServerRunning,
  startServer,
  connectToServer,
  isConnected,
  onClose,
  isOpen
}): React.JSX.Element | null => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { shouldRender, animationClass, handleAnimationEnd } = useModalAnimation(isOpen, onClose);

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    if (isOpen) {
      timerId = setTimeout(() => {
        window.api.setTitlebarColor('#10101026');
      }, 30);
    } else {
      timerId = setTimeout(() => {
        window.api.setTitlebarColor('#2b2d31');
      }, 160);
    }
    return () => {
      clearTimeout(timerId);
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleAvatarClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер — 2МБ.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = (): void => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className={`settings-overlay ${animationClass}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="settings" onClick={(e: React.MouseEvent): void => e.stopPropagation()}>
        <header className="settings__header">
          <h2 className="settings__title">Настройки</h2>
          <button className="settings__close" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </header>

        <div className="settings__body">
          <section className="settings__section">
            <h3 className="settings__section-title">Профиль</h3>

            <div className="settings__avatar-selector">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div
                className="settings__avatar-preview-wrapper"
                onClick={handleAvatarClick}
                title="Изменить аватар"
              >
                {avatar ? (
                  <img src={avatar} alt="Preview" className="settings__avatar-preview" />
                ) : (
                  <div className="settings__avatar-placeholder">
                    {nickname.charAt(0).toUpperCase() || 'A'}
                  </div>
                )}
                <div className="settings__avatar-overlay">
                  <span className="settings__avatar-overlay-text">СМЕНИТЬ</span>
                </div>
              </div>
            </div>

            <label className="settings__field">
              <span className="settings__label">Ник</span>
              <input
                className="settings__input"
                type="text"
                value={nickname}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setNickname(e.target.value)
                }
                placeholder="Аноним"
                maxLength={32}
              />
            </label>
            <div className="settings__field">
              <span className="settings__label">Ваш ID</span>
              <div className="settings__id">{userId}</div>
            </div>
          </section>

          <section className="settings__section">
            <h3 className="settings__section-title">Соединение</h3>
            <label className="settings__field">
              <span className="settings__label">Адрес сервера</span>
              <input
                className="settings__input"
                type="text"
                value={serverAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setServerAddress(e.target.value)
                }
                placeholder="ws://localhost:8080"
              />
            </label>

            <div className="settings__actions">
              <button
                className="settings__button settings__button--primary"
                onClick={startServer}
                disabled={isServerRunning}
              >
                {isServerRunning ? 'Сервер запущен' : 'Стать хостом'}
              </button>
              <button
                className={`settings__button ${isConnected ? 'settings__button--danger' : ''}`}
                onClick={connectToServer}
              >
                {isConnected ? 'Отключиться' : 'Подключиться'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
