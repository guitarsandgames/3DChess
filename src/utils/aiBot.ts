import { Chess, Square, Move, PieceSymbol } from 'chess.js';
import { AIDifficulty, AIOpponent } from '../types';

export const AI_OPPONENTS: AIOpponent[] = [
  {
    id: 'novice',
    name: 'Spark',
    title: 'Novice Cadet',
    elo: 450,
    badge: 'LVL 1',
    colorClass: 'emerald',
    description: 'Friendly, exploratory bot. Makes occasional blunders and focuses on simple single-step moves.',
    style: 'Casual & Relaxed',
    depth: 1,
    blunderRate: 0.65,
    quiescence: false,
  },
  {
    id: 'casual',
    name: 'Scout',
    title: 'Apprentice Bot',
    elo: 850,
    badge: 'LVL 2',
    colorClass: 'sky',
    description: 'Understands basic pawn structure and piece development. Takes free pieces when obvious.',
    style: 'Developing Fundamentals',
    depth: 2,
    blunderRate: 0.35,
    quiescence: false,
  },
  {
    id: 'intermediate',
    name: 'Sentinel',
    title: 'Club Player',
    elo: 1300,
    badge: 'LVL 3',
    colorClass: 'amber',
    description: 'Solid positional play. Protects pieces, controls central squares, and guards the king.',
    style: 'Balanced & Defensive',
    depth: 2,
    blunderRate: 0.12,
    quiescence: true,
  },
  {
    id: 'advanced',
    name: 'Striker',
    title: 'Tactical Striker',
    elo: 1700,
    badge: 'LVL 4',
    colorClass: 'orange',
    description: 'Sharp attacking style. Actively looks for pins, forks, mating nets, and double attacks.',
    style: 'Aggressive & Tactical',
    depth: 3,
    blunderRate: 0.03,
    quiescence: true,
  },
  {
    id: 'expert',
    name: 'Mastermind',
    title: 'Master Strategist',
    elo: 2100,
    badge: 'LVL 5',
    colorClass: 'purple',
    description: 'Deep positional evaluation. Controls open files, pawn chains, bishop pairs, and endgame king activity.',
    style: 'Positional Mastery',
    depth: 3,
    blunderRate: 0.0,
    quiescence: true,
  },
  {
    id: 'grandmaster',
    name: 'Titan GM',
    title: 'Grandmaster Engine',
    elo: 2500,
    badge: 'LVL 6',
    colorClass: 'rose',
    description: 'Formidable chess engine with deep alpha-beta search, quiescence captures, and tactical precision.',
    style: 'Grandmaster Precision',
    depth: 4,
    blunderRate: 0.0,
    quiescence: true,
  },
];

export function normalizeAIDifficulty(diff?: string): AIDifficulty {
  if (!diff) return 'intermediate';
  if (diff === 'easy') return 'novice';
  if (diff === 'medium') return 'intermediate';
  if (diff === 'hard') return 'expert';
  const valid: AIDifficulty[] = ['novice', 'casual', 'intermediate', 'advanced', 'expert', 'grandmaster'];
  if (valid.includes(diff as AIDifficulty)) {
    return diff as AIDifficulty;
  }
  return 'intermediate';
}

export function getAIOpponent(diff?: string | AIDifficulty): AIOpponent {
  const norm = normalizeAIDifficulty(diff);
  const found = AI_OPPONENTS.find((o) => o.id === norm);
  return found || AI_OPPONENTS[2]; // Default to intermediate/sentinel
}

// Standard piece values (in centipawns)
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (White perspective; flipped for Black)
const PAWN_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 27, 27, 10,  5,  5,
   0,  0,  0, 24, 24,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_PST_MID = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

const KING_PST_END = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
];

function getSquareIndex(square: Square, color: 'w' | 'b'): number {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1], 10);
  if (color === 'w') {
    return rank * 8 + file;
  }
  return (7 - rank) * 8 + file;
}

function isEndgame(game: Chess): boolean {
  const board = game.board();
  let majorCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && (piece.type === 'q' || piece.type === 'r')) {
        majorCount++;
      }
    }
  }
  return majorCount <= 2;
}

