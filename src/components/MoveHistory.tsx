import React, { useRef, useEffect, useState } from 'react';
import { Chess, PieceSymbol } from 'chess.js';
import { MoveRecord, CapturedPieces, ClockState, AIDifficulty } from '../types';
import { RotateCcw, ShieldAlert, Cpu, Terminal, Sparkles, Bot, Shield, Swords, Brain, Crown, ChevronDown } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { AI_OPPONENTS, getAIOpponent } from '../utils/aiBot';

interface MoveHistoryProps {
  game: Chess;
  moves: MoveRecord[];
  captured: CapturedPieces;
  clock: ClockState;
  isThinking: boolean;
  onUndo: () => void;
  canUndo: boolean;
  gameMode: string;
  aiDifficulty: AIDifficulty;
  onSetAIDifficulty?: (diff: AIDifficulty) => void;
}

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const PIECE_SYMBOLS_WHITE: Record<PieceSymbol, string> = {
  p: '♙',
  n: '♘',
  b: '♗',
  r: '♖',
  q: '♕',
  k: '♔',
};

const PIECE_SYMBOLS_BLACK: Record<PieceSymbol, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  game,
  moves,
  captured,
  clock,
  isThinking,
  onUndo,
  canUndo,
  gameMode,
  aiDifficulty,
  onSetAIDifficulty,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  // Compute material tally
  const whiteMaterial = captured.b.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
  const blackMaterial = captured.w.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
  const whiteAdvantage = whiteMaterial - blackMaterial;

  const turn = game.turn();
  const inCheck = game.inCheck();
  const currentOpponent = getAIOpponent(aiDifficulty);

  const getBotIcon = (id: AIDifficulty) => {
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

  // Group moves into pairs (1. e4 e5, 2. Nf3 Nc6)
  const movePairs: { num: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950/95 border-l border-neutral-800 backdrop-blur-md">
      {/* AI Opponent Card (when in AI Mode) */}
      {gameMode === 'ai' && (
        <div className="p-3.5 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center">
                {getBotIcon(currentOpponent.id)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xs uppercase tracking-wider text-neutral-100">
                    {currentOpponent.name}
                  </span>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-neutral-800 border border-neutral-700 text-amber-400">
                    {currentOpponent.elo} ELO
                  </span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                  <span>{currentOpponent.title}</span>
                  <span>•</span>
                  <span className="text-neutral-500">{currentOpponent.badge}</span>
                </div>
              </div>
            </div>

            {onSetAIDifficulty && (
              <button
                id="toggle-ai-level-picker-btn"
                onClick={() => setShowLevelPicker((prev) => !prev)}
                className="p-1.5 rounded-md bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition cursor-pointer text-xs font-mono flex items-center gap-1"
                title="Change AI Difficulty Level"
              >
                <span className="text-[10px] uppercase font-bold hidden sm:inline">LEVEL</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLevelPicker ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Quick AI Level Selector Dropdown / Grid */}
          {showLevelPicker && onSetAIDifficulty && (
            <div className="mt-2.5 pt-2.5 border-t border-neutral-800/80 grid grid-cols-3 gap-1.5">
              {AI_OPPONENTS.map((opp) => {
                const isActive = currentOpponent.id === opp.id;
                return (
                  <button
                    key={opp.id}
                    id={`quick-ai-level-${opp.id}`}
                    onClick={() => {
                      soundManager.playSelect();
                      onSetAIDifficulty(opp.id);
                      setShowLevelPicker(false);
                    }}
                    className={`py-1 px-1.5 rounded-md text-[10px] font-mono font-bold tracking-tight text-center border transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-neutral-950 border-amber-400 font-black'
                        : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    <div>{opp.name}</div>
                    <div className="text-[8px] opacity-75">{opp.elo}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Turn & Status Indicator Banner */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 ${
                turn === 'w'
                  ? 'bg-neutral-100 border-amber-400 shadow-sm'
                  : 'bg-neutral-900 border-neutral-500'
              }`}
            />
            <span className="font-display font-black text-xs uppercase tracking-wider text-neutral-100">
              {turn === 'w' ? 'WHITE TO MOVE' : 'BLACK TO MOVE'}
            </span>
          </div>

          {inCheck && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              CHECK
            </span>
          )}

          {isThinking && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Cpu className="w-3.5 h-3.5 animate-spin" />
              CALCULATING
            </span>
          )}
        </div>

        {/* Timers if active */}
        {clock.timeControl > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div
              className={`p-2.5 rounded-lg border flex flex-col ${
                turn === 'w' && clock.active
                  ? 'bg-amber-400/10 border-amber-400/50 text-amber-300'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">WHITE</span>
              <span className="font-mono text-xl font-bold tracking-tight">
                {formatTime(clock.w)}
              </span>
            </div>

            <div
              className={`p-2.5 rounded-lg border flex flex-col ${
                turn === 'b' && clock.active
                  ? 'bg-amber-400/10 border-amber-400/50 text-amber-300'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">BLACK</span>
              <span className="font-mono text-xl font-bold tracking-tight">
                {formatTime(clock.b)}
              </span>
            </div>
          </div>
        )}

        {/* Captured Pieces Graveyard */}
        <div className="space-y-2 pt-1">
          {/* Black captured pieces (taken by White) */}
          <div className="flex items-center justify-between text-xs bg-neutral-900/40 p-2 rounded-lg border border-neutral-800/60">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] scrollbar-none">
              <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 mr-0.5">W:</span>
              {captured.b.length === 0 ? (
                <span className="text-[11px] font-mono text-neutral-600">—</span>
              ) : (
                captured.b.map((p, idx) => (
                  <span key={idx} className="text-base text-neutral-200 leading-none">
                    {PIECE_SYMBOLS_BLACK[p]}
                  </span>
                ))
              )}
            </div>
            {whiteAdvantage > 0 && (
              <span className="font-mono font-bold text-xs text-amber-400 px-1.5 py-0.5 bg-amber-400/10 rounded-sm">
                +{whiteAdvantage}
              </span>
            )}
          </div>

          {/* White captured pieces (taken by Black) */}
          <div className="flex items-center justify-between text-xs bg-neutral-900/40 p-2 rounded-lg border border-neutral-800/60">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] scrollbar-none">
              <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 mr-0.5">B:</span>
              {captured.w.length === 0 ? (
                <span className="text-[11px] font-mono text-neutral-600">—</span>
              ) : (
                captured.w.map((p, idx) => (
                  <span key={idx} className="text-base text-neutral-400 leading-none">
                    {PIECE_SYMBOLS_WHITE[p]}
                  </span>
                ))
              )}
            </div>
            {whiteAdvantage < 0 && (
              <span className="font-mono font-bold text-xs text-amber-400 px-1.5 py-0.5 bg-amber-400/10 rounded-sm">
                +{Math.abs(whiteAdvantage)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Move History Table Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-950 text-neutral-400">
        <span className="flex items-center gap-1.5 font-display font-black text-[11px] uppercase tracking-widest text-neutral-300">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          MOVE RECORD
        </span>
        <button
          id="undo-move-btn"
          onClick={() => {
            soundManager.playSelect();
            onUndo();
          }}
          disabled={!canUndo || isThinking}
          className="flex items-center gap-1 text-[11px] font-mono uppercase font-bold text-neutral-400 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-400 transition cursor-pointer disabled:cursor-not-allowed px-2 py-0.5 rounded-sm hover:bg-neutral-800"
          title="Undo last move"
        >
          <RotateCcw className="w-3 h-3" />
          UNDO
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs font-mono select-text"
      >
        {movePairs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs font-mono uppercase tracking-wider py-8">
            <span className="text-2xl mb-1 opacity-40">♟</span>
            READY FOR OPENING MOVE
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.num}
              className="grid grid-cols-12 px-2.5 py-1.5 rounded-md hover:bg-neutral-900 border border-transparent hover:border-neutral-800/80 transition-colors items-center"
            >
              <span className="col-span-2 text-neutral-500 font-bold text-[11px]">
                {pair.num.toString().padStart(2, '0')}.
              </span>
              <span className="col-span-5 font-bold text-neutral-100 tracking-wide">
                {pair.white?.san || ''}
              </span>
              <span className="col-span-5 font-semibold text-neutral-400 tracking-wide">
                {pair.black?.san || ''}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-between bg-neutral-950">
        <span>
          MODE: <strong className="text-amber-300 uppercase font-bold">{gameMode === 'ai' ? `AI: ${currentOpponent.name} (${currentOpponent.elo})` : 'PASS & PLAY'}</strong>
        </span>
        <span className="text-neutral-500 text-[10px] uppercase">ORBIT / ZOOM</span>
      </div>
    </div>
  );
};
