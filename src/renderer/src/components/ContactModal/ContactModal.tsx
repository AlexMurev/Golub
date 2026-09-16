import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@renderer/components/Modal/Modal';
import { ModalHeader } from '@renderer/components/Modal/ModalHeader';
import { useGlobalSound } from '@renderer/utils/sounds';
import * as sounds from '@renderer/utils/sounds';
import type { User } from '@shared/types';
import './ContactModal.css';

interface ContactModalProps {
  isOpen: boolean;
  peerId: string | null;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  peerId,
  onClose
}): React.JSX.Element | null => {
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [prevPeerId, setPrevPeerId] = useState<string | null>(peerId);
  const globalSound = useGlobalSound();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (peerId !== prevPeerId) {
    setPrevPeerId(peerId);
    setUser(null);
    setIsOnline(false);
  }

  useEffect(() => {
    if (!isOpen || !peerId) return;

    let cancelled = false;

    (async (): Promise<void> => {
      const u = await window.api.db.users.get(peerId);
      const online = await window.api.transport.isConnectedTo(peerId);
      if (!cancelled) {
        setUser(u);
        setIsOnline(online);
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, [isOpen, peerId]);

  const refreshUser = async (): Promise<void> => {
    if (!peerId) return;
    const u = await window.api.db.users.get(peerId);
    setUser(u);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!peerId) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер — 5 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = (): void => {
      if (typeof reader.result === 'string') {
        void sounds.setForPeer(peerId, reader.result, file.name).then(refreshUser);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearSound = async (): Promise<void> => {
    if (!peerId) return;
    await sounds.clearForPeer(peerId);
    await refreshUser();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!peerId) return;
    const v = Number(e.target.value) / 100;
    void sounds.setForPeerVolume(peerId, v).then(refreshUser);
  };

  const handleResetVolume = async (): Promise<void> => {
    if (!peerId) return;
    await sounds.setForPeerVolume(peerId, null);
    await refreshUser();
  };

  const handleMonoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!peerId) return;
    void sounds.setForPeerMono(peerId, e.target.checked).then(refreshUser);
  };

  const handleRemove = async (): Promise<void> => {
    if (!peerId || !user) return;
    if (!confirm(`Удалить контакт ${user.nickname}?`)) return;
    await window.api.db.users.remove(peerId);
    onClose();
  };

  const volume = user?.notificationVolume ?? globalSound?.volume ?? 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="contact-modal">
      <ModalHeader title="Контакт" onClose={onClose} />

      {user && peerId && (
        <div className="contact-modal__body">
          <div className="contact-modal__profile">
            {user.avatar ? (
              <img src={user.avatar} alt={user.nickname} className="contact-modal__avatar" />
            ) : (
              <div className="contact-modal__avatar contact-modal__avatar--placeholder">
                {(user.nickname || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="contact-modal__profile-info">
              <span className="contact-modal__nickname">{user.nickname}</span>
              <span
                className={`contact-modal__status ${isOnline ? 'contact-modal__status--online' : ''}`}
              >
                {isOnline ? 'в сети' : 'не в сети'}
              </span>
            </div>
          </div>

          <section className="contact-modal__section">
            <span className="contact-modal__label">ID</span>
            <div className="contact-modal__value">{user.peerId}</div>
          </section>

          <section className="contact-modal__section">
            <span className="contact-modal__label">Адрес</span>
            <div className="contact-modal__value">{user.address ?? 'Неизвестен'}</div>
          </section>

          <section className="contact-modal__section">
            <span className="contact-modal__label">Звук уведомлений</span>
            <div className="contact-modal__row">
              <span className="contact-modal__sound-name">
                {user.notificationSound ??
                  (globalSound?.name
                    ? `Как у всех (${globalSound.name})`
                    : 'Как у всех (по умолчанию)')}
              </span>
              <div className="contact-modal__actions">
                <button
                  type="button"
                  className="contact-modal__button"
                  onClick={(): void => void sounds.previewForPeer(peerId)}
                >
                  Прослушать
                </button>
                <button
                  type="button"
                  className="contact-modal__button"
                  onClick={(): void => fileInputRef.current?.click()}
                >
                  Заменить
                </button>
                {user.notificationSound !== null && (
                  <button
                    type="button"
                    className="contact-modal__button"
                    onClick={(): void => void handleClearSound()}
                  >
                    Сбросить
                  </button>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              style={{ display: 'none' }}
            />
          </section>

          <section className="contact-modal__section">
            <div className="contact-modal__row">
              <span className="contact-modal__label">Громкость</span>
              {user.notificationVolume !== null && (
                <button
                  type="button"
                  className="contact-modal__reset"
                  onClick={(): void => void handleResetVolume()}
                  title="Сбросить к глобальной"
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="contact-modal__volume">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={handleVolumeChange}
                style={
                  {
                    '--progress': `${Math.round((user.notificationVolume ?? globalSound?.volume ?? 1) * 100)}%`
                  } as React.CSSProperties
                }
              />
              <span className="contact-modal__volume-value">{Math.round(volume * 100)}%</span>
            </div>
            {user.notificationVolume === null && (
              <span className="contact-modal__hint">Используется глобальная громкость</span>
            )}
          </section>

          <section className="contact-modal__section">
            <label className="contact-modal__toggle">
              <span className="contact-modal__label">Моно-звук</span>
              <input
                type="checkbox"
                checked={user.notificationMono ?? globalSound?.mono ?? false}
                onChange={handleMonoChange}
              />
            </label>
          </section>

          <button
            type="button"
            className="contact-modal__danger"
            onClick={(): void => void handleRemove()}
          >
            Удалить контакт
          </button>
        </div>
      )}
    </Modal>
  );
};
