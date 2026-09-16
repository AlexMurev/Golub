import React, { useState } from 'react';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatInput } from './ChatInput/ChatInput';
import { ChatTopBar } from './ChatTopBar/ChatTopBar';
import { useMessages } from '@renderer/hooks/useMessages';
import { useSelf } from '@renderer/hooks/useSelf';
import {
  compressImage,
  isHeavyImage,
  getImageCompression,
  CompressionLevel
} from '@renderer/utils/imageCompression';
import type { Attachment, Message, ChatListItem, ReplyPreview } from '@shared/types';
import type { PendingAttachment } from './ChatInput/AttachmentPreview/AttachmentPreview';
import './Chat.css';

interface ChatProps {
  chat: ChatListItem;
  onOpenContact?: (peerId: string) => void;
}

const Chat: React.FC<ChatProps> = ({ chat, onOpenContact }): React.JSX.Element => {
  const { self } = useSelf();
  const {
    messages,
    isLoading,
    hasMore,
    isLoadingOlder,
    firstItemIndex,
    loadOlder,
    sendMessage,
    editMessage,
    deleteMessage
  } = useMessages(chat.id, self?.peerId ?? null);

  const [input, setInput] = useState<string>('');
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const handleSend = async (): Promise<void> => {
    if (!input.trim() && pendingAttachments.length === 0) return;
    const attachments: Attachment[] = pendingAttachments.map((p) => p.attachment);
    await sendMessage(input, replyTo?.id ?? null, attachments);
    setReplyTo(null);
    setInput('');
    setPendingAttachments([]);
  };

  const handleStartEdit = (id: string): void => {
    setEditingId(id);
    setReplyTo(null);
  };

  const handleSubmitEdit = async (id: string, text: string): Promise<void> => {
    await editMessage(id, text);
    setEditingId(null);
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
  };

  const handleReply = (message: Message): void => {
    setReplyTo({
      id: message.id,
      senderId: message.senderId,
      senderNickname: message.senderNickname,
      senderAvatar: message.senderAvatar,
      text: message.text,
      replyDeleted: false
    });

    setTimeout((): void => {
      const inputEl = document.querySelector(
        '.chat-input-area__message'
      ) as HTMLTextAreaElement | null;
      if (inputEl) inputEl.focus();
    }, 0);
  };

  const cancelReply = (): void => {
    setReplyTo(null);
  };

  const handleAddAttachments = (files: FileList): void => {
    const maxNew = 10 - pendingAttachments.length;
    if (maxNew <= 0) {
      alert('Максимум 10 файлов на сообщение.');
      return;
    }

    const arr = Array.from(files).slice(0, maxNew);
    void processFiles(arr);
  };

  const processFiles = async (files: File[]): Promise<void> => {
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const isImage = file.type.startsWith('image/');
      const level = getImageCompression();

      let fileToSave: Blob = file;
      let nameToSave: string = file.name;
      let previewUrl: string | null = null;
      let width: number | null = null;
      let height: number | null = null;

      if (isImage) {
        let effectiveLevel: CompressionLevel | undefined = undefined;

        if (level === 'none' && isHeavyImage(file)) {
          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
          const ok = confirm(
            `Изображение "${file.name}" весит ${sizeMb} МБ. Сжать перед отправкой?`
          );
          if (ok) effectiveLevel = 'medium';
          // если не ok — effectiveLevel остаётся undefined, но level='none' → отправим оригинал
        }

        const result = await compressImage(file, effectiveLevel);
        if (result) {
          fileToSave = result.blob;
          width = result.width;
          height = result.height;
          previewUrl = URL.createObjectURL(result.blob);

          const willCompress = level !== 'none' || effectiveLevel !== undefined;
          if (willCompress) {
            const baseName = file.name.replace(/\.[^.]+$/, '');
            nameToSave = `${baseName}.webp`;
          }
        }
      }

      await saveAndAdd(fileToSave, file, nameToSave, isImage, width, height, previewUrl, idx);
    }
  };

  const saveAndAdd = async (
    blob: Blob,
    originalFile: File,
    name: string,
    isImage: boolean,
    width: number | null,
    height: number | null,
    previewUrl: string | null,
    idx: number
  ): Promise<void> => {
    try {
      // Blob → data URL
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = (): void => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Не удалось прочитать файл'));
        };
        reader.onerror = (): void => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      const base64 = dataUrl.split(',')[1];
      const mimeType = blob.type || originalFile.type || null;

      const saved = await window.api.files.save(base64, name);
      if (!saved.success || !saved.filePath) {
        console.error('Failed to save file:', saved.error);
        return;
      }

      const attachment: Attachment = {
        id: crypto.randomUUID(),
        messageId: '',
        fileName: name,
        mimeType,
        size: saved.size ?? blob.size,
        filePath: saved.filePath,
        transferState: null,
        width,
        height,
        duration: null,
        orderIndex: pendingAttachments.length + idx,
        createdAt: Date.now(),
        deletedAt: null
      };

      setPendingAttachments((prev) => [
        ...prev,
        { attachment, previewUrl: isImage ? previewUrl : null }
      ]);
    } catch (err) {
      console.error('saveAndAdd error:', err);
    }
  };

  const handleRemoveAttachment = (id: string): void => {
    setPendingAttachments((prev) => prev.filter((p) => p.attachment.id !== id));
  };

  const subtitle: string =
    chat.type === 'group' ? 'Групповой чат' : chat.isOnline ? 'в сети' : 'не в сети';

  return (
    <div className="chat">
      <ChatTopBar
        title={chat.title}
        subtitle={subtitle}
        avatar={chat.avatar}
        isOnline={chat.type === 'direct' ? chat.isOnline : undefined}
        onClick={
          chat.type === 'direct' && chat.otherPeerId && onOpenContact
            ? (): void => onOpenContact(chat.otherPeerId!)
            : undefined
        }
      />

      <ChatMessages
        chatId={chat.id}
        messages={messages}
        myId={self?.peerId ?? ''}
        firstItemIndex={firstItemIndex}
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        editingId={editingId}
        onLoadOlder={loadOlder}
        onReply={handleReply}
        onStartEdit={handleStartEdit}
        onSubmitEdit={handleSubmitEdit}
        onCancelEdit={handleCancelEdit}
        onDelete={deleteMessage}
      />

      {replyTo && <ChatReplyPreview replyTo={replyTo} onCancel={cancelReply} />}

      <ChatInput
        input={input}
        setInput={setInput}
        sendMessage={handleSend}
        isConnected={true}
        hasReply={!!replyTo}
        attachments={pendingAttachments}
        onAddAttachments={handleAddAttachments}
        onRemoveAttachment={handleRemoveAttachment}
      />
    </div>
  );
};

export default Chat;
