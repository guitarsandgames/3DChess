/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Square, PieceSymbol } from 'chess.js';
import { Chess3DCanvas } from './components/Chess3DCanvas';
import { GameHeader } from './components/GameHeader';
import { GameControls } from './components/GameControls';
import { MoveHistory } from './components/MoveHistory';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { RulesModal } from './components/RulesModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import {
  GameMode,
  AIDifficulty,
  PlayerColor,
  CameraPreset,
  MoveRecord,
} from './types';
import { useChessGame } from './hooks/useChessGame';
import { useChessClock } from './hooks/useChessClock';
import { useMultiplayer } from './hooks/useMultiplayer';
import { getBestMove, clearTranspositionTable } from './utils/aiBot';
import { soundManager } from './utils/audio';

export default function App() {
  // Game Configuration State
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('intermediate');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [themeId, setThemeId] = useState<string>('classic-wood');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('white');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [timeControl, setTimeControl] = useState<number>(0); // 0 = untimed
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // UI Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState<boolean>(false);
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  // Keep references for callbacks
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;

  // Sync sound settings with soundManager singleton
  useEffect(() => {
    soundManager.enabled = soundEnabled;
  }, [soundEnabled]);

  // Modular Chess Game Hook
  const chessGame = useChessGame({
    soundEnabled,
    onMoveExecuted: (move: MoveRecord) => {
      if (timeControl > 0) {
        startClock();
      }
      // If we are in multiplayer mode and this was our move, transmit it to peer
      if (gameModeRef.current === 'multiplayer' && move.color === multiplayer.roomState.myColor) {
        multiplayer.sendMove(move.from, move.to, move.promotion, move.san);
      }
    },
  });

  // Modular Chess Clock Hook
  const {
    clock,
    setTimeControl: setClockTimeControl,
    startClock,
    resetClock,
  } = useChessClock({
    initialTimeControl: timeControl,
    activeColor: chessGame.turn,
    isGameActive: !chessGame.isGameOver && chessGame.moveHistory.length > 0,
    onTimeout: (timedOutColor) => {
      chessGame.handleTimeout(timedOutColor);
    },
  });

  // Reset / New Game
  const handleResetGame = useCallback(
    (newMode?: GameMode, newColor?: PlayerColor, newTime?: number) => {
      clearTranspositionTable();
      chessGame.resetGame();

      const tc = newTime !== undefined ? newTime : timeControl;
      resetClock(tc);

      if (newMode) setGameMode(newMode);
      const color = newColor || playerColor;
      if (newColor) setPlayerColor(color);

      setIsFlipped(color === 'b');
      setCameraPreset(color === 'b' ? 'black' : 'white');
      setIsThinking(false);
    },
    [chessGame, resetClock, timeControl, playerColor]
  );

  // Modular Peer-to-Peer Multiplayer Hook
  const multiplayer = useMultiplayer({
    onOpponentMove: (payload) => {
      chessGame.executeMove(payload.from, payload.to, payload.promotion);
    },
    onGameInitialized: (payload) => {
      setGameMode('multiplayer');
      const myAssignedColor =
        multiplayer.roomState.role === 'host' ? payload.hostColor : payload.guestColor;
      multiplayer.setMyColor(myAssignedColor);
      setPlayerColor(myAssignedColor);
      setTimeControl(payload.timeControl);
      setClockTimeControl(payload.timeControl);
      handleResetGame('multiplayer', myAssignedColor, payload.timeControl);
    },
    onOpponentResigned: () => {
      chessGame.setIsGameOver(true);
      soundManager.playVictory();
    },
    onDrawOffered: () => {
      soundManager.playSelect();
    },
    onDrawAccepted: () => {
      chessGame.setIsGameOver(true);
      soundManager.playVictory();
    },
    onRematchAccepted: () => {
      handleResetGame('multiplayer', multiplayer.roomState.myColor, timeControl);
    },
  });

  // URL query parameter room check: auto-open multiplayer join modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam);
      setIsMultiplayerOpen(true);
    }
  }, []);

  // Autonomous AI Turn Scheduling (Only for 'ai' mode)
  useEffect(() => {
    if (gameMode !== 'ai' || chessGame.isGameOver || chessGame.pendingPromotion) return;

    const currentTurn = chessGame.turn;
    const isAITurn = currentTurn !== playerColor;

    if (isAITurn && !chessGame.chessInstance.isGameOver()) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        const bestMove = getBestMove(chessGame.chessInstance, aiDifficulty);
        if (bestMove) {
          chessGame.executeMove(bestMove.from, bestMove.to, bestMove.promotion);
        }
        setIsThinking(false);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [
    chessGame.turn,
    chessGame.isGameOver,
    chessGame.pendingPromotion,
    chessGame.chessInstance,
    chessGame.executeMove,
    gameMode,
    playerColor,
    aiDifficulty,
  ]);

  // Handle Square Selection & Moves from 3D Board
  const handleSquareClick = (square: Square) => {
    if (chessGame.isGameOver || isThinking) return;

    // Turn & Player Color Locking
    if (gameMode === 'ai' && chessGame.turn !== playerColor) {
      return;
    }

    if (gameMode === 'multiplayer') {
      if (!multiplayer.roomState.opponentConnected) return;
      if (chessGame.turn !== multiplayer.roomState.myColor) return;
    }

    const clickedPiece = chessGame.chessInstance.get(square);

    // Case 1: Square has active player's piece -> Select / toggle selection
    if (clickedPiece && clickedPiece.color === chessGame.turn) {
      if (gameMode === 'multiplayer' && clickedPiece.color !== multiplayer.roomState.myColor) {
        return;
      }
      chessGame.selectSquare(square);
      return;
    }

    // Case 2: A piece is already selected -> Attempt legal move
    if (chessGame.selectedSquare) {
      const isLegal = chessGame.validMoves.some((m) => m.to === square);
      if (isLegal) {
        chessGame.tryMove(chessGame.selectedSquare, square);
      } else {
        chessGame.selectSquare(null);
      }
    }
  };

  // Move Undo
  const handleUndo = () => {
    if (chessGame.moveHistory.length === 0 || isThinking || gameMode === 'multiplayer') return;
    const steps = gameMode === 'ai' && chessGame.moveHistory.length >= 2 ? 2 : 1;
    chessGame.undoMove(steps);
  };

  // Multiplayer Actions
  const handleResign = () => {
    if (gameMode === 'multiplayer') {
      multiplayer.sendResign();
      chessGame.setIsGameOver(true);
    }
  };

  const handleOfferDraw = () => {
    if (gameMode === 'multiplayer') {
      multiplayer.sendDrawOffer();
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* Top Navigation Bar */}
      <GameHeader
        onNewGame={() => handleResetGame()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenMultiplayer={() => setIsMultiplayerOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
        gameMode={gameMode}
        multiplayerStatus={{
          inRoom: !!multiplayer.roomState.roomId,
          code: multiplayer.roomState.roomId,
          connected: multiplayer.roomState.opponentConnected,
          ping: multiplayer.roomState.pingMs,
        }}
      />

      {/* Main Viewport + Sidebar Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 3D Chess Stage */}
        <div className="flex-1 relative h-full">
          <Chess3DCanvas
            game={chessGame.chessInstance}
            themeId={themeId}
            cameraPreset={cameraPreset}
            selectedSquare={chessGame.selectedSquare}
            validMoves={chessGame.validMoves}
            lastMove={chessGame.lastMove}
            onSquareClick={handleSquareClick}
            isThinking={isThinking}
            flipped={isFlipped}
          />

          {/* Floating Camera Controls Toolbar */}
          <GameControls
            cameraPreset={cameraPreset}
            onSelectCamera={(preset) => setCameraPreset(preset)}
            flipped={isFlipped}
            onToggleFlip={() => setIsFlipped((prev) => !prev)}
          />
        </div>

        {/* Move History & Stats Sidebar */}
        <div
          className={`h-full transition-all duration-300 ease-in-out z-20 ${
            showSidebar
              ? 'w-80 md:w-88 border-l border-neutral-800'
              : 'w-0 overflow-hidden border-none'
          }`}
        >
          <MoveHistory
            game={chessGame.chessInstance}
            moves={chessGame.moveHistory}
            captured={chessGame.captured}
            clock={clock}
            isThinking={isThinking}
            onUndo={handleUndo}
            canUndo={chessGame.moveHistory.length > 0 && gameMode !== 'multiplayer'}
            gameMode={gameMode}
            aiDifficulty={aiDifficulty}
            onSetAIDifficulty={(diff) => setAIDifficulty(diff)}
            multiplayerProps={
              gameMode === 'multiplayer'
                ? {
                    role: multiplayer.roomState.role,
                    myColor: multiplayer.roomState.myColor,
                    opponentConnected: multiplayer.roomState.opponentConnected,
                    onResign: handleResign,
                    onOfferDraw: handleOfferDraw,
                    drawOffered: multiplayer.drawOfferReceived,
                    onAcceptDraw: () => {
                      multiplayer.acceptDraw();
                      chessGame.setIsGameOver(true);
                    },
                    onDeclineDraw: () => multiplayer.declineDraw(),
                  }
                : undefined
            }
          />
        </div>
      </div>

      {/* Pawn Promotion Modal */}
      {chessGame.pendingPromotion && (
        <PromotionModal
          isOpen={true}
          color={chessGame.pendingPromotion.color}
          onSelect={(piece) => chessGame.confirmPromotion(piece)}
          onCancel={() => chessGame.cancelPromotion()}
        />
      )}

      {/* Game Over Announcement Modal */}
      <GameOverModal
        isOpen={chessGame.isGameOver}
        winner={chessGame.winner}
        reason={chessGame.gameOverReason}
        onNewGame={() => {
          if (gameMode === 'multiplayer') {
            multiplayer.sendRematchRequest();
          } else {
            handleResetGame();
          }
        }}
        onClose={() => chessGame.setIsGameOver(false)}
        playerColor={playerColor}
        gameMode={gameMode}
        aiDifficulty={aiDifficulty}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gameMode={gameMode}
        onSetGameMode={(mode) => {
          if (mode === 'multiplayer') {
            setIsSettingsOpen(false);
            setIsMultiplayerOpen(true);
          } else {
            setGameMode(mode);
          }
        }}
        aiDifficulty={aiDifficulty}
        onSetAIDifficulty={(diff) => setAIDifficulty(diff)}
        playerColor={playerColor}
        onSetPlayerColor={(c) => setPlayerColor(c)}
        themeId={themeId}
        onSelectTheme={(th) => setThemeId(th)}
        timeControl={timeControl}
        onSetTimeControl={(sec) => {
          setTimeControl(sec);
          setClockTimeControl(sec);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onApplyNewGame={() => handleResetGame(gameMode, playerColor, timeControl)}
      />

      {/* Multiplayer Room Creation & Join Modal */}
      <MultiplayerModal
        isOpen={isMultiplayerOpen}
        onClose={() => setIsMultiplayerOpen(false)}
        roomState={multiplayer.roomState}
        onCreateRoom={(tc, prefColor) => {
          multiplayer.createRoom(tc, prefColor);
        }}
        onJoinRoom={(code) => {
          multiplayer.joinRoom(code);
        }}
        onLeaveRoom={() => {
          multiplayer.leaveRoom();
          handleResetGame('ai', 'w', 0);
        }}
        initialRoomCode={initialRoomCode}
      />

      {/* Rules & Help Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
}
