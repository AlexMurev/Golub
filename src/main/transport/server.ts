import { WebSocketServer, WebSocket } from 'ws';

export interface HelloPayload {
  peerId: string;
  nickname: string;
  avatar: string | null;
  address: string;
}

export interface ServerCallbacks {
  onPeerHello: (hello: HelloPayload, ws: WebSocket) => void;
  onPeerMessage: (peerId: string, payload: unknown) => void;
  onPeerDisconnect: (peerId: string) => void;
  onPeerConnect: (peerId: string, ws: WebSocket) => void;
}

export interface TransportServer {
  listen: (port: number) => Promise<number>;
  getPort: () => number | null;
  close: () => void;
}

export function createServer(callbacks: ServerCallbacks): TransportServer {
  let wss: WebSocketServer | null = null;
  let currentPort: number | null = null;
  const socketToPeer = new WeakMap<WebSocket, string>();

  async function listen(port: number): Promise<number> {
    if (wss) close();

    return new Promise((resolve, reject) => {
      const server = new WebSocketServer({ port });

      server.on('listening', (): void => {
        const addr = server.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : port;
        currentPort = actualPort;
        console.log(`Transport server listening on port ${actualPort}`);
        resolve(actualPort);
      });

      server.on('error', (err): void => {
        console.error('Transport server error:', err);
        reject(err);
      });

      server.on('connection', (ws: WebSocket): void => {
        console.log('Incoming connection');

        ws.on('message', (raw: Buffer): void => {
          let msg: { type: string; [k: string]: unknown };
          try {
            msg = JSON.parse(raw.toString());
          } catch {
            console.error('Bad JSON from peer');
            return;
          }

          if (msg.type === 'hello') {
            const hello = msg as unknown as HelloPayload & { type: 'hello' };
            const peerId = hello.peerId;
            if (!peerId) return;

            socketToPeer.set(ws, peerId);
            callbacks.onPeerConnect(peerId, ws);
            callbacks.onPeerHello(hello, ws);
            return;
          }

          const peerId = socketToPeer.get(ws);
          if (!peerId) {
            console.warn('Message from unidentified peer, ignored');
            return;
          }
          callbacks.onPeerMessage(peerId, msg);
        });

        ws.on('close', (): void => {
          const peerId = socketToPeer.get(ws);
          if (peerId) {
            callbacks.onPeerDisconnect(peerId);
          }
        });

        ws.on('error', (err): void => {
          console.error('Peer socket error:', err);
        });
      });

      wss = server;
    });
  }

  function getPort(): number | null {
    return currentPort;
  }

  function close(): void {
    if (wss) {
      wss.close();
      wss = null;
      currentPort = null;
    }
  }

  return { listen, getPort, close };
}
