import { useState } from 'react';
import Chat, { Message } from '@renderer/components/Chat/Chat';
import { Settings } from '@renderer/components/Settings/Settings';
import { useUser } from '@renderer/hooks/useUser';
import './App.css';

function App(): React.JSX.Element {
  const [user, updateUser] = useUser();
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [serverAddress, setServerAddress] = useState('ws://localhost:8080');
  const [replyTo, setReplyTo] = useState<NonNullable<Message['replyTo']> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    newWs.onopen = () => {
      console.log('Подключено к серверу');
      setWs(newWs);
    };
    newWs.onmessage = (event) => {
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
    newWs.onclose = () => {
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
        text: input,
        replyTo: replyTo || undefined
      };
      ws.send(JSON.stringify({ type: 'message', payload: message }));
      setMessages((prev) => [...prev, message]);
      setInput('');
      setReplyTo(null);
    }
  };

  return (
    <>
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
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {isSettingsOpen && (
        <Settings
          nickname={user.nickname}
          setNickname={(value) => updateUser({ nickname: value })}
          userId={user.id}
          serverAddress={serverAddress}
          setServerAddress={setServerAddress}
          isServerRunning={isServerRunning}
          startServer={startServer}
          connectToServer={connectToServer}
          isConnected={ws !== null}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
}

export default App;
