import React from 'react';
import { CameraPreset } from '../types';
import {
  ArrowUpDown,
  Eye,
  Box,
  Layers,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface GameControlsProps {
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  flipped: boolean;
  onToggleFlip: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  cameraPreset,
  onSelectCamera,
  flipped,
  onToggleFlip,
}) => {
  const presets: { id: CameraPreset; label: string; icon: React.ReactNode }[] = [
    { id: 'white', label: 'WHITE', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'black', label: 'BLACK', icon: <Eye className="w-3.5 h-3.5 rotate-180" /> },
    { id: 'isometric', label: '3D ANGLE', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'top', label: 'TOP-DOWN', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'cinematic', label: 'CINEMA', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-xl bg-neutral-950/90 border border-neutral-800 backdrop-blur-md shadow-2xl z-20">
      <div className="flex items-center gap-1 bg-neutral-900/80 p-1 rounded-lg">
        {presets.map((preset) => {
          const isActive = cameraPreset === preset.id;
          return (
            <button
              key={preset.id}
              id={`camera-preset-${preset.id}`}
              onClick={() => {
                soundManager.playSelect();
                onSelectCamera(preset.id);
              }}
              title={`${preset.label} Camera View`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono font-bold tracking-wider transition cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-neutral-950 shadow-sm font-black'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
              }`}
            >
              {preset.icon}
              <span className="hidden sm:inline">{preset.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-[1px] h-6 bg-neutral-800 mx-1" />

      <button
        id="toggle-flip-btn"
        onClick={() => {
          soundManager.playSelect();
          onToggleFlip();
        }}
        title="Flip Board Perspective"
        className={`p-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
          flipped
            ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
            : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
        }`}
      >
        <ArrowUpDown className="w-4 h-4" />
      </button>
    </div>
  );
};
