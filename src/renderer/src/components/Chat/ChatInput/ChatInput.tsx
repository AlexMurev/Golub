import React, { useEffect, useRef, useState } from 'react';
import SendIcon from '@renderer/assets/send.svg?react';
import AttachIcon from '@renderer/assets/send.svg?react';
import { AttachmentPreview, type PendingAttachment } from './AttachmentPreview/AttachmentPreview';
import './ChatInput.css';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  isConnected: boolean;
  hasReply: boolean;
  attachments: PendingAttachment[];
  onAddAttachments: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
}

const MAX_ROWS = 8;
const LINE_HEIGHT = 20;

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  sendMessage,
  isConnected,
  hasReply,
  attachments,
  onAddAttachments,
  onRemoveAttachment
}): React.JSX.Element => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 20;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      onAddAttachments(e.target.files);
    }
    e.target.value = '';
  };

  const hasContent = input.trim().length > 0 || attachments.length > 0;

  return (
    <div className="chat-input-wrapper">
      {attachments.length > 0 && (
        <div className="chat-input-attachments">
          {attachments.map((p) => (
            <AttachmentPreview
              key={p.attachment.id}
              pending={p}
              onRemove={(): void => onRemoveAttachment(p.attachment.id)}
            />
          ))}
        </div>
      )}

      <div
        className={`chat-input-area ${isFocused ? 'chat-input-area--focused' : ''} ${!isConnected ? 'chat-input-area--disabled' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="chat-input-area__attach-button"
          onClick={(): void => fileInputRef.current?.click()}
          disabled={!isConnected}
          title="Прикрепить файл"
        >
          <AttachIcon height={20} width={20} />
        </button>

        <textarea
          ref={textareaRef}
          className="chat-input-area__message"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(): void => setIsFocused(true)}
          onBlur={(): void => setIsFocused(false)}
          placeholder={hasReply ? 'Введите ответ...' : 'Введите сообщение...'}
          disabled={!isConnected}
          rows={1}
        />

        <button
          className="chat-input-area__send-button"
          onClick={sendMessage}
          disabled={!isConnected || !hasContent}
          title="Отправить"
        >
          <SendIcon height={30} width={30} />
        </button>
      </div>
    </div>
  );
};
