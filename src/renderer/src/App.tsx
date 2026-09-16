import { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import Chat from '@renderer/components/Chat/Chat';
import { Sidebar } from '@renderer/components/Sidebar/Sidebar';
import { EmptyState } from '@renderer/components/EmptyState/EmptyState';
import { Settings } from '@renderer/components/Settings/Settings';
import { AddContactModal } from '@renderer/components/AddContactModal/AddContactModal';
import { FriendRequestsModal } from '@renderer/components/FriendRequestsModal/FriendRequestsModal';
import { useSelf } from '@renderer/hooks/useSelf';
import { useContacts } from '@renderer/hooks/useContacts';
import { useChats } from '@renderer/hooks/useChats';
import { useMessages } from '@renderer/hooks/useMessages';
import { useMyAddress } from '@renderer/hooks/useMyAddress';
import type { ReplyPreview } from '@shared/types';
import './App.css';

function App(): React.JSX.Element {
  const { self, updateSelf, isLoading: isSelfLoading } = useSelf();
  const { incoming, outgoing, incomingCount, reload: reloadContacts } = useContacts();
  const { chats, currentChatId, selectChat, openDirectChat, reload: reloadChats } = useChats();
  const {
    messages,
    isLoading,
    hasMore,
    isLoadingOlder,
    firstItemIndex,
    loadOlder,
    sendMessage: sendMsg,
    editMessage: editMsg,
    deleteMessage
  } = useMessages(currentChatId, self?.peerId ?? null);

  const myAddress = useMyAddress();

  const [input, setInput] = useState<string>('');
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState<boolean>(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState<boolean>(false);

  if (isSelfLoading) {
    return (
      <div className="app-loading">
        <span>Загрузка...</span>
      </div>
    );
  }

  if (!self) {
    return (
      <div className="app-loading">
        <span>Ошибка: профиль не найден</span>
      </div>
    );
  }

  const currentChat = chats.find((c) => c.id === currentChatId) ?? null;

  const handleSend = async (): Promise<void> => {
    if (!input.trim()) return;
    await sendMsg(input, replyTo?.id ?? null);
    setReplyTo(null);
    setInput('');
  };

  const handleStartEdit = (id: string): void => {
    setEditingId(id);
    setReplyTo(null);
  };

  const handleSubmitEdit = async (id: string, text: string): Promise<void> => {
    await editMsg(id, text);
    setEditingId(null);
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
  };

  const handleSelectChat = (chatId: string): void => {
    setEditingId(null);
    setReplyTo(null);
    setInput('');
    selectChat(chatId);
  };

  const handleAddContact = async (address: string): Promise<void> => {
    const result = await window.api.db.users.addByAddress(address);
    if (!result.success || !result.contact) {
      throw new Error(result.error || 'Не удалось добавить контакт');
    }

    await reloadContacts();
    await reloadChats();

    if (result.contact.contactStatus === 'accepted') {
      await openDirectChat(result.contact.peerId);
    }
  };

  const handleAcceptRequest = async (peerId: string): Promise<void> => {
    await window.api.db.users.acceptRequest(peerId);
    await reloadContacts();
    await reloadChats();
    await openDirectChat(peerId);
  };

  const handleRejectRequest = async (peerId: string): Promise<void> => {
    await window.api.db.users.rejectRequest(peerId);
    await reloadContacts();
  };

  const handleCancelRequest = async (peerId: string): Promise<void> => {
    await window.api.db.users.cancelRequest(peerId);
    await reloadContacts();
  };

  const handleLoadOlder = (): void => {
    void loadOlder();
  };

  return (
    <div className="app-layout">
      <Group orientation="horizontal">
        <Panel
          defaultSize={300}
          minSize={220}
          maxSize={450}
          className="sidebar-panel"
          groupResizeBehavior="preserve-pixel-size"
        >
          <Sidebar
            chats={chats}
            currentChatId={currentChatId}
            nickname={self.nickname}
            avatar={self.avatar ?? undefined}
            isServerRunning={true}
            isConnected={true}
            incomingCount={incomingCount}
            onSelectChat={handleSelectChat}
            onAddContact={(): void => setIsAddContactOpen(true)}
            onOpenRequests={(): void => setIsRequestsOpen(true)}
            onOpenSettings={(): void => setIsSettingsOpen(true)}
          />
        </Panel>

        <Separator className="app-layout__resizer" />

        <Panel>
          {currentChat ? (
            <Chat
              chat={currentChat}
              messages={messages}
              myId={self.peerId}
              firstItemIndex={firstItemIndex}
              isLoading={isLoading}
              hasMore={hasMore}
              isLoadingOlder={isLoadingOlder}
              editingId={editingId}
              onLoadOlder={handleLoadOlder}
              input={input}
              setInput={setInput}
              sendMessage={handleSend}
              deleteMessage={deleteMessage}
              onStartEdit={handleStartEdit}
              onSubmitEdit={handleSubmitEdit}
              onCancelEdit={handleCancelEdit}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
            />
          ) : (
            <EmptyState />
          )}
        </Panel>
      </Group>

      <AddContactModal
        isOpen={isAddContactOpen}
        onClose={(): void => setIsAddContactOpen(false)}
        onSubmit={handleAddContact}
      />

      <FriendRequestsModal
        isOpen={isRequestsOpen}
        incoming={incoming}
        outgoing={outgoing}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
        onCancel={handleCancelRequest}
        onClose={(): void => setIsRequestsOpen(false)}
      />

      <Settings
        isOpen={isSettingsOpen}
        nickname={self.nickname}
        setNickname={(value: string): Promise<void> => updateSelf({ nickname: value })}
        avatar={self.avatar ?? undefined}
        setAvatar={(value: string): Promise<void> => updateSelf({ avatar: value })}
        userId={self.peerId}
        address={myAddress}
        onClose={(): void => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
