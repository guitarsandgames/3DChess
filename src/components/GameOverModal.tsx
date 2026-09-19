import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Eye, Award, ShieldAlert, Bot } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { AIDifficulty } from '../types';
import { getAIOpponent } from '../utils/aiBot';

interface GameOverModalProps {
  isOpen: boolean;
  winner: 'w' | 'b' | 'draw' | null;
  reason: string;
  onNewGame: () => void;
  onClose: () => void;
  playerColor?: 'w' | 'b';
  gameMode: string;
  aiDifficulty?: AIDifficulty;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  reason,
  onNewGame,
  onClose,
  playerColor = 'w',
  gameMode,
  aiDifficulty = 'intermediate',
}) => {
  useEffect(() => {
    if (isOpen) {
      if (winner && winner !== 'draw') {
        soundManager.playVictory();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#ffffff', '#38bdf8'],
        });
      }
    }
  }, [isOpen, winner]);

  if (!isOpen) return null;

  const opponent = getAIOpponent(aiDifficulty);
  const isPlayerWinner = winner === playerColor;
  const isAIWinner = gameMode === 'ai' && winner && winner !== 'draw' && !isPlayerWinner;

  let title = 'GAME OVER';
  let subtitle = reason;
  let icon = <Award className="w-12 h-12 text-amber-400" />;

  if (winner === 'draw') {
    title = 'DRAW';
    icon = <ShieldAlert className="w-12 h-12 text-blue-400" />;
  } else if (gameMode === 'ai') {
    if (isPlayerWinner) {
      title = 'VICTORY!';
      icon = <Trophy className="w-12 h-12 text-amber-400" />;
    } else {
      title = 'CHECKMATE';
      icon = <ShieldAlert className="w-12 h-12 text-rose-400" />;
    }
  } else if (winner === 'w') {
    title = 'WHITE WINS';
    icon = <Trophy className="w-12 h-12 text-amber-400" />;
  } else if (winner === 'b') {
    title = 'BLACK WINS';
    icon = <Trophy className="w-12 h-12 text-amber-400" />;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md rounded-2xl bg-neutral-950 border border-neutral-800 p-8 shadow-2xl text-center"
        >
          <div className="flex justify-center mb-4">{icon}</div>

          <h2 className="font-display text-3xl sm:text-4xl font-black text-neutral-100 uppercase tracking-tight mb-2">
            {title}
          </h2>

          <div className="inline-block px-3.5 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider mb-4">
            {subtitle}
          </div>

          {/* AI Match Recap badge */}
          {gameMode === 'ai' && (
            <div className="mb-6 p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-neutral-500 font-bold">OPPONENT</div>
                  <div className="font-display font-black text-xs uppercase text-neutral-100">{opponent.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs font-bold text-amber-400">{opponent.elo} ELO</div>
                <div className="text-[10px] font-mono text-neutral-400">{opponent.title}</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <button
              id="game-over-rematch-btn"
              onClick={() => {
                soundManager.playSelect();
                onNewGame();
              }}
              className="w-full py-3.5 px-6 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 stroke-[2.5]" />
              PLAY AGAIN
            </button>

            <button
              id="game-over-inspect-btn"
              onClick={onClose}
              className="w-full py-3 px-6 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-neutral-800 transition cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              EXAMINE FINAL BOARD
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

