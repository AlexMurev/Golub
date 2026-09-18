import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatInput } from './ChatInput/ChatInput';
import { ChatTopBar } from './ChatTopBar/ChatTopBar';
import { TypingIndicator } from './TypingIndicator/TypingIndicator';
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

  // ==========================================================================
  // Измерение высоты нижней панели
  // ==========================================================================

  const bottomRef = useRef<HTMLDivElement>(null);
  const [bottomInset, setBottomInset] = useState<number>(0);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const update = (): void => setBottomInset(el.offsetHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return (): void => ro.disconnect();
  }, []);

  // ==========================================================================
  // Typing indicator
  // ==========================================================================

  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);
  const [prevChatId, setPrevChatId] = useState<string>(chat.id);
  const typingResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (chat.id !== prevChatId) {
    setPrevChatId(chat.id);
    setIsPeerTyping(false);
  }

  const peerId: string | null =
    chat.type === 'direct' && chat.otherPeerId ? chat.otherPeerId : null;

  useEffect(() => {
    if (!peerId) return;

    const unsub = window.api.transport.onTyping((from, isTyping): void => {
      if (from !== peerId) return;

      setIsPeerTyping(isTyping);

      if (typingResetTimerRef.current) {
        clearTimeout(typingResetTimerRef.current);
        typingResetTimerRef.current = null;
      }

      if (isTyping) {
        typingResetTimerRef.current = setTimeout((): void => setIsPeerTyping(false), 5000);
      }
    });

    return (): void => {
      unsub();
      if (typingResetTimerRef.current) {
        clearTimeout(typingResetTimerRef.current);
        typingResetTimerRef.current = null;
      }
    };
  }, [peerId]);

  const typingSentAtRef = useRef<number>(0);
  const typingStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  const notifyTyping = useCallback((): void => {
    if (!peerId) return;

    const now = Date.now();
    if (now - typingSentAtRef.current > 2000) {
      typingSentAtRef.current = now;
      void window.api.transport.sendTyping(peerId, true);
    }

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout((): void => {
      typingSentAtRef.current = 0;
      void window.api.transport.sendTyping(peerId, false);
    }, 3000);
  }, [peerId]);

  useEffect(() => {
    return (): void => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    };
  }, []);

  // ==========================================================================
  // Drag & drop
  // ==========================================================================

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);

  // Глобально предотвращаем дефолтное поведение Electron
  // (навигацию к файлу, если его бросили вне зоны чата)
  useEffect(() => {
    const prevent = (e: DragEvent): void => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return (): void => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleAddAttachments(files);
    }
  };

  // ==========================================================================
  // Отправка / редактирование / ответы
  // ==========================================================================

  const handleSend = async (): Promise<void> => {
    if (!input.trim() && pendingAttachments.length === 0) return;
    const attachments: Attachment[] = pendingAttachments.map((p) => p.attachment);
    await sendMessage(input, replyTo?.id ?? null, attachments);
    setReplyTo(null);
    setInput('');
    setPendingAttachments([]);

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    if (peerId) {
      typingSentAtRef.current = 0;
      void window.api.transport.sendTyping(peerId, false);
    }
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

  const handleInputChange = (value: string): void => {
    setInput(value);
    if (value.trim().length > 0) {
      notifyTyping();
    }
  };

  // ==========================================================================
  // Вложения
  // ==========================================================================

  const handleAddAttachments = (files: FileList | File[]): void => {
    const maxNew = 10 - pendingAttachments.length;
    if (maxNew <= 0) {
      alert('Максимум 10 файлов на сообщение.');
      return;
    }

    const arr = (Array.isArray(files) ? files : Array.from(files)).slice(0, maxNew);
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
        deletedAt: null,
        fileDeletedAt: null
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
    <div
      className={`chat ${isDragging ? 'chat--dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
        bottomInset={bottomInset}
        onLoadOlder={loadOlder}
        onReply={handleReply}
        onStartEdit={handleStartEdit}
        onSubmitEdit={handleSubmitEdit}
        onCancelEdit={handleCancelEdit}
        onDelete={deleteMessage}
      />

      <div className="chat__bottom" ref={bottomRef}>
        {chat.type === 'direct' && <TypingIndicator visible={isPeerTyping} />}

        {replyTo && <ChatReplyPreview replyTo={replyTo} onCancel={cancelReply} />}

        <ChatInput
          input={input}
          setInput={handleInputChange}
          sendMessage={handleSend}
          isConnected={true}
          hasReply={!!replyTo}
          attachments={pendingAttachments}
          onAddAttachments={handleAddAttachments}
          onRemoveAttachment={handleRemoveAttachment}
        />
      </div>

      {isDragging && (
        <div className="chat__drop-overlay">
          <div className="chat__drop-overlay-text">Отпустите, чтобы прикрепить</div>
        </div>
      )}
    </div>
  );
};

export default Chat;
