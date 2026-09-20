import { useState, useEffect, useRef, useCallback } from 'react';
import { Square, PieceSymbol } from 'chess.js';
import {
  MultiplayerRoomState,
  PlayerColor,
  MultiplayerMessage,
  InitGamePayload,
  MovePayload,
} from '../types';
import {
  MultiplayerPeerService,
  generateRoomCode,
} from '../utils/multiplayerPeer';

export interface UseMultiplayerOptions {
  onOpponentMove?: (payload: MovePayload) => void;
  onGameInitialized?: (payload: InitGamePayload) => void;
  onOpponentResigned?: () => void;
  onDrawOffered?: () => void;
  onDrawAccepted?: () => void;
  onDrawDeclined?: () => void;
  onRematchRequested?: () => void;
  onRematchAccepted?: () => void;
  onOpponentDisconnected?: () => void;
}

export function useMultiplayer(options: UseMultiplayerOptions = {}) {
  const [roomState, setRoomState] = useState<MultiplayerRoomState>({
    roomId: null,
    role: null,
    myColor: 'w',
    opponentConnected: false,
    status: 'disconnected',
    errorMessage: null,
    pingMs: null,
  });

  const [drawOfferReceived, setDrawOfferReceived] = useState(false);
  const [rematchOfferReceived, setRematchOfferReceived] = useState(false);

  const peerServiceRef = useRef<MultiplayerPeerService | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  if (!peerServiceRef.current) {
    peerServiceRef.current = new MultiplayerPeerService();
  }

  // Handle incoming messages
  useEffect(() => {
    const service = peerServiceRef.current!;

    service.onMessage((msg: MultiplayerMessage) => {
      switch (msg.type) {
        case 'INIT_GAME': {
          const payload = msg.payload as InitGamePayload;
          optionsRef.current.onGameInitialized?.(payload);
          break;
        }
        case 'MOVE': {
          const payload = msg.payload as MovePayload;
          optionsRef.current.onOpponentMove?.(payload);
          break;
        }
        case 'RESIGN': {
          optionsRef.current.onOpponentResigned?.();
          break;
        }
        case 'OFFER_DRAW': {
          setDrawOfferReceived(true);
          optionsRef.current.onDrawOffered?.();
          break;
        }
        case 'ACCEPT_DRAW': {
          setDrawOfferReceived(false);
          optionsRef.current.onDrawAccepted?.();
          break;
        }
        case 'DECLINE_DRAW': {
          setDrawOfferReceived(false);
          optionsRef.current.onDrawDeclined?.();
          break;
        }
        case 'RESTART_REQUEST': {
          setRematchOfferReceived(true);
          optionsRef.current.onRematchRequested?.();
          break;
        }
        case 'RESTART_ACCEPT': {
          setRematchOfferReceived(false);
          optionsRef.current.onRematchAccepted?.();
          break;
        }
      }
    });

    service.onStatusChange((connected, error) => {
      setRoomState((prev) => ({
        ...prev,
        opponentConnected: connected,
        status: connected ? 'connected' : error ? 'error' : 'disconnected',
        errorMessage: error || null,
      }));
      if (!connected) {
        optionsRef.current.onOpponentDisconnected?.();
      }
    });

    service.onPingUpdate((ping) => {
      setRoomState((prev) => ({ ...prev, pingMs: ping }));
    });

    return () => {
      service.destroy();
    };
  }, []);

  // Host: Create a new room
  const createRoom = useCallback(
    (timeControl: number, preferredColor: PlayerColor | 'random' = 'random') => {
      const service = peerServiceRef.current!;
      const code = generateRoomCode();

      const hostColor: PlayerColor =
        preferredColor === 'random'
          ? Math.random() < 0.5
            ? 'w'
            : 'b'
          : preferredColor;
      const guestColor: PlayerColor = hostColor === 'w' ? 'b' : 'w';

      setRoomState({
        roomId: code,
        role: 'host',
        myColor: hostColor,
        opponentConnected: false,
        status: 'connecting',
        errorMessage: null,
        pingMs: null,
      });

      service.initHost(
        code,
        (readyCode) => {
          setRoomState((prev) => ({
            ...prev,
            roomId: readyCode,
            status: 'connecting',
          }));
        },
        () => {
          // Opponent connected! Send initial setup
          const initPayload: InitGamePayload = {
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            timeControl,
            hostColor,
            guestColor,
          };
          service.sendMessage('INIT_GAME', initPayload);
          setRoomState((prev) => ({
            ...prev,
            opponentConnected: true,
            status: 'connected',
          }));
          optionsRef.current.onGameInitialized?.(initPayload);
        },
        (error) => {
          setRoomState((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: error,
          }));
        }
      );
    },
    []
  );

  // Guest: Join an existing room
  const joinRoom = useCallback((roomCode: string) => {
    const service = peerServiceRef.current!;
    const cleanCode = roomCode.toUpperCase().trim();

    setRoomState({
      roomId: cleanCode,
      role: 'guest',
      myColor: 'b', // Host will dictate actual assigned color via INIT_GAME
      opponentConnected: false,
      status: 'connecting',
      errorMessage: null,
      pingMs: null,
    });

    service.joinGuest(
      cleanCode,
      () => {
        setRoomState((prev) => ({
          ...prev,
          opponentConnected: true,
          status: 'connected',
        }));
      },
      (error) => {
        setRoomState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: error,
        }));
      }
    );
  }, []);

  // Send move to opponent
  const sendMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol, san?: string) => {
      const service = peerServiceRef.current!;
      service.sendMessage('MOVE', {
        from,
        to,
        promotion,
        san: san || '',
      });
    },
    []
  );

  // Resign
  const sendResign = useCallback(() => {
    peerServiceRef.current?.sendMessage('RESIGN', null);
  }, []);

  // Draw offers
  const sendDrawOffer = useCallback(() => {
    peerServiceRef.current?.sendMessage('OFFER_DRAW', null);
  }, []);

  const acceptDraw = useCallback(() => {
    peerServiceRef.current?.sendMessage('ACCEPT_DRAW', null);
    setDrawOfferReceived(false);
  }, []);

  const declineDraw = useCallback(() => {
    peerServiceRef.current?.sendMessage('DECLINE_DRAW', null);
    setDrawOfferReceived(false);
  }, []);

  // Rematch
  const sendRematchRequest = useCallback(() => {
    peerServiceRef.current?.sendMessage('RESTART_REQUEST', null);
  }, []);

  const acceptRematch = useCallback(() => {
    peerServiceRef.current?.sendMessage('RESTART_ACCEPT', null);
    setRematchOfferReceived(false);
  }, []);

  // Leave / Disconnect
  const leaveRoom = useCallback(() => {
    peerServiceRef.current?.destroy();
    setRoomState({
      roomId: null,
      role: null,
      myColor: 'w',
      opponentConnected: false,
      status: 'disconnected',
      errorMessage: null,
      pingMs: null,
    });
    setDrawOfferReceived(false);
    setRematchOfferReceived(false);
  }, []);

  return {
    roomState,
    drawOfferReceived,
    rematchOfferReceived,
    createRoom,
    joinRoom,
    sendMove,
    sendResign,
    sendDrawOffer,
    acceptDraw,
    declineDraw,
    sendRematchRequest,
    acceptRematch,
    leaveRoom,
    setMyColor: (color: PlayerColor) => {
      setRoomState((prev) => ({ ...prev, myColor: color }));
    },
  };
}
