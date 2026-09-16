import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Attachment } from '@shared/types';
import './AttachmentCard.css';

interface AttachmentCardProps {
  attachment: Attachment;
  progress?: { transferred: number; total: number } | null;
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getFileIcon(mime: string | null): string {
  if (!mime) return '📎';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📕';
  if (mime.startsWith('text/')) return '📄';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return '🗜️';
  return '📎';
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment, progress }) => {
  const mime = attachment.mimeType ?? '';
  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');

  const isReady = attachment.transferState === 'complete' && attachment.filePath !== null;
  const fileUrl = `golub-file://${attachment.id}`;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isElementFullscreen, setIsElementFullscreen] = useState<boolean>(false);

  // Отслеживаем, развернут ли наш конкретный плеер на весь экран
  useEffect(() => {
    if (!isVideo) return;

    const onFullscreenChange = (): void => {
      // Если текущий fullscreen-элемент в DOM — это наше видео, переключаем стейт
      setIsElementFullscreen(document.fullscreenElement === videoRef.current);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [isVideo]);

  const pct = progress
    ? Math.min(100, Math.round((progress.transferred / progress.total) * 100))
    : null;

  const handleOpen = (): void => {
    if (!isReady) return;
    void window.api.files.open(attachment.id);
  };

  const handleSaveAs = (): void => {
    if (!isReady) return;
    void window.api.files.saveAs(attachment.id);
  };

  // ----------------------------------------------------------------
  // Не готово — заглушка с прогрессом
  // ----------------------------------------------------------------
  if (!isReady) {
    return (
      <div className="attachment-card attachment-card--loading">
        <span className="attachment-card__icon">{getFileIcon(mime)}</span>
        <div className="attachment-card__info">
          <span className="attachment-card__name">{attachment.fileName ?? 'Файл'}</span>
          <span className="attachment-card__size">
            {pct !== null ? `Загрузка ${pct}%` : formatSize(attachment.size)}
          </span>
        </div>
        {pct !== null && (
          <div className="attachment-card__progress-bar">
            <div className="attachment-card__progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Картинка
  // ----------------------------------------------------------------
  if (isImage) {
    return (
      <button
        type="button"
        className="attachment-card attachment-card--image"
        onClick={handleOpen}
        title={attachment.fileName ?? ''}
      >
        <img src={fileUrl} alt={attachment.fileName ?? ''} className="attachment-card__image" />
      </button>
    );
  }

  // ----------------------------------------------------------------
  // Видео (Исправлено с использованием Портала)
  // ----------------------------------------------------------------
  if (isVideo) {
    const videoElement = (
      <video
        ref={videoRef}
        src={fileUrl}
        controls
        preload="metadata"
        className={`attachment-card__video ${isElementFullscreen ? 'video-portal-fullscreen' : ''}`}
      />
    );

    return (
      <div className="attachment-card attachment-card--video">
        {/* Когда видео уходит в фулскрин, телепортируем его в body, чтобы уберечь от ререндеров списка */}
        {isElementFullscreen ? createPortal(videoElement, document.body) : videoElement}
        <div className="attachment-card__video-footer">
          <span className="attachment-card__name">{attachment.fileName ?? 'Видео'}</span>
          <span className="attachment-card__size">
            {formatSize(attachment.size)}
            {attachment.duration && ` • ${formatDuration(attachment.duration)}`}
          </span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Аудио
  // ----------------------------------------------------------------
  if (isAudio) {
    return (
      <div className="attachment-card attachment-card--audio">
        <div className="attachment-card__audio-head">
          <span className="attachment-card__audio-icon">🎵</span>
          <div className="attachment-card__info">
            <span className="attachment-card__name">{attachment.fileName ?? 'Аудио'}</span>
            <span className="attachment-card__size">
              {formatSize(attachment.size)}
              {attachment.duration && ` • ${formatDuration(attachment.duration)}`}
            </span>
          </div>
        </div>
        <audio src={fileUrl} controls preload="metadata" className="attachment-card__audio" />
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Обычный файл
  // ----------------------------------------------------------------
  return (
    <div className="attachment-card attachment-card--file">
      <button
        type="button"
        className="attachment-card__file-btn"
        onClick={handleOpen}
        title="Открыть"
      >
        <span className="attachment-card__icon">{getFileIcon(mime)}</span>
        <div className="attachment-card__info">
          <span className="attachment-card__name">{attachment.fileName ?? 'Файл'}</span>
          <span className="attachment-card__size">{formatSize(attachment.size)}</span>
        </div>
      </button>
      <button
        type="button"
        className="attachment-card__save"
        onClick={handleSaveAs}
        title="Сохранить как..."
      >
        ⤓
      </button>
    </div>
  );
};
