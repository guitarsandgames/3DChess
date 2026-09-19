import React from 'react';
import {
  Sliders,
  BookOpen,
  Volume2,
  VolumeX,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface GameHeaderProps {
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenRules: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  gameMode: string;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  onNewGame,
  onOpenSettings,
  onOpenRules,
  soundEnabled,
  onToggleSound,
  showSidebar,
  onToggleSidebar,
}) => {
  return (
    <header className="h-14 px-4 sm:px-6 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md flex items-center justify-between z-30 select-none">
      {/* Brand & Logo with Bold Typography */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-400 text-neutral-950 font-black text-xl shadow-sm">
          ♚
        </div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-display font-black text-lg text-neutral-100 tracking-tight uppercase leading-none">
            3D CHESS
          </h1>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            3D ENGINE
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          id="header-new-game-btn"
          onClick={() => {
            soundManager.playSelect();
            onNewGame();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-98 text-neutral-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">New Game</span>
        </button>

        <button
          id="header-settings-btn"
          onClick={() => {
            soundManager.playSelect();
            onOpenSettings();
          }}
          title="Game Settings"
          className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <button
          id="header-rules-btn"
          onClick={() => {
            soundManager.playSelect();
            onOpenRules();
          }}
          title="Rules & How to Play"
          className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <button
          id="header-sound-btn"
          onClick={() => {
            onToggleSound();
          }}
          title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          className={`p-2 rounded-lg border transition cursor-pointer ${
            soundEnabled
              ? 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <div className="w-[1px] h-5 bg-neutral-800 mx-1" />

        <button
          id="header-sidebar-toggle-btn"
          onClick={() => {
            soundManager.playSelect();
            onToggleSidebar();
          }}
          title={showSidebar ? 'Hide Panel' : 'Show Panel'}
          className={`p-2 rounded-lg border transition cursor-pointer ${
            showSidebar
              ? 'bg-neutral-800 text-amber-300 border-amber-500/50'
              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
          }`}
        >
          {showSidebar ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};
