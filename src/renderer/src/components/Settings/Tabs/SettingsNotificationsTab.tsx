import React, { useRef } from 'react';
import { useGlobalSound, useVolume } from '@renderer/utils/sounds';
import * as sounds from '@renderer/utils/sounds';
import './SettingsNotificationsTab.css';

export const SettingsNotificationsTab: React.FC = (): React.JSX.Element => {
  const globalSound = useGlobalSound();
  const volume = useVolume();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDefault = globalSound?.name === null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер — 5 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = (): void => {
      if (typeof reader.result === 'string') {
        void sounds.setGlobal(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePlay = (): void => {
    if (!globalSound?.dataUrl) return;
    const audio = new Audio(globalSound.dataUrl);
    audio.volume = volume;
    void audio.play();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    void sounds.setVolume(Number(e.target.value) / 100);
  };

  return (
    <div className="settings-tab">
      <section className="settings-tab__section">
        <span className="settings-tab__label">Глобальный звук уведомлений</span>

        <div className="settings-notifications__row">
          <span className="settings-notifications__name">
            {isDefault ? 'По умолчанию' : globalSound?.name}
          </span>

          <div className="settings-notifications__actions">
            <button
              type="button"
              className="settings-tab__button"
              onClick={handlePlay}
              disabled={!globalSound?.dataUrl}
            >
              Прослушать
            </button>
            <button
              type="button"
              className="settings-tab__button"
              onClick={(): void => fileInputRef.current?.click()}
            >
              Заменить
            </button>
            {!isDefault && (
              <button
                type="button"
                className="settings-tab__button"
                onClick={(): void => {
                  void sounds.clearGlobal();
                }}
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

        <span className="settings-tab__hint">
          Используется для всех уведомлений. Формат: mp3, ogg, wav, webm. Максимум 5 МБ.
        </span>
      </section>

      <section className="settings-tab__section">
        <span className="settings-tab__label">Громкость</span>
        <div className="settings-notifications__volume">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={handleVolumeChange}
            className="settings-notifications__slider"
          />
          <span className="settings-notifications__volume-value">{Math.round(volume * 100)}%</span>
        </div>
      </section>

      <section className="settings-tab__section">
        <span className="settings-tab__label">Персональные звуки</span>
        <span className="settings-tab__hint">
          Настроить отдельный звук для конкретного контакта можно будет позже.
        </span>
      </section>
    </div>
  );
};
