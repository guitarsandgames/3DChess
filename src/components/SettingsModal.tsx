import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameMode, AIDifficulty, PlayerColor } from '../types';
import { BOARD_THEMES } from './PieceModels';
import { AI_OPPONENTS, normalizeAIDifficulty } from '../utils/aiBot';
import { X, Check, Sliders, Bot, Users, Sparkles, Shield, Swords, Brain, Crown } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode: GameMode;
  onSetGameMode: (mode: GameMode) => void;
  aiDifficulty: AIDifficulty;
  onSetAIDifficulty: (diff: AIDifficulty) => void;
  playerColor: PlayerColor;
  onSetPlayerColor: (color: PlayerColor) => void;
  themeId: string;
  onSelectTheme: (id: string) => void;
  timeControl: number;
  onSetTimeControl: (sec: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onApplyNewGame: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gameMode,
  onSetGameMode,
  aiDifficulty,
  onSetAIDifficulty,
  playerColor,
  onSetPlayerColor,
  themeId,
  onSelectTheme,
  timeControl,
  onSetTimeControl,
  onApplyNewGame,
}) => {
  if (!isOpen) return null;

  const currentDiffNormalized = normalizeAIDifficulty(aiDifficulty);

  const getDifficultyIcon = (id: AIDifficulty) => {
    switch (id) {
      case 'novice': return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'casual': return <Bot className="w-4 h-4 text-sky-400" />;
      case 'intermediate': return <Shield className="w-4 h-4 text-amber-400" />;
      case 'advanced': return <Swords className="w-4 h-4 text-orange-400" />;
      case 'expert': return <Brain className="w-4 h-4 text-purple-400" />;
      case 'grandmaster': return <Crown className="w-4 h-4 text-rose-400" />;
      default: return <Bot className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl rounded-2xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h2 className="font-display font-black text-lg text-neutral-100 uppercase tracking-tight">GAME SETTINGS</h2>
            </div>
            <button
              id="close-settings-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-6 text-sm">
            {/* Game Mode */}
            <div>
              <label className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest mb-2.5">
                GAME MODE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="mode-ai-btn"
                  onClick={() => {
                    soundManager.playSelect();
                    onSetGameMode('ai');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                    gameMode === 'ai'
                      ? 'bg-amber-400/10 border-amber-400/60 text-amber-300'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-900'
                  }`}
                >
                  <Bot className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-display font-bold text-xs uppercase tracking-wide">VS COMPUTER AI</div>
                    <div className="text-[11px] font-mono opacity-70">6 distinct AI difficulty tiers</div>
                  </div>
                </button>

                <button
                  id="mode-pass-btn"
                  onClick={() => {
                    soundManager.playSelect();
                    onSetGameMode('pass-and-play');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                    gameMode === 'pass-and-play'
                      ? 'bg-amber-400/10 border-amber-400/60 text-amber-300'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-900'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-display font-bold text-xs uppercase tracking-wide">PASS & PLAY</div>
                    <div className="text-[11px] font-mono opacity-70">2 players on one screen</div>
                  </div>
                </button>
              </div>
            </div>

            {/* AI Difficulty Roster (if in AI mode) */}
            {gameMode === 'ai' && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                    AI OPPONENT TIERS ({AI_OPPONENTS.length} LEVELS)
                  </label>
                  <span className="text-[10px] font-mono text-amber-400/80 uppercase font-bold">
                    ELO 450 → 2500
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AI_OPPONENTS.map((opp) => {
                    const isSelected = currentDiffNormalized === opp.id;
                    return (
                      <button
                        key={opp.id}
                        id={`diff-btn-${opp.id}`}
                        onClick={() => {
                          soundManager.playSelect();
                          onSetAIDifficulty(opp.id);
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer relative ${
                          isSelected
                            ? 'bg-amber-400/10 border-amber-400 text-neutral-100 ring-1 ring-amber-400/50'
                            : 'bg-neutral-900/70 border-neutral-800 text-neutral-400 hover:bg-neutral-900 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1.5 w-full">
                          <div className="flex items-center gap-2">
                            {getDifficultyIcon(opp.id)}
                            <div>
                              <div className="font-display font-black text-xs uppercase tracking-wider text-neutral-100">
                                {opp.name}
                              </div>
                              <div className="text-[10px] font-mono opacity-70">
                                {opp.title}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-neutral-800 border border-neutral-700 text-neutral-300">
                              {opp.elo} ELO
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 ml-0.5" />}
                          </div>
                        </div>
                        <p className="text-[11px] font-mono text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
                          {opp.description}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-mono border-t border-neutral-800/80 pt-1.5 w-full">
                          <span className="text-neutral-500 uppercase">{opp.style}</span>
                          <span className="text-amber-400/90 font-bold">{opp.badge}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Play as Color (in AI mode) */}
            {gameMode === 'ai' && (
              <div>
                <label className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest mb-2.5">
                  PLAY AS COLOR
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="color-white-btn"
                    onClick={() => {
                      soundManager.playSelect();
                      onSetPlayerColor('w');
                    }}
                    className={`py-2.5 px-3 rounded-lg border flex items-center justify-center gap-2 font-display font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                      playerColor === 'w'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-neutral-100 border border-neutral-400" />
                    WHITE (FIRST)
                  </button>

                  <button
                    id="color-black-btn"
                    onClick={() => {
                      soundManager.playSelect();
                      onSetPlayerColor('b');
                    }}
                    className={`py-2.5 px-3 rounded-lg border flex items-center justify-center gap-2 font-display font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                      playerColor === 'b'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-neutral-900 border border-neutral-600" />
                    BLACK (SECOND)
                  </button>
                </div>
              </div>
            )}

            {/* Board Visual Theme */}
            <div>
              <label className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest mb-2.5">
                3D THEME & BOARD MATERIALS
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BOARD_THEMES.map((th) => (
                  <button
                    key={th.id}
                    id={`theme-btn-${th.id}`}
                    onClick={() => {
                      soundManager.playSelect();
                      onSelectTheme(th.id);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                      themeId === th.id
                        ? 'bg-amber-400/10 border-amber-400/60 text-amber-300'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-sm border border-neutral-600"
                        style={{ backgroundColor: `#${th.darkSquare.toString(16).padStart(6, '0')}` }}
                      />
                      <span className="text-xs font-mono font-semibold">{th.name}</span>
                    </div>
                    {themeId === th.id && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest mb-2.5">
                MATCH CLOCK
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'UNTIMED', val: 0 },
                  { label: '3 MIN', val: 180 },
                  { label: '5 MIN', val: 300 },
                  { label: '10 MIN', val: 600 },
                ].map((t) => (
                  <button
                    key={t.val}
                    id={`timer-btn-${t.val}`}
                    onClick={() => {
                      soundManager.playSelect();
                      onSetTimeControl(t.val);
                    }}
                    className={`py-2 px-2 rounded-lg border text-center text-xs font-mono font-bold transition cursor-pointer ${
                      timeControl === t.val
                        ? 'bg-amber-400 text-neutral-950 border-amber-400 font-black'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action footer */}
          <div className="pt-4 border-t border-neutral-800 flex gap-3">
            <button
              id="apply-settings-btn"
              onClick={() => {
                soundManager.playSelect();
                onClose();
              }}
              className="flex-1 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono uppercase font-bold tracking-wider transition cursor-pointer border border-neutral-800"
            >
              SAVE & RETURN
            </button>
            <button
              id="start-new-game-settings-btn"
              onClick={() => {
                soundManager.playSelect();
                onApplyNewGame();
                onClose();
              }}
              className="flex-1 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-display font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-amber-400/20"
            >
              START NEW MATCH
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
