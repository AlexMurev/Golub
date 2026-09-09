import { useState } from 'react';
import Chat from '@renderer/components/Chat/Chat';
import './App.css';

interface Message {
  id: string;
  sender: string; // отображаемое имя (будет 'Я' или 'Собеседник')
  senderId: string; // уникальный идентификатор отправителя
  text: string;
  replyTo?: {
    id: string;
    sender: string;
    text: string;
  };
}

function App(): React.JSX.Element {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [serverAddress, setServerAddress] = useState('ws://localhost:8080');
  const [replyTo, setReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [myId] = useState<string>(() => 'user-' + Math.random().toString(36).substring(2, 10));

  const startServer = async (): Promise<void> => {
    const result = await window.api.startServer(8080);
    if (result.success) {
      setIsServerRunning(true);
      alert('Сервер запущен на порту 8080');
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
          const incoming = data.payload;
          // Если сообщение от нас – игнорируем (уже добавили локально)
          if (incoming.senderId === myId) {
            return;
          }
          // Чужое сообщение – меняем sender на 'Собеседник'
          setMessages((prev) => [...prev, { ...incoming, sender: 'Собеседник' }]);
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
        sender: 'Я',
        senderId: myId,
        text: input,
        replyTo: replyTo || undefined
      };
      const payload = {
        type: 'message',
        payload: message
      };
      ws.send(JSON.stringify(payload));
      setMessages((prev) => [...prev, message]);
      setInput('');
      setReplyTo(null);
    }
  };

  return (
    <Chat
      messages={messages}
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      serverAddress={serverAddress}
      setServerAddress={setServerAddress}
      isServerRunning={isServerRunning}
      startServer={startServer}
      connectToServer={connectToServer}
      isConnected={ws !== null}
      replyTo={replyTo}
      setReplyTo={setReplyTo}
    />
  );
}

export default App;
