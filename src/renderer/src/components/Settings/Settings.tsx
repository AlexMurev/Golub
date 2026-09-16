import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@renderer/components/Modal/Modal';
import { ModalHeader } from '@renderer/components/Modal/ModalHeader';
import { useSelf } from '@renderer/hooks/useSelf';
import { useMyAddress } from '@renderer/hooks/useMyAddress';
import type { UpdateStatus } from '@shared/types';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose
}): React.JSX.Element | null => {
  const { self, updateSelf } = useSelf();
  const myAddress = useMyAddress();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  if (!self) return null;

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
          void updateSelf({ avatar: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    void updateSelf({ nickname: e.target.value });
  };

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="settings">
      <ModalHeader title="Настройки" onClose={onClose} />

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
              {self.avatar ? (
                <img src={self.avatar} alt="Preview" className="settings__avatar-preview" />
              ) : (
                <div className="settings__avatar-placeholder">
                  {self.nickname.charAt(0).toUpperCase() || 'A'}
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
              value={self.nickname}
              onChange={handleNicknameChange}
              placeholder="Аноним"
              maxLength={32}
            />
          </label>
          <div className="settings__field">
            <span className="settings__label">Ваш ID</span>
            <div className="settings__id">{self.peerId}</div>
          </div>

          <div className="settings__field">
            <span className="settings__label">Ваш адрес</span>
            <div className="settings__id">{myAddress ?? 'Недоступен'}</div>
            <span className="settings__hint">
              Передайте ID и адрес другу, чтобы он смог добавить вас в контакты
            </span>
          </div>
        </section>

        <section className="settings__section">
          <h3 className="settings__section-title">Обновления</h3>
          <div className="settings__actions">
            <button
              className={`settings__button ${updateStatus === 'ready' ? 'settings__button--success' : ''}`}
              onClick={handleUpdateClick}
              disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
            >
              {getUpdateButtonText()}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
};
