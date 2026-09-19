/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Move, Color } from 'chess.js';
import { Chess3DCanvas } from './components/Chess3DCanvas';
import { GameHeader } from './components/GameHeader';
import { GameControls } from './components/GameControls';
import { MoveHistory } from './components/MoveHistory';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { RulesModal } from './components/RulesModal';
import {
  GameMode,
  AIDifficulty,
  PlayerColor,
  CameraPreset,
  MoveRecord,
  CapturedPieces,
  ClockState,
  PendingPromotion,
} from './types';
import { getBestMove } from './utils/aiBot';
import { soundManager } from './utils/audio';

export default function App() {
  // Chess Instance State
  const [chessInstance, setChessInstance] = useState<Chess>(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [movesHistory, setMovesHistory] = useState<MoveRecord[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ w: [], b: [] });

  // Game Configuration State
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('intermediate');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [themeId, setThemeId] = useState<string>('classic-wood');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('white');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Clocks
  const [timeControl, setTimeControl] = useState<number>(0); // 0 = untimed
  const [clock, setClock] = useState<ClockState>({
    w: 0,
    b: 0,
    active: false,
    timeControl: 0,
  });

  // UI Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [winner, setWinner] = useState<'w' | 'b' | 'draw' | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Sound sync
  useEffect(() => {
    soundManager.enabled = soundEnabled;
  }, [soundEnabled]);

  // Restart / Reset Game
  const resetGame = useCallback(
    (newMode?: GameMode, newColor?: PlayerColor, newTime?: number) => {
      const newChess = new Chess();
      setChessInstance(newChess);
      setSelectedSquare(null);
      setValidMoves([]);
      setLastMove(null);
      setMovesHistory([]);
      setCapturedPieces({ w: [], b: [] });
      setIsGameOverOpen(false);
      setPendingPromotion(null);
      setIsThinking(false);

      const tc = newTime !== undefined ? newTime : timeControl;
      setClock({
        w: tc,
        b: tc,
        active: tc > 0,
        timeControl: tc,
      });

      const color = newColor || playerColor;
      setIsFlipped(color === 'b');
      setCameraPreset(color === 'b' ? 'black' : 'white');
    },
    [playerColor, timeControl]
  );

  // Clock countdown interval
  useEffect(() => {
    if (!clock.active || clock.timeControl === 0 || isGameOverOpen) return;

    const timer = setInterval(() => {
      const turn = chessInstance.turn();
      setClock((prev) => {
        if (!prev.active) return prev;
        const currentVal = prev[turn];
        if (currentVal <= 1) {
          // Time out!
          const otherPlayer = turn === 'w' ? 'b' : 'w';
          setWinner(otherPlayer);
          setGameOverReason(`${turn === 'w' ? 'White' : 'Black'} ran out of time`);
          setIsGameOverOpen(true);
          return { ...prev, [turn]: 0, active: false };
        }
        return {
          ...prev,
          [turn]: currentVal - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [clock.active, clock.timeControl, chessInstance, isGameOverOpen]);

  // Check Game Over Conditions
  const checkGameOver = useCallback(
    (game: Chess) => {
      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          const winColor = game.turn() === 'w' ? 'b' : 'w';
          setWinner(winColor);
          setGameOverReason(`Checkmate! ${winColor === 'w' ? 'White' : 'Black'} wins.`);
        } else if (game.isDraw()) {
          setWinner('draw');
          if (game.isStalemate()) {
            setGameOverReason('Stalemate! Game is a draw.');
          } else if (game.isThreefoldRepetition()) {
            setGameOverReason('Draw by threefold repetition.');
          } else if (game.isInsufficientMaterial()) {
            setGameOverReason('Draw due to insufficient material.');
          } else {
            setGameOverReason('Draw by 50-move rule.');
          }
        }
        setIsGameOverOpen(true);
      } else if (game.inCheck()) {
        soundManager.playCheck();
      }
    },
    []
  );

  // Make Move Execution
  const executeMove = useCallback(
    (from: Square, to: Square, promotionPiece?: PieceSymbol) => {
      try {
        const pieceToMove = chessInstance.get(from);
        if (!pieceToMove) return false;

        const moveResult = chessInstance.move({
          from,
          to,
          promotion: promotionPiece || 'q',
        });

        if (moveResult) {
          // Play sound
          if (moveResult.captured) {
            soundManager.playCapture();
            setCapturedPieces((prev) => ({
              ...prev,
              [moveResult.color]: [...prev[moveResult.color], moveResult.captured!],
            }));
          } else {
            soundManager.playMove();
          }

          // Record move
          const record: MoveRecord = {
            from,
            to,
            piece: moveResult.piece,
            color: moveResult.color,
            san: moveResult.san,
            captured: moveResult.captured,
            promotion: moveResult.promotion,
            fen: chessInstance.fen(),
          };

          setMovesHistory((prev) => [...prev, record]);
          setLastMove({ from, to });
          setSelectedSquare(null);
          setValidMoves([]);

          // Trigger state update
          const newGame = new Chess(chessInstance.fen());
          setChessInstance(newGame);
          checkGameOver(newGame);

          return true;
        }
      } catch (err) {
        console.error('Invalid move attempt:', err);
      }
      return false;
    },
    [chessInstance, checkGameOver]
  );

  // AI Turn Handling
  useEffect(() => {
    if (gameMode !== 'ai' || isGameOverOpen || pendingPromotion) return;

    const currentTurn = chessInstance.turn();
    const isAITurn = currentTurn !== playerColor;

    if (isAITurn && !chessInstance.isGameOver()) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        const bestMove = getBestMove(chessInstance, aiDifficulty);
        if (bestMove) {
          executeMove(bestMove.from, bestMove.to, bestMove.promotion);
        }
        setIsThinking(false);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [
    chessInstance,
    gameMode,
    playerColor,
    aiDifficulty,
    isGameOverOpen,
    pendingPromotion,
    executeMove,
  ]);

  // Handle Square Selection / Click on 3D Board
  const handleSquareClick = (square: Square) => {
    if (isGameOverOpen || isThinking) return;

    // Check if it's player's turn in AI mode
    if (gameMode === 'ai' && chessInstance.turn() !== playerColor) {
      return;
    }

    const clickedPiece = chessInstance.get(square);

    // Case 1: Square has player's own piece -> Select it and show valid moves
    if (clickedPiece && clickedPiece.color === chessInstance.turn()) {
      if (selectedSquare === square) {
        // Deselect
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setSelectedSquare(square);
        const moves = chessInstance.moves({ square, verbose: true });
        setValidMoves(moves);
        soundManager.playSelect();
      }
      return;
    }

    // Case 2: A square is already selected -> Attempt to move there
    if (selectedSquare) {
      const isLegal = validMoves.some((m) => m.to === square);
      if (isLegal) {
        const selectedPiece = chessInstance.get(selectedSquare);
        // Check for Pawn Promotion (rank 8 for White, rank 1 for Black)
        const isPromotion =
          selectedPiece?.type === 'p' &&
          ((selectedPiece.color === 'w' && square[1] === '8') ||
            (selectedPiece.color === 'b' && square[1] === '1'));

        if (isPromotion) {
          setPendingPromotion({
            from: selectedSquare,
            to: square,
            color: selectedPiece.color,
          });
          return;
        }

        executeMove(selectedSquare, square);
      } else {
        // Deselect on invalid click
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  // Promotion choice confirm
  const handleSelectPromotion = (piece: PieceSymbol) => {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    }
  };

  // Undo Move
  const handleUndo = () => {
    if (movesHistory.length === 0 || isThinking) return;

    // In AI mode, undo 2 moves to revert to player's turn
    const stepsToUndo = gameMode === 'ai' && movesHistory.length >= 2 ? 2 : 1;
    const newChess = new Chess();

    const targetMoveCount = movesHistory.length - stepsToUndo;
    const remainingMoves = movesHistory.slice(0, targetMoveCount);

    const newCaptured: CapturedPieces = { w: [], b: [] };
    for (const move of remainingMoves) {
      const res = newChess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      if (res && res.captured) {
        newCaptured[res.color].push(res.captured);
      }
    }

    setChessInstance(newChess);
    setMovesHistory(remainingMoves);
    setCapturedPieces(newCaptured);
    setSelectedSquare(null);
    setValidMoves([]);
    setIsGameOverOpen(false);

    if (remainingMoves.length > 0) {
      const prev = remainingMoves[remainingMoves.length - 1];
      setLastMove({ from: prev.from, to: prev.to });
    } else {
      setLastMove(null);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* Top Navigation Bar */}
      <GameHeader
        onNewGame={() => resetGame()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
        gameMode={gameMode}
      />

      {/* Main Viewport + Sidebar Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 3D Chess Stage */}
        <div className="flex-1 relative h-full">
          <Chess3DCanvas
            game={chessInstance}
            themeId={themeId}
            cameraPreset={cameraPreset}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            lastMove={lastMove}
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
            game={chessInstance}
            moves={movesHistory}
            captured={capturedPieces}
            clock={clock}
            isThinking={isThinking}
            onUndo={handleUndo}
            canUndo={movesHistory.length > 0}
            gameMode={gameMode}
            aiDifficulty={aiDifficulty}
            onSetAIDifficulty={(diff) => setAIDifficulty(diff)}
          />
        </div>
      </div>

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <PromotionModal
          isOpen={true}
          color={pendingPromotion.color}
          onSelect={handleSelectPromotion}
          onCancel={() => setPendingPromotion(null)}
        />
      )}

      {/* Game Over Announcement Modal */}
      <GameOverModal
        isOpen={isGameOverOpen}
        winner={winner}
        reason={gameOverReason}
        onNewGame={() => resetGame()}
        onClose={() => setIsGameOverOpen(false)}
        playerColor={playerColor}
        gameMode={gameMode}
        aiDifficulty={aiDifficulty}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gameMode={gameMode}
        onSetGameMode={(mode) => setGameMode(mode)}
        aiDifficulty={aiDifficulty}
        onSetAIDifficulty={(diff) => setAIDifficulty(diff)}
        playerColor={playerColor}
        onSetPlayerColor={(c) => setPlayerColor(c)}
        themeId={themeId}
        onSelectTheme={(th) => setThemeId(th)}
        timeControl={timeControl}
        onSetTimeControl={(sec) => setTimeControl(sec)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onApplyNewGame={() => resetGame(gameMode, playerColor, timeControl)}
      />

      {/* Rules & Help Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
}
