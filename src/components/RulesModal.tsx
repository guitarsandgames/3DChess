import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, MousePointer, ShieldCheck } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg rounded-2xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h2 className="font-display font-black text-lg text-neutral-100 uppercase tracking-tight">RULES & 3D CONTROLS</h2>
            </div>
            <button
              id="close-rules-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs text-neutral-300">
            {/* 3D Navigation Controls */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-widest text-amber-300 flex items-center gap-2 mb-2">
                <MousePointer className="w-4 h-4" />
                3D BOARD NAVIGATION
              </h3>
              <ul className="space-y-1.5 text-neutral-400 font-mono text-[11px]">
                <li>• <strong className="text-neutral-100 uppercase">ROTATE VIEW:</strong> Click and drag anywhere on the 3D board to orbit around.</li>
                <li>• <strong className="text-neutral-100 uppercase">ZOOM:</strong> Use mouse wheel or pinch gesture on trackpad/mobile.</li>
                <li>• <strong className="text-neutral-100 uppercase">SELECT & MOVE:</strong> Click any of your pieces to see legal moves (green dots) and captures (red rings), then click target square.</li>
                <li>• <strong className="text-neutral-100 uppercase">QUICK PRESETS:</strong> Use the bottom toolbar to snap to White, Black, Top-down, 3D Isometric, or Cinematic angles.</li>
              </ul>
            </div>

            {/* Chess Rules */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-widest text-amber-300 flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4" />
                STANDARD CHESS RULES
              </h3>
              <div className="grid grid-cols-2 gap-2 text-neutral-400">
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
                  <div className="font-display font-black text-neutral-100 uppercase text-xs mb-1">♚ KING</div>
                  <p className="text-[11px] font-mono leading-relaxed">Moves 1 step in any direction. Protect from checkmate!</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
                  <div className="font-display font-black text-neutral-100 uppercase text-xs mb-1">♛ QUEEN</div>
                  <p className="text-[11px] font-mono leading-relaxed">Moves any number of squares diagonally, horizontally, or vertically.</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
                  <div className="font-display font-black text-neutral-100 uppercase text-xs mb-1">♜ ROOK</div>
                  <p className="text-[11px] font-mono leading-relaxed">Moves horizontally or vertically. Castles with King.</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
                  <div className="font-display font-black text-neutral-100 uppercase text-xs mb-1">♝ BISHOP</div>
                  <p className="text-[11px] font-mono leading-relaxed">Moves diagonally across its starting color tiles.</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
                  <div className="font-display font-black text-neutral-100 uppercase text-xs mb-1">♞ KNIGHT</div>
                  <p className="text-[11px] font-mono leading-relaxed">Moves in an "L" shape (2 then 1). Can jump over pieces.</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800">
                  <div className="font-display font-black text-neutral-100 uppercase text-xs mb-1">♟ PAWN</div>
                  <p className="text-[11px] font-mono leading-relaxed">Moves 1 forward (or 2 initial), captures 1 diagonally. En passant & promotion supported!</p>
                </div>
              </div>
            </div>

            {/* AI Opponent Tiers Guide */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-widest text-amber-300 flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4" />
                AI OPPONENTS & ELO TIERS
              </h3>
              <div className="space-y-1.5 font-mono text-[11px] text-neutral-400">
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex justify-between items-center">
                  <span><strong>SPARK (450 ELO)</strong> — Casual learner, occasional blunders</span>
                  <span className="text-emerald-400 font-bold">LVL 1</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex justify-between items-center">
                  <span><strong>SENTRY (850 ELO)</strong> — Club beginner, grabs free pieces</span>
                  <span className="text-sky-400 font-bold">LVL 2</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex justify-between items-center">
                  <span><strong>VALKYRIE (1300 ELO)</strong> — Solid intermediate, center control</span>
                  <span className="text-amber-400 font-bold">LVL 3</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex justify-between items-center">
                  <span><strong>CIPHER (1700 ELO)</strong> — Tactical counter-attacker</span>
                  <span className="text-orange-400 font-bold">LVL 4</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex justify-between items-center">
                  <span><strong>NEXUS (2100 ELO)</strong> — Positional master, deep tactical sight</span>
                  <span className="text-purple-400 font-bold">LVL 5</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex justify-between items-center">
                  <span><strong>TITAN GM (2500 ELO)</strong> — Grandmaster engine with quiescence</span>
                  <span className="text-rose-400 font-bold">LVL 6</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800">
            <button
              id="got-it-rules-btn"
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-display font-black uppercase tracking-wider transition cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
