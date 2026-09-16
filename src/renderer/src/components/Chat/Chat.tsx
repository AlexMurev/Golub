import React, { useState } from 'react';
import { ChatMessages } from './ChatMessages/ChatMessages';
import { ChatReplyPreview } from './ChatReplyPreview/ChatReplyPreview';
import { ChatInput } from './ChatInput/ChatInput';
import { ChatTopBar } from './ChatTopBar/ChatTopBar';
import { useMessages } from '@renderer/hooks/useMessages';
import { useSelf } from '@renderer/hooks/useSelf';
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

    arr.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onloadend = async (): Promise<void> => {
        if (typeof reader.result !== 'string') return;
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];

        const saved = await window.api.files.save(base64, file.name);
        if (!saved.success || !saved.filePath) {
          console.error('Failed to save file:', saved.error);
          return;
        }

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          messageId: '',
          fileName: file.name,
          mimeType: file.type || null,
          size: saved.size ?? file.size,
          filePath: saved.filePath,
          transferState: null,
          width: null,
          height: null,
          duration: null,
          orderIndex: pendingAttachments.length + idx,
          createdAt: Date.now(),
          deletedAt: null
        };

        const isImage = file.type.startsWith('image/');

        setPendingAttachments((prev) => [
          ...prev,
          { attachment, previewUrl: isImage ? dataUrl : null }
        ]);
      };
      reader.readAsDataURL(file);
    });
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
