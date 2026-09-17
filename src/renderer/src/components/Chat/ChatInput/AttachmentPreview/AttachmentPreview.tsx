import React from 'react';
import type { Attachment } from '@shared/types';
import './AttachmentPreview.css';
import { formatSize } from '@renderer/utils/format';
import AttachIcon from '@renderer/assets/attach.svg?react';
import CloseIcon from '@renderer/assets/close.svg?react';

export interface PendingAttachment {
  attachment: Attachment;
  previewUrl: string | null;
}

interface AttachmentPreviewProps {
  pending: PendingAttachment;
  onRemove: () => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ pending, onRemove }) => {
  const { attachment, previewUrl } = pending;

  return (
    <div className="attachment-preview">
      {previewUrl ? (
        <img src={previewUrl} alt="" className="attachment-preview__thumb" />
      ) : (
        <span className="attachment-preview__icon">
          <AttachIcon width={20} height={20} />
        </span>
      )}
      <div className="attachment-preview__info">
        <span className="attachment-preview__name" title={attachment.fileName || ''}>
          {attachment.fileName}
        </span>
        <span className="attachment-preview__size">{formatSize(attachment.size)}</span>
      </div>
      <button
        type="button"
        className="attachment-preview__remove"
        onClick={onRemove}
        title="Убрать"
      >
        <CloseIcon width={20} height={20} />
      </button>
    </div>
  );
};
