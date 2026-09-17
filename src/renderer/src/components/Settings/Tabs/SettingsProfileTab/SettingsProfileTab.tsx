import React, { useRef } from 'react';
import { useSelf } from '@renderer/hooks/useSelf';
import { useMyAddress } from '@renderer/hooks/useMyAddress';
import './SettingsProfileTab.css';

export const SettingsProfileTab: React.FC = (): React.JSX.Element | null => {
  const { self, updateSelf } = useSelf();
  const myAddress = useMyAddress();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!self) return null;

  const handleAvatarClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

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
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    void updateSelf({ nickname: e.target.value });
  };

  return (
    <div className="settings-tab">
      <section className="settings-tab__section">
        <div className="settings-profile__avatar-selector">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <div
            className="settings-profile__avatar-preview-wrapper"
            onClick={handleAvatarClick}
            title="Изменить аватар"
          >
            {self.avatar ? (
              <img src={self.avatar} alt="Preview" className="settings-profile__avatar-preview" />
            ) : (
              <div className="settings-profile__avatar-placeholder">
                {self.nickname.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <div className="settings-profile__avatar-overlay">
              <span className="settings-profile__avatar-overlay-text">СМЕНИТЬ</span>
            </div>
          </div>
        </div>

        <label className="settings-tab__field">
          <span className="settings-tab__label">Ник</span>
          <input
            className="settings-tab__input"
            type="text"
            value={self.nickname}
            onChange={handleNicknameChange}
            placeholder="Аноним"
            maxLength={32}
          />
        </label>

        <div className="settings-tab__field">
          <span className="settings-tab__label">Ваш ID</span>
          <div className="settings-tab__value">{self.peerId}</div>
        </div>

        <div className="settings-tab__field">
          <span className="settings-tab__label">Ваш адрес</span>
          <div className="settings-tab__value">{myAddress ?? 'Недоступен'}</div>
          <span className="settings-tab__hint">
            Передайте ID и адрес другу, чтобы он смог добавить вас в контакты
          </span>
        </div>
      </section>
    </div>
  );
};
