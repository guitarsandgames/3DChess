import { useState, useCallback, useRef } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { MoveRecord, CapturedPieces, PendingPromotion } from '../types';
import { soundManager } from '../utils/audio';

export interface UseChessGameOptions {
  soundEnabled?: boolean;
  onMoveExecuted?: (move: MoveRecord) => void;
  onGameOver?: (winner: Color | 'draw', reason: string) => void;
}

export function useChessGame(options: UseChessGameOptions = {}) {
  const { soundEnabled = true, onMoveExecuted, onGameOver } = options;

  const [chessInstance, setChessInstance] = useState<Chess>(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [captured, setCaptured] = useState<CapturedPieces>({ w: [], b: [] });
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [isCheck, setIsCheck] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [winner, setWinner] = useState<Color | 'draw' | null>(null);

  const callbacksRef = useRef({ onMoveExecuted, onGameOver, soundEnabled });
  callbacksRef.current = { onMoveExecuted, onGameOver, soundEnabled };

  const updateGameStatus = useCallback((c: Chess) => {
    const inChk = c.inCheck();
    setIsCheck(inChk);

    if (c.isGameOver()) {
      setIsGameOver(true);
      let win: Color | 'draw' = 'draw';
      let reason = '';
      if (c.isCheckmate()) {
        win = c.turn() === 'w' ? 'b' : 'w';
        reason = `Checkmate! ${win === 'w' ? 'White' : 'Black'} wins!`;
      } else if (c.isDraw()) {
        win = 'draw';
        if (c.isStalemate()) {
          reason = 'Draw by Stalemate';
        } else if (c.isThreefoldRepetition()) {
          reason = 'Draw by Threefold Repetition';
        } else if (c.isInsufficientMaterial()) {
          reason = 'Draw by Insufficient Material';
        } else {
          reason = 'Draw by 50-move rule';
        }
      }
      setWinner(win);
      setGameOverReason(reason);
      if (callbacksRef.current.soundEnabled) {
        soundManager.playVictory();
      }
      callbacksRef.current.onGameOver?.(win, reason);
    } else if (inChk && callbacksRef.current.soundEnabled) {
      soundManager.playCheck();
    }
  }, []);

  const selectSquare = useCallback((square: Square | null) => {
    if (!square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    const piece = chessInstance.get(square);
    if (piece && piece.color === chessInstance.turn()) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setSelectedSquare(square);
        const moves = chessInstance.moves({ square, verbose: true });
        setValidMoves(moves);
        if (callbacksRef.current.soundEnabled) {
          soundManager.playSelect();
        }
      }
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [chessInstance, selectedSquare]);

  const executeMove = useCallback((from: Square, to: Square, promotionPiece?: PieceSymbol): boolean => {
    try {
      const pieceToMove = chessInstance.get(from);
      if (!pieceToMove) return false;

      const move = chessInstance.move({
        from,
        to,
        promotion: promotionPiece || 'q',
      });

      if (!move) return false;

      // Audio feedback
      if (callbacksRef.current.soundEnabled) {
        if (move.captured) {
          soundManager.playCapture();
        } else {
          soundManager.playMove();
        }
      }

      // Track captured pieces
      if (move.captured) {
        setCaptured((prev) => ({
          ...prev,
          [move.color]: [...prev[move.color], move.captured!],
        }));
      }

      const newGame = new Chess(chessInstance.fen());
      setChessInstance(newGame);

      const newRecord: MoveRecord = {
        from: move.from,
        to: move.to,
        piece: move.piece,
        color: move.color,
        san: move.san,
        captured: move.captured,
        promotion: move.promotion,
        fen: newGame.fen(),
      };

      setMoveHistory((prev) => [...prev, newRecord]);
      setLastMove({ from: move.from, to: move.to });
      setSelectedSquare(null);
      setValidMoves([]);

      updateGameStatus(newGame);
      callbacksRef.current.onMoveExecuted?.(newRecord);
      return true;
    } catch {
      return false;
    }
  }, [chessInstance, updateGameStatus]);

  const tryMove = useCallback((from: Square, to: Square): boolean => {
    if (isGameOver) return false;

    const piece = chessInstance.get(from);
    if (
      piece &&
      piece.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))
    ) {
      const legalMoves = chessInstance.moves({ square: from, verbose: true });
      if (legalMoves.some((m) => m.to === to)) {
        setPendingPromotion({
          from,
          to,
          color: piece.color,
        });
        return false;
      }
    }

    return executeMove(from, to);
  }, [chessInstance, isGameOver, executeMove]);

  const confirmPromotion = useCallback((promotionPiece: PieceSymbol) => {
    if (!pendingPromotion) return;
    executeMove(pendingPromotion.from, pendingPromotion.to, promotionPiece);
    setPendingPromotion(null);
  }, [pendingPromotion, executeMove]);

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setSelectedSquare(null);
    setValidMoves([]);
  }, []);

  const resetGame = useCallback(() => {
    const fresh = new Chess();
    setChessInstance(fresh);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setCaptured({ w: [], b: [] });
    setPendingPromotion(null);
    setIsCheck(false);
    setIsGameOver(false);
    setGameOverReason('');
    setWinner(null);
  }, []);

  const undoMove = useCallback((steps: number = 1) => {
    if (moveHistory.length === 0) return;

    const targetCount = Math.max(0, moveHistory.length - steps);
    const remainingMoves = moveHistory.slice(0, targetCount);
    const fresh = new Chess();
    const newCaptured: CapturedPieces = { w: [], b: [] };

    for (const m of remainingMoves) {
      const res = fresh.move({ from: m.from, to: m.to, promotion: m.promotion });
      if (res && res.captured) {
        newCaptured[res.color].push(res.captured);
      }
    }

    setChessInstance(fresh);
    setMoveHistory(remainingMoves);
    setCaptured(newCaptured);
    setSelectedSquare(null);
    setValidMoves([]);
    setIsGameOver(false);
    setGameOverReason('');
    setWinner(null);

    if (remainingMoves.length > 0) {
      const prev = remainingMoves[remainingMoves.length - 1];
      setLastMove({ from: prev.from, to: prev.to });
    } else {
      setLastMove(null);
    }
  }, [moveHistory]);

  const handleTimeout = useCallback((loserColor: Color) => {
    setIsGameOver(true);
    const win = loserColor === 'w' ? 'b' : 'w';
    setWinner(win);
    const reason = `${loserColor === 'w' ? 'White' : 'Black'} ran out of time!`;
    setGameOverReason(reason);
    if (callbacksRef.current.soundEnabled) {
      soundManager.playVictory();
    }
    callbacksRef.current.onGameOver?.(win, reason);
  }, []);

  return {
    chessInstance,
    turn: chessInstance.turn(),
    selectedSquare,
    validMoves,
    lastMove,
    moveHistory,
    captured,
    pendingPromotion,
    isCheck,
    isGameOver,
    gameOverReason,
    winner,
    selectSquare,
    tryMove,
    executeMove,
    confirmPromotion,
    cancelPromotion,
    resetGame,
    undoMove,
    handleTimeout,
    setIsGameOver,
  };
}