function evaluateBoard(game: Chess): number {
  let score = 0;
  const board = game.board();
  const endgame = isEndgame(game);

  let whiteBishops = 0;
  let blackBishops = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;

      const square = `${String.fromCharCode(97 + f)}${8 - r}` as Square;
      const idx = getSquareIndex(square, piece.color);

      const pieceVal = PIECE_VALUES[piece.type] || 0;
      let posVal = 0;

      switch (piece.type) {
        case 'p':
          posVal = PAWN_PST[idx] || 0;
          break;
        case 'n':
          posVal = KNIGHT_PST[idx] || 0;
          break;
        case 'b':
          posVal = BISHOP_PST[idx] || 0;
          if (piece.color === 'w') whiteBishops++;
          else blackBishops++;
          break;
        case 'r':
          posVal = ROOK_PST[idx] || 0;
          break;
        case 'q':
          posVal = QUEEN_PST[idx] || 0;
          break;
        case 'k':
          posVal = endgame ? KING_PST_END[idx] || 0 : KING_PST_MID[idx] || 0;
          break;
      }

      const totalVal = pieceVal + posVal;
      if (piece.color === 'w') {
        score += totalVal;
      } else {
        score -= totalVal;
      }
    }
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) score += 35;
  if (blackBishops >= 2) score -= 35;

  return score;
}

// MVV-LVA move ordering heuristic
function scoreMove(move: Move): number {
  let moveScore = 0;
  if (move.captured) {
    const victimVal = PIECE_VALUES[move.captured] || 100;
    const attackerVal = PIECE_VALUES[move.piece] || 100;
    moveScore += 1000 + (victimVal * 10 - attackerVal);
  }
  if (move.promotion) {
    moveScore += 900;
  }
  if (move.san.includes('+') || move.san.includes('#')) {
    moveScore += 200;
  }
  return moveScore;
}

function orderMoves(moves: Move[]): Move[] {
  return moves.slice().sort((a, b) => scoreMove(b) - scoreMove(a));
}

// Quiescence search to avoid the horizon effect on captures
function quiescence(
  game: Chess,
  alpha: number,
  beta: number,
  maxQDepth: number,
  isMaximizing: boolean
): number {
  const standPat = evaluateBoard(game);

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (beta > standPat) beta = standPat;
  }

  if (maxQDepth <= 0 || game.isGameOver()) {
    return standPat;
  }

  const captureMoves = orderMoves(
    game.moves({ verbose: true }).filter((m) => !!m.captured || !!m.promotion)
  );

  if (captureMoves.length === 0) {
    return standPat;
  }

  if (isMaximizing) {
    for (const move of captureMoves) {
      game.move(move);
      const score = quiescence(game, alpha, beta, maxQDepth - 1, false);
      game.undo();

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  } else {
    for (const move of captureMoves) {
      game.move(move);
      const score = quiescence(game, alpha, beta, maxQDepth - 1, true);
      game.undo();

      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
    return beta;
  }
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  useQuiescence: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) {
      return isMaximizing ? -99999 + (5 - depth) : 99999 - (5 - depth);
    }
    if (game.isDraw()) {
      return 0;
    }
    if (useQuiescence) {
      return quiescence(game, alpha, beta, 2, isMaximizing);
    }
    return evaluateBoard(game);
  }

  const rawMoves = game.moves({ verbose: true });
  const moves = orderMoves(rawMoves);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalVal = minimax(
        game,
        depth - 1,
        alpha,
        beta,
        false,
        useQuiescence
      );
      game.undo();
      maxEval = Math.max(maxEval, evalVal);
      alpha = Math.max(alpha, evalVal);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalVal = minimax(
        game,
        depth - 1,
        alpha,
        beta,
        true,
        useQuiescence
      );
      game.undo();
      minEval = Math.min(minEval, evalVal);
      beta = Math.min(beta, evalVal);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestMove(
  game: Chess,
  difficulty: AIDifficulty
): Move | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  const opponent = getAIOpponent(difficulty);

  // Blunder / casual random move chance based on difficulty level
  if (opponent.blunderRate > 0 && Math.random() < opponent.blunderRate) {
    // For novice: pure random or immediate capture
    const captureMoves = moves.filter((m) => !!m.captured);
    if (captureMoves.length > 0 && Math.random() < 0.5) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const isMaximizing = game.turn() === 'w';
  const depth = opponent.depth;

  let bestMove: Move = moves[0];
  let bestScore = isMaximizing ? -Infinity : Infinity;

  // Add slight randomized shuffling among equal-scoring moves
  const orderedMoves = orderMoves(moves);

  for (const move of orderedMoves) {
    game.move(move);
    const score = minimax(
      game,
      depth - 1,
      -Infinity,
      Infinity,
      !isMaximizing,
      opponent.quiescence
    );
    game.undo();

    // Introduce tiny random noise (+/- 2 centipawns) for natural opening play
    const jitter = (Math.random() - 0.5) * 4;
    const adjustedScore = score + jitter;

    if (isMaximizing) {
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMove = move;
      }
    } else {
      if (adjustedScore < bestScore) {
        bestScore = adjustedScore;
        bestMove = move;
      }
    }
  }

  return bestMove;
}
