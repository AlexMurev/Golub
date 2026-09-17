import React, { useState } from 'react';
import type { Attachment } from '@shared/types';
import { openImage } from '@renderer/utils/imageViewer';
import { AudioPlayer } from '@renderer/components/AudioPlayer/AudioPlayer';
import { formatSize, formatDuration } from '@renderer/utils/format';
import ImageIcon from '@renderer/assets/image.svg?react';
import VideoIcon from '@renderer/assets/video.svg?react';
import AudioIcon from '@renderer/assets/audio.svg?react';
import PdfIcon from '@renderer/assets/pdf.svg?react';
import FileIcon from '@renderer/assets/file.svg?react';
import ZipIcon from '@renderer/assets/zip.svg?react';
import AttachIcon from '@renderer/assets/attach.svg?react';
import DownloadIcon from '@renderer/assets/download.svg?react';
import './AttachmentCard.css';

interface AttachmentCardProps {
  attachment: Attachment;
  progress?: { transferred: number; total: number } | null;
  onImageOpen?: () => void;
}

function getFileIcon(mime: string | null): React.ReactNode {
  if (!mime) return <AttachIcon height={45} width={45} />;
  if (mime.startsWith('image/')) return <ImageIcon height={45} width={45} />;
  if (mime.startsWith('video/')) return <VideoIcon height={45} width={45} />;
  if (mime.startsWith('audio/')) return <AudioIcon height={45} width={45} />;
  if (mime === 'application/pdf') return <PdfIcon height={45} width={45} />;
  if (mime.startsWith('text/')) return <FileIcon height={45} width={45} />;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z'))
    return <ZipIcon height={45} width={45} />;
  return <AttachIcon height={45} width={45} />;
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

interface UnavailableCardProps {
  attachment: Attachment;
  reason: string;
}

const UnavailableCard: React.FC<UnavailableCardProps> = ({ attachment, reason }) => (
  <div className="attachment-card attachment-card--deleted">
    <span className="attachment-card__icon">{getFileIcon(attachment.mimeType)}</span>
    <div className="attachment-card__info">
      <span className="attachment-card__name">{attachment.fileName ?? 'Файл'}</span>
      <span className="attachment-card__size">{reason}</span>
    </div>
  </div>
);

export const AttachmentCard: React.FC<AttachmentCardProps> = ({
  attachment,
  progress,
  onImageOpen
}) => {
  const [mediaFailed, setMediaFailed] = useState<boolean>(false);

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

  const handleMediaError = (): void => setMediaFailed(true);

  const handleImageClick = (): void => {
    if (onImageOpen) {
      onImageOpen();
    } else {
      openImage([attachment], 0);
    }
  };

  // Файл удалён очисткой (метка в БД)
  if (attachment.fileDeletedAt !== null) {
    return (
      <UnavailableCard
        attachment={attachment}
        reason={`${formatSize(attachment.size)} • удалён для экономии места`}
      />
    );
  }

  // Файл не удалось загрузить (пропал с диска)
  if (mediaFailed) {
    return <UnavailableCard attachment={attachment} reason="файл недоступен" />;
  }

  // Не готово — заглушка с прогрессом
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

  // Картинка
  if (isImage) {
    const { width, height } = attachment;
    const size = width !== null && height !== null ? computeImageSize(width, height) : null;

    return (
      <button
        type="button"
        className="attachment-card attachment-card--image"
        onClick={handleImageClick}
        title={attachment.fileName ?? ''}
        style={size ?? undefined}
      >
        <img
          src={fileUrl}
          alt={attachment.fileName ?? ''}
          className="attachment-card__image"
          onError={handleMediaError}
        />
      </button>
    );
  }

  // Видео
  if (isVideo) {
    return (
      <div className="attachment-card attachment-card--video">
        <div className="attachment-card__video-wrapper">
          <video
            src={fileUrl}
            controls
            preload="metadata"
            className="attachment-card__video"
            onError={handleMediaError}
          />
          <div className="attachment-card__video-overlay">
            <span className="attachment-card__name">{attachment.fileName ?? 'Видео'}</span>
            <span className="attachment-card__size">
              {formatSize(attachment.size)}
              {attachment.duration && ` • ${formatDuration(attachment.duration)}`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Аудио
  if (isAudio) {
    return (
      <div className="attachment-card attachment-card--audio">
        <AudioPlayer
          src={fileUrl}
          fileName={attachment.fileName ?? 'Аудио'}
          size={attachment.size}
          duration={attachment.duration}
        />
      </div>
    );
  }

  // Обычный файл
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
        <DownloadIcon width={40} height={40} />
      </button>
    </div>
  );
};
