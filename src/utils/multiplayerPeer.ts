import { Peer, DataConnection } from 'peerjs';
import { MultiplayerMessage, MultiplayerMessageType } from '../types';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatPeerId(roomCode: string): string {
  return `chess-3d-live-${roomCode.toUpperCase().trim()}`;
}

export function extractRoomCode(peerId: string): string {
  return peerId.replace('chess-3d-live-', '');
}

export class MultiplayerPeerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private pingInterval: number | null = null;
  private onMessageCallback: ((msg: MultiplayerMessage) => void) | null = null;
  private onStatusChangeCallback: ((connected: boolean, error?: string) => void) | null = null;
  private onPingUpdateCallback: ((pingMs: number) => void) | null = null;

  public initHost(
    roomCode: string,
    onReady: (id: string) => void,
    onOpponentConnect: () => void,
    onError: (err: string) => void
  ) {
    this.destroy();

    const peerId = formatPeerId(roomCode);
    this.peer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    this.peer.on('open', (id) => {
      onReady(extractRoomCode(id));
    });

    this.peer.on('connection', (conn) => {
      if (this.connection) {
        // If already connected to an opponent, reject third connections
        conn.close();
        return;
      }
      this.setupConnection(conn, onOpponentConnect);
    });

    this.peer.on('error', (err) => {
      let message = 'Connection error';
      if (err.type === 'unavailable-id') {
        message = 'Room code is already active. Please try a different code.';
      } else if (err.type === 'peer-unavailable') {
        message = 'Room not found. Please verify the code.';
      } else if (err.message) {
        message = err.message;
      }
      onError(message);
    });
  }

  public joinGuest(
    roomCode: string,
    onConnected: () => void,
    onError: (err: string) => void
  ) {
    this.destroy();

    // Guest gets an auto-generated random ID
    this.peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    this.peer.on('open', () => {
      const targetHostId = formatPeerId(roomCode);
      const conn = this.peer!.connect(targetHostId, {
        reliable: true,
      });

      this.setupConnection(conn, onConnected);
    });

    this.peer.on('error', (err) => {
      let message = 'Connection error';
      if (err.type === 'peer-unavailable') {
        message = 'Room not found or host disconnected. Check the code.';
      } else if (err.message) {
        message = err.message;
      }
      onError(message);
    });
  }

  private setupConnection(conn: DataConnection, onOpenCallback: () => void) {
    this.connection = conn;

    conn.on('open', () => {
      this.onStatusChangeCallback?.(true);
      onOpenCallback();
      this.startHeartbeat();
    });

    conn.on('data', (data: any) => {
      try {
        const msg = data as MultiplayerMessage;
        if (msg.type === 'PING') {
          this.sendMessage('PONG', null);
        } else if (msg.type === 'PONG') {
          const latency = Date.now() - msg.timestamp;
          this.onPingUpdateCallback?.(latency);
        } else {
          this.onMessageCallback?.(msg);
        }
      } catch (err) {
        console.error('Failed to parse peer message:', err);
      }
    });

    conn.on('close', () => {
      this.stopHeartbeat();
      this.onStatusChangeCallback?.(false);
      this.connection = null;
    });

    conn.on('error', (err) => {
      console.error('Data connection error:', err);
      this.onStatusChangeCallback?.(false, err.message);
    });
  }

  public sendMessage(type: MultiplayerMessageType, payload: any) {
    if (this.connection && this.connection.open) {
      const msg: MultiplayerMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };
      this.connection.send(msg);
    }
  }

  public onMessage(callback: (msg: MultiplayerMessage) => void) {
    this.onMessageCallback = callback;
  }

  public onStatusChange(callback: (connected: boolean, error?: string) => void) {
    this.onStatusChangeCallback = callback;
  }

  public onPingUpdate(callback: (pingMs: number) => void) {
    this.onPingUpdateCallback = callback;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.connection && this.connection.open) {
        this.sendMessage('PING', null);
      }
    }, 4000);
  }

  private stopHeartbeat() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public destroy() {
    this.stopHeartbeat();
    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }
}
