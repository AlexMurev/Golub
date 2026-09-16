import React from 'react';
import type { Attachment } from '@shared/types';
import './AttachmentPreview.css';

export interface PendingAttachment {
  attachment: Attachment;
  previewUrl: string | null;
}

interface AttachmentPreviewProps {
  pending: PendingAttachment;
  onRemove: () => void;
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ pending, onRemove }) => {
  const { attachment, previewUrl } = pending;

  return (
    <div className="attachment-preview">
      {previewUrl ? (
        <img src={previewUrl} alt="" className="attachment-preview__thumb" />
      ) : (
        <span className="attachment-preview__icon">📎</span>
      )}
      <div className="attachment-preview__info">
        <span className="attachment-preview__name">{attachment.fileName}</span>
        <span className="attachment-preview__size">{formatSize(attachment.size)}</span>
      </div>
      <button
        type="button"
        className="attachment-preview__remove"
        onClick={onRemove}
        title="Убрать"
      >
        ✕
      </button>
    </div>
  );
};
