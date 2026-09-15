import { WebSocket } from 'ws';

export interface ClientHello {
  peerId: string;
  nickname: string;
  avatar: string | null;
  address: string;
}

export interface ClientCallbacks {
  onPeerMessage: (peerId: string, payload: unknown) => void;
  onPeerDisconnect: (peerId: string) => void;
  onPeerConnect: (peerId: string, ws: WebSocket) => void;
}

export interface TransportClient {
  send: (peerId: string, payload: unknown) => boolean;
  ensureConnection: (peerId: string, address: string) => Promise<boolean>;
  closeConnection: (peerId: string) => void;
  closeAll: () => void;
  isConnected: (peerId: string) => boolean;
  getHello: () => ClientHello | null;
  setHello: (hello: ClientHello) => void;
}

export function createClient(callbacks: ClientCallbacks): TransportClient {
  const connections = new Map<string, WebSocket>();
  const pending = new Map<string, Promise<boolean>>();
  let hello: ClientHello | null = null;
  let reconnectEnabled = true;

  function setHello(h: ClientHello): void {
    hello = h;
  }

  function getHello(): ClientHello | null {
    return hello;
  }

  function isConnected(peerId: string): boolean {
    const ws = connections.get(peerId);
    return !!ws && ws.readyState === WebSocket.OPEN;
  }

  function send(peerId: string, payload: unknown): boolean {
    const ws = connections.get(peerId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error(`Send to ${peerId} failed:`, err);
      return false;
    }
  }

  function closeConnection(peerId: string): void {
    const ws = connections.get(peerId);
    if (ws) {
      connections.delete(peerId);
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  }

  function closeAll(): void {
    reconnectEnabled = false;
    for (const peerId of Array.from(connections.keys())) {
      closeConnection(peerId);
    }
  }

  function ensureConnection(peerId: string, address: string): Promise<boolean> {
    if (isConnected(peerId)) return Promise.resolve(true);

    const existing = pending.get(peerId);
    if (existing) return existing;

    const promise = openConnection(peerId, address).finally((): void => {
      pending.delete(peerId);
    });
    pending.set(peerId, promise);
    return promise;
  }

  function openConnection(peerId: string, address: string): Promise<boolean> {
    return new Promise((resolve): void => {
      if (!hello) {
        console.error('Cannot connect: hello not set');
        resolve(false);
        return;
      }

      const url =
        address.startsWith('ws://') || address.startsWith('wss://') ? address : `ws://${address}`;

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        console.error(`Cannot open WS to ${peerId} (${url}):`, err);
        resolve(false);
        return;
      }

      let resolved = false;
      const finish = (ok: boolean): void => {
        if (resolved) return;
        resolved = true;
        resolve(ok);
      };

      const timeout = setTimeout((): void => {
        console.warn(`Connection to ${peerId} timed out`);
        try {
          ws.terminate();
        } catch {
          // ignore
        }
        finish(false);
      }, 8000);

      ws.on('open', (): void => {
        clearTimeout(timeout);
        try {
          ws.send(JSON.stringify({ type: 'hello', ...hello }));
        } catch (err) {
          console.error('Failed to send hello:', err);
          finish(false);
          return;
        }
        connections.set(peerId, ws);
        callbacks.onPeerConnect(peerId, ws);
        console.log(`Connected to ${peerId} at ${url}`);
        finish(true);
      });

      ws.on('message', (raw: Buffer): void => {
        let msg: unknown;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          console.error('Bad JSON from server peer');
          return;
        }
        callbacks.onPeerMessage(peerId, msg);
      });

      ws.on('close', (): void => {
        clearTimeout(timeout);
        const wasConnected = connections.get(peerId) === ws;
        if (wasConnected) {
          connections.delete(peerId);
          callbacks.onPeerDisconnect(peerId);
        }
        finish(false);

        // Простой реконнект с задержкой
        if (reconnectEnabled && wasConnected) {
          setTimeout((): void => {
            if (reconnectEnabled && !connections.has(peerId)) {
              void ensureConnection(peerId, address);
            }
          }, 5000);
        }
      });

      ws.on('error', (err): void => {
        console.error(`WS error to ${peerId}:`, err.message);
        // 'close' event всегда идёт после 'error', так что finish будет там
      });
    });
  }

  return {
    send,
    ensureConnection,
    closeConnection,
    closeAll,
    isConnected,
    getHello,
    setHello
  };
}
