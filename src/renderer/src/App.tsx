import { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import Chat from '@renderer/components/Chat/Chat';
import { Sidebar } from '@renderer/components/Sidebar/Sidebar';
import { EmptyState } from '@renderer/components/EmptyState/EmptyState';
import { Settings } from '@renderer/components/Settings/Settings';
import { AddContactModal } from '@renderer/components/AddContactModal/AddContactModal';
import { FriendRequestsModal } from '@renderer/components/FriendRequestsModal/FriendRequestsModal';
import { useSelf } from '@renderer/hooks/useSelf';
import { useChats } from '@renderer/hooks/useChats';
import './App.css';
import { useNotifications } from './hooks/useNotifications';

function App(): React.JSX.Element {
  useNotifications();
  const { self, isLoading: isSelfLoading } = useSelf();
  const { chats, currentChatId } = useChats();

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
            onAddContact={(): void => setIsAddContactOpen(true)}
            onOpenRequests={(): void => setIsRequestsOpen(true)}
            onOpenSettings={(): void => setIsSettingsOpen(true)}
          />
        </Panel>

        <Separator className="app-layout__resizer" />

        <Panel>
          {currentChat ? <Chat key={currentChat.id} chat={currentChat} /> : <EmptyState />}
        </Panel>
      </Group>

      <AddContactModal isOpen={isAddContactOpen} onClose={(): void => setIsAddContactOpen(false)} />

      <FriendRequestsModal isOpen={isRequestsOpen} onClose={(): void => setIsRequestsOpen(false)} />

      <Settings isOpen={isSettingsOpen} onClose={(): void => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;
