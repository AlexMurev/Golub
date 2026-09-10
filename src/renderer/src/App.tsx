import { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import Chat, { Message } from '@renderer/components/Chat/Chat';
import { Settings } from '@renderer/components/Settings/Settings';
import { UserBar } from '@renderer/components/UserBar/UserBar';
import { useUser } from '@renderer/hooks/useUser';
import './App.css';

function App(): React.JSX.Element {
  const [user, updateUser] = useUser();
  const [isServerRunning, setIsServerRunning] = useState<boolean>(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [serverAddress, setServerAddress] = useState<string>('ws://localhost:8080');
  const [replyTo, setReplyTo] = useState<NonNullable<Message['replyTo']> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const startServer = async (): Promise<void> => {
    const result = await window.api.startServer(8080);
    if (result.success) {
      setIsServerRunning(true);
      connectToServer();
    } else {
      alert('Ошибка: ' + result.error);
    }
  };

  const connectToServer = (): void => {
    if (ws) {
      ws.close();
      setWs(null);
      return;
    }
    const newWs = new WebSocket(serverAddress);
    newWs.onopen = (): void => {
      console.log('Подключено к серверу');
      setWs(newWs);
    };
    newWs.onmessage = (event: MessageEvent): void => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          const incoming: Message = data.payload;
          if (incoming.senderId === user.id) return;
          setMessages((prev) => [...prev, incoming]);
        }
      } catch (e) {
        console.error('Ошибка парсинга входящего сообщения:', e);
      }
    };
    newWs.onclose = (): void => {
      console.log('Отключено от сервера');
      setWs(null);
    };
  };

  const sendMessage = (): void => {
    if (ws && input.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        senderId: user.id,
        senderNickname: user.nickname,
        senderAvatar: user.avatar,
        text: input,
        createdAt: Date.now(),
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderId: replyTo.senderId,
              senderNickname: replyTo.senderNickname,
              senderAvatar: replyTo.senderAvatar,
              text: replyTo.text
            }
          : undefined
      };
      ws.send(JSON.stringify({ type: 'message', payload: message }));
      setMessages((prev) => [...prev, message]);
      setInput('');
      setReplyTo(null);
    }
  };

  return (
    <div className="app-layout">
      <Group orientation="horizontal">
        <Panel
          defaultSize={250}
          minSize={250}
          maxSize={400}
          className="sidebar-panel"
          groupResizeBehavior="preserve-pixel-size"
        >
          <div className="sidebar">
            <div className="sidebar__contacts">{/* Будущий список контактов */}</div>

            <UserBar
              nickname={user.nickname}
              avatar={user.avatar}
              isServerRunning={isServerRunning}
              isConnected={ws !== null}
              onOpenSettings={(): void => setIsSettingsOpen(true)}
            />
          </div>
        </Panel>

        <Separator className="sidebar-resizer" />

        <Panel className="chat-panel">
          <Chat
            messages={messages}
            myId={user.id}
            nickname={user.nickname}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            isServerRunning={isServerRunning}
            isConnected={ws !== null}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            onOpenSettings={(): void => setIsSettingsOpen(true)}
          />
        </Panel>
      </Group>

      {isSettingsOpen && (
        <Settings
          nickname={user.nickname}
          setNickname={(value: string): void => updateUser({ nickname: value })}
          avatar={user.avatar}
          setAvatar={(value: string): void => updateUser({ avatar: value })}
          userId={user.id}
          serverAddress={serverAddress}
          setServerAddress={setServerAddress}
          isServerRunning={isServerRunning}
          startServer={startServer}
          connectToServer={connectToServer}
          isConnected={ws !== null}
          onClose={(): void => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
