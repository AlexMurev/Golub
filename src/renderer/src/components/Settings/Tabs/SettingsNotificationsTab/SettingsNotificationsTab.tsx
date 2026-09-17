import React, { useEffect, useRef, useState } from 'react';
import { useGlobalSound } from '@renderer/utils/sounds';
import * as sounds from '@renderer/utils/sounds';
import './SettingsNotificationsTab.css';

export const SettingsNotificationsTab: React.FC = (): React.JSX.Element => {
  const globalSound = useGlobalSound();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [badgeEnabled, setBadgeEnabled] = useState<boolean>(true);

  const isDefault = globalSound?.name === null;
  const volume = globalSound?.volume ?? 1;
  const mono = globalSound?.mono ?? false;

  useEffect(() => {
    void window.api.app
      .getBadgeEnabled()
      .then(setBadgeEnabled)
      .catch((err: unknown): void => {
        console.error('Failed to load badge setting:', err);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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
        void sounds.setGlobal(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    void sounds.setGlobalVolume(Number(e.target.value) / 100);
  };

  const handleMonoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    void sounds.setGlobalMono(e.target.checked);
  };

  const handleBadgeToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const enabled = e.target.checked;
    setBadgeEnabled(enabled);
    void window.api.app.setBadgeEnabled(enabled);
  };

  const [readReceipts, setReadReceipts] = useState<'immediate' | 'on-reply'>('immediate');

  useEffect(() => {
    void window.api.privacy.getReadReceipts().then((v) => {
      setReadReceipts(v === 'on-reply' ? 'on-reply' : 'immediate');
    });
  }, []);

  const handleReadReceiptsChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value as 'immediate' | 'on-reply';
    setReadReceipts(value);
    void window.api.privacy.setReadReceipts(value);
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
              onClick={(): void => void sounds.previewGlobal()}
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
                onClick={(): void => void sounds.clearGlobal()}
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
            style={{ '--progress': `${Math.round(volume * 100)}%` } as React.CSSProperties}
          />
          <span className="settings-notifications__volume-value">{Math.round(volume * 100)}%</span>
        </div>
      </section>

      <section className="settings-tab__section">
        <label className="settings-tab__toggle">
          <span className="settings-tab__label">Моно-звук</span>
          <input type="checkbox" checked={mono} onChange={handleMonoChange} />
        </label>
        <span className="settings-tab__hint">
          Включайте, если в вашем mp3 звук слышен только в одном наушнике.
        </span>
      </section>

      <section className="settings-tab__section">
        <label className="settings-tab__field">
          <span className="settings-tab__label">Отправлять статус прочтения</span>
          <select
            className="settings-tab__input"
            value={readReceipts}
            onChange={handleReadReceiptsChange}
          >
            <option value="immediate">Сразу при просмотре</option>
            <option value="on-reply">Только при ответе</option>
          </select>
          <span className="settings-tab__hint">
            Вторая галочка появляется у собеседника, только когда вы прочитали сообщение согласно
            этому режиму.
          </span>
        </label>
      </section>

      <section className="settings-tab__section">
        <label className="settings-tab__toggle">
          <span className="settings-tab__label">Индикатор непрочитанных в панели задач</span>
          <input type="checkbox" checked={badgeEnabled} onChange={handleBadgeToggle} />
        </label>
        <span className="settings-tab__hint">
          Показывает точку на иконке приложения, когда есть непрочитанные сообщения.
        </span>
      </section>
    </div>
  );
};
