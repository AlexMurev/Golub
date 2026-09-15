import { WebSocket } from 'ws';
import { createServer, TransportServer, HelloPayload } from './server';
import { createClient, TransportClient } from './client';
import {
  getSelf,
  getUser,
  listUsers,
  ensureUser,
  updateUserAddress
} from '../db/repositories/usersRepo';
import { getMyLanAddress } from './net';

export interface MyInfo {
  peerId: string;
  nickname: string;
  avatar: string | null;
  address: string;
}

let server: TransportServer | null = null;
let client: TransportClient | null = null;
let myInfo: MyInfo | null = null;
let autoConnectTimer: NodeJS.Timeout | null = null;

const activeConnections = new Map<string, { ws: WebSocket; direction: 'in' | 'out' }>();

// Подписчики
const messageListeners: ((from: string, payload: unknown) => void)[] = [];
const onlineListeners: ((peerId: string) => void)[] = [];
const offlineListeners: ((peerId: string) => void)[] = [];
const newPeerListeners: ((peerId: string) => void)[] = [];
const peerUpdatedListeners: ((peerId: string) => void)[] = [];
export const onPeerUpdated = (cb: (peerId: string) => void): void => {
  peerUpdatedListeners.push(cb);
};
function notifyPeerUpdated(peerId: string): void {
  for (const cb of peerUpdatedListeners) cb(peerId);
}
export const onMessage = (cb: (from: string, payload: unknown) => void): void => {
  messageListeners.push(cb);
};
export const onPeerOnline = (cb: (peerId: string) => void): void => {
  onlineListeners.push(cb);
};
export const onPeerOffline = (cb: (peerId: string) => void): void => {
  offlineListeners.push(cb);
};
export const onNewPeer = (cb: (peerId: string) => void): void => {
  newPeerListeners.push(cb);
};

export function getMyInfo(): MyInfo | null {
  return myInfo;
}

export function isConnectedTo(peerId: string): boolean {
  return activeConnections.has(peerId);
}

export function listActiveConnections(): { peerId: string; direction: 'in' | 'out' }[] {
  return Array.from(activeConnections.entries()).map(([peerId, c]) => ({
    peerId,
    direction: c.direction
  }));
}

// =============================================================================
// Start / stop
// =============================================================================

export async function startTransport(port: number): Promise<{ port: number; address: string }> {
  const self = getSelf();
  if (!self) throw new Error('Self user is not initialized');

  server = createServer({
    onPeerHello: handleIncomingHello,
    onPeerMessage: handleIncomingMessage,
    onPeerDisconnect: handlePeerDisconnect,
    onPeerConnect: (): void => {}
  });

  const actualPort = await server.listen(port);
  const ip = getMyLanAddress();
  const address = ip ? `${ip}:${actualPort}` : `127.0.0.1:${actualPort}`;

  client = createClient({
    onPeerConnect: (peerId, ws): void => registerConnection(peerId, ws, 'out'),
    onPeerMessage: handleIncomingMessage,
    onPeerDisconnect: handlePeerDisconnect
  });

  myInfo = {
    peerId: self.peerId,
    nickname: self.nickname,
    avatar: self.avatar,
    address
  };

  client.setHello({ ...myInfo });

  // Автоподключение ко всем известным контактам сразу и периодически
  setTimeout((): void => {
    void autoConnectAll();
  }, 500);

  if (autoConnectTimer) clearInterval(autoConnectTimer);
  autoConnectTimer = setInterval((): void => {
    void autoConnectAll();
  }, 30_000);

  console.log(`Transport started: ${address}`);
  return { port: actualPort, address };
}

export async function startTransportAuto(
  preferredPort: number
): Promise<{ port: number; address: string }> {
  try {
    return await startTransport(preferredPort);
  } catch {
    console.warn(`Port ${preferredPort} busy, using random`);
    return await startTransport(0);
  }
}

export function stopTransport(): void {
  if (autoConnectTimer) {
    clearInterval(autoConnectTimer);
    autoConnectTimer = null;
  }
  client?.closeAll();
  server?.close();
  activeConnections.clear();
  client = null;
  server = null;
  myInfo = null;
}

export function refreshMyInfo(): void {
  if (!client || !myInfo) return;
  const self = getSelf();
  if (!self) return;
  myInfo = {
    peerId: self.peerId,
    nickname: self.nickname,
    avatar: self.avatar,
    address: myInfo.address
  };
  client.setHello({ ...myInfo });
  // Разослать обновлённое hello всем активным соединениям
  for (const peerId of activeConnections.keys()) {
    doSend(peerId, { type: 'hello', ...myInfo });
  }
}

