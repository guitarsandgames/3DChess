import React from 'react';
import { PieceSymbol, Color } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../utils/audio';

interface PromotionModalProps {
  isOpen: boolean;
  color: Color;
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  color,
  onSelect,
  onCancel,
}) => {
  if (!isOpen) return null;

  const pieces: { type: PieceSymbol; name: string; symbol: string }[] = [
    { type: 'q', name: 'QUEEN', symbol: color === 'w' ? '♕' : '♛' },
    { type: 'r', name: 'ROOK', symbol: color === 'w' ? '♖' : '♜' },
    { type: 'b', name: 'BISHOP', symbol: color === 'w' ? '♗' : '♝' },
    { type: 'n', name: 'KNIGHT', symbol: color === 'w' ? '♘' : '♞' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl text-center"
        >
          <h3 className="font-display text-xl font-black text-neutral-100 uppercase tracking-tight mb-1">
            PAWN PROMOTION
          </h3>
          <p className="text-[11px] font-mono uppercase font-bold text-neutral-400 mb-6 tracking-wide">
            Select piece to promote into:
          </p>

          <div className="grid grid-cols-4 gap-2.5 mb-6">
            {pieces.map((p) => (
              <button
                key={p.type}
                id={`promote-btn-${p.type}`}
                onClick={() => {
                  soundManager.playSelect();
                  onSelect(p.type);
                }}
                className="group flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-400 hover:bg-amber-400/10 transition-all cursor-pointer"
              >
                <span className="text-3xl text-amber-300 group-hover:scale-115 transition-transform duration-200">
                  {p.symbol}
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400 group-hover:text-amber-300 mt-2 tracking-wider">
                  {p.name}
                </span>
              </button>
            ))}
          </div>

          <button
            id="promote-cancel-btn"
            onClick={onCancel}
            className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-mono uppercase font-bold tracking-wider transition cursor-pointer border border-neutral-800"
          >
            CANCEL MOVE
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
