import { Square, PieceSymbol, Color } from 'chess.js';

export type GameMode = 'ai' | 'pass-and-play';
export type AIDifficulty =
  | 'novice'
  | 'casual'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'grandmaster'
  | 'easy'
  | 'medium'
  | 'hard';

export interface AIOpponent {
  id: AIDifficulty;
  name: string;
  title: string;
  elo: number;
  badge: string;
  colorClass: string;
  description: string;
  style: string;
  depth: number;
  blunderRate: number;
  quiescence: boolean;
}
export type PlayerColor = 'w' | 'b';

export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: number;
  darkSquare: number;
  lightPiece: number;
  darkPiece: number;
  boardBorder: number;
  feltColor: number;
  pieceRoughness: number;
  pieceMetalness: number;
  boardRoughness: number;
  ambientLight: number;
  background: string;
}

export type CameraPreset = 'white' | 'black' | 'top' | 'isometric' | 'cinematic';

export interface MoveRecord {
  from: Square;
  to: Square;
  piece: PieceSymbol;
  color: Color;
  san: string;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  fen: string;
}

export interface CapturedPieces {
  w: PieceSymbol[];
  b: PieceSymbol[];
}

export interface ClockState {
  w: number; // seconds
  b: number; // seconds
  active: boolean;
  timeControl: number; // e.g. 0 for untimed, 180, 300, 600
}

export interface PendingPromotion {
  from: Square;
  to: Square;
  color: Color;
}