// =============================================================================
// Send
// =============================================================================

export async function sendTo(peerId: string, payload: unknown): Promise<boolean> {
  if (!client || !myInfo || peerId === myInfo.peerId) return false;

  if (activeConnections.has(peerId)) return doSend(peerId, payload);

  const user = getUser(peerId);
  if (!user?.address) return false;

  const ok = await client.ensureConnection(peerId, user.address);
  return ok ? doSend(peerId, payload) : false;
}

export function broadcast(payload: unknown): void {
  for (const peerId of activeConnections.keys()) doSend(peerId, payload);
}

function doSend(peerId: string, payload: unknown): boolean {
  const conn = activeConnections.get(peerId);
  if (!conn || conn.ws.readyState !== WebSocket.OPEN) return false;
  try {
    conn.ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Автоподключение
// =============================================================================

async function autoConnectAll(): Promise<void> {
  if (!client || !myInfo) return;
  for (const u of listUsers()) {
    if (!u.address) continue;
    if (activeConnections.has(u.peerId)) continue;
    try {
      await client.ensureConnection(u.peerId, u.address);
    } catch {
      // peer offline — молча, повторим через 30 сек
    }
  }
}

// =============================================================================
// Внутренние обработчики
// =============================================================================

function handleIncomingHello(hello: HelloPayload, ws: WebSocket): void {
  if (!myInfo || hello.peerId === myInfo.peerId) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    return;
  }

  const isNew = !getUser(hello.peerId);
  const existing = getUser(hello.peerId);
  ensureUser(hello.peerId, hello.nickname, hello.avatar);
  if (hello.address) updateUserAddress(hello.peerId, hello.address);

  if (isNew) {
    for (const cb of newPeerListeners) cb(hello.peerId);
  } else if (
    existing &&
    (existing.nickname !== hello.nickname || existing.avatar !== hello.avatar)
  ) {
    notifyPeerUpdated(hello.peerId);
  }

  registerConnection(hello.peerId, ws, 'in');

  const active = activeConnections.get(hello.peerId);
  if (!active || active.direction !== 'out') {
    try {
      ws.send(JSON.stringify({ type: 'hello', ...myInfo }));
    } catch {
      /* ignore */
    }
  }
}

function handleIncomingMessage(peerId: string, payload: unknown): void {
  const p = payload as { type?: string; [k: string]: unknown };

  if (p.type === 'hello') {
    const hello = payload as HelloPayload & { type: 'hello' };
    const existing = getUser(hello.peerId);
    ensureUser(hello.peerId, hello.nickname, hello.avatar);
    if (hello.address) updateUserAddress(hello.peerId, hello.address);
    if (existing && (existing.nickname !== hello.nickname || existing.avatar !== hello.avatar)) {
      notifyPeerUpdated(hello.peerId);
    }
    return;
  }

  for (const cb of messageListeners) {
    try {
      cb(peerId, payload);
    } catch (err) {
      console.error('Message listener error:', err);
    }
  }
}

function handlePeerDisconnect(peerId: string): void {
  if (!activeConnections.has(peerId)) return;
  activeConnections.delete(peerId);
  for (const cb of offlineListeners) cb(peerId);
}

// =============================================================================
// Коллизия: два соединения с одним пиром
// =============================================================================

function registerConnection(peerId: string, ws: WebSocket, direction: 'in' | 'out'): void {
  const existing = activeConnections.get(peerId);

  if (existing?.ws === ws) return;

  // Мёртвое или отсутствующее соединение — просто заменяем
  if (!existing || existing.ws.readyState !== WebSocket.OPEN) {
    const hadConnection = !!existing;
    activeConnections.set(peerId, { ws, direction });
    if (!hadConnection) {
      for (const cb of onlineListeners) cb(peerId);
    }
    return;
  }

  // Живая коллизия — детерминированное правило: меньший peerId держит 'out'
  const keep: 'in' | 'out' = myInfo && myInfo.peerId < peerId ? 'out' : 'in';

  if (existing.direction === keep) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    return;
  }

  if (direction === keep) {
    try {
      existing.ws.close();
    } catch {
      /* ignore */
    }
    activeConnections.set(peerId, { ws, direction });
    return;
  }

  try {
    ws.close();
  } catch {
    /* ignore */
  }
}
