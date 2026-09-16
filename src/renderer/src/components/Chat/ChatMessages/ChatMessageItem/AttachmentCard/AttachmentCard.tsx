import React from 'react';
import type { Attachment } from '@shared/types';
import { openImage } from '@renderer/utils/imageViewer';
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

function computeImageSize(
  w: number,
  h: number,
  maxW = 400,
  maxH = 300
): { width: number; height: number } {
  let dw = w;
  let dh = h;
  if (dw > maxW) {
    dh = dh * (maxW / dw);
    dw = maxW;
  }
  if (dh > maxH) {
    dw = dw * (maxH / dh);
    dh = maxH;
  }
  return { width: Math.round(dw), height: Math.round(dh) };
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment, progress }) => {
  const mime = attachment.mimeType ?? '';
  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');

  const isReady = attachment.filePath !== null;
  const fileUrl = `golub-file://${attachment.id}`;

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
    const hasDims = attachment.width !== null && attachment.height !== null;
    const size = hasDims ? computeImageSize(attachment.width!, attachment.height!) : null;

    return (
      <button
        type="button"
        className="attachment-card attachment-card--image"
        onClick={(): void => openImage(attachment)}
        title={attachment.fileName ?? ''}
        style={size ? { width: size.width, height: size.height } : undefined}
      >
        <img
          src={fileUrl}
          alt={attachment.fileName ?? ''}
          className="attachment-card__image"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </button>
    );
  }

  // ----------------------------------------------------------------
  // Видео
  // ----------------------------------------------------------------
  if (isVideo) {
    return (
      <div className="attachment-card attachment-card--video">
        <video src={fileUrl} controls preload="metadata" className="attachment-card__video" />
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
