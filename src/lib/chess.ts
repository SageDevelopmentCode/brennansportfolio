import {
  Chess,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
} from "chess.js";

export const STATS_STORAGE_KEY = "chess-stats";
export const DIFFICULTY_STORAGE_KEY = "chess-difficulty";
export const DEFAULT_COMPUTER_LEVEL = 5;
export const HINTS_PER_GAME = 3;
export const HINT_UNLOCK_MS = 5000;

export type LastPlayerMoveContext = {
  fenBefore: string;
  move: Move;
};

export type ComputerLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const COMPUTER_LEVELS: ComputerLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type ChessStats = {
  wins: number;
  losses: number;
  draws: number;
};

export type PromotionPiece = "q" | "r" | "b" | "n";

export type MoveInput = {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
};

export type GameResult = "ongoing" | "player-win" | "player-loss" | "draw";

export const PLAYER_COLOR: Color = "w";
export const COMPUTER_COLOR: Color = "b";

export const PIECE_SYMBOLS: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

export const PROMOTION_OPTIONS: { piece: PromotionPiece; label: string }[] = [
  { piece: "q", label: "Queen" },
  { piece: "r", label: "Rook" },
  { piece: "b", label: "Bishop" },
  { piece: "n", label: "Knight" },
];

const FILES = "abcdefgh";

export const BOARD_SQUARES: Square[] = [];
for (let rank = 8; rank >= 1; rank--) {
  for (let file = 0; file < 8; file++) {
    BOARD_SQUARES.push(`${FILES[file]}${rank}` as Square);
  }
}

export function createGame(): Chess {
  return new Chess();
}

export function loadGame(fen: string): Chess {
  return new Chess(fen);
}

export function applyMove(game: Chess, move: MoveInput): Move | null {
  try {
    return game.move(move);
  } catch {
    return null;
  }
}

export function getLegalMovesFromSquare(game: Chess, square: Square): Square[] {
  const moves = game.moves({ square, verbose: true }) as Move[];
  return moves.map((move) => move.to);
}

export function needsPromotion(
  game: Chess,
  from: Square,
  to: Square
): boolean {
  const piece = game.get(from);
  if (!piece || piece.type !== "p") {
    return false;
  }

  const rank = to[1];
  return (
    (piece.color === "w" && rank === "8") ||
    (piece.color === "b" && rank === "1")
  );
}

export function getGameResult(
  game: Chess,
  playerColor: Color = PLAYER_COLOR
): GameResult {
  if (!game.isGameOver()) {
    return "ongoing";
  }

  if (game.isDraw()) {
    return "draw";
  }

  if (game.isCheckmate()) {
    return game.turn() === playerColor ? "player-loss" : "player-win";
  }

  return "draw";
}

export function getStatusMessage(game: Chess): string {
  if (game.isCheckmate()) {
    return game.turn() === PLAYER_COLOR
      ? "Checkmate — you lost"
      : "Checkmate — you win!";
  }

  if (game.isStalemate()) {
    return "Stalemate — draw";
  }

  if (game.isDraw()) {
    if (game.isInsufficientMaterial()) {
      return "Draw — insufficient material";
    }
    if (game.isThreefoldRepetition()) {
      return "Draw — threefold repetition";
    }
    if (game.isDrawByFiftyMoves()) {
      return "Draw — fifty-move rule";
    }
    return "Draw";
  }

  if (game.inCheck()) {
    return game.turn() === PLAYER_COLOR ? "You are in check" : "Computer is in check";
  }

  return game.turn() === PLAYER_COLOR ? "Your turn" : "Computer is thinking…";
}

export function loadStats(): ChessStats {
  if (typeof window === "undefined") {
    return { wins: 0, losses: 0, draws: 0 };
  }

  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) {
      return { wins: 0, losses: 0, draws: 0 };
    }

    const parsed = JSON.parse(raw) as Partial<ChessStats>;
    return {
      wins: parsed.wins ?? 0,
      losses: parsed.losses ?? 0,
      draws: parsed.draws ?? 0,
    };
  } catch {
    return { wins: 0, losses: 0, draws: 0 };
  }
}

export function recordResult(result: Exclude<GameResult, "ongoing">): ChessStats {
  const stats = loadStats();

  if (result === "player-win") {
    stats.wins += 1;
  } else if (result === "player-loss") {
    stats.losses += 1;
  } else {
    stats.draws += 1;
  }

  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

export function isLightSquare(square: Square): boolean {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number.parseInt(square[1], 10) - 1;
  return (file + rank) % 2 === 0;
}

export function getPieceSymbol(
  color: Color,
  type: PieceSymbol
): string {
  return PIECE_SYMBOLS[color][type];
}

export function isComputerLevel(value: number): value is ComputerLevel {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

export function getComputerLevelLabel(level: ComputerLevel): string {
  if (level <= 2) {
    return "Beginner";
  }
  if (level <= 4) {
    return "Easy";
  }
  if (level <= 6) {
    return "Casual";
  }
  if (level <= 8) {
    return "Tough";
  }
  return "Expert";
}

export function loadComputerLevel(): ComputerLevel {
  if (typeof window === "undefined") {
    return DEFAULT_COMPUTER_LEVEL;
  }

  try {
    const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_COMPUTER_LEVEL;
    }

    const parsed = Number.parseInt(raw, 10);
    return isComputerLevel(parsed) ? parsed : DEFAULT_COMPUTER_LEVEL;
  } catch {
    return DEFAULT_COMPUTER_LEVEL;
  }
}

export function saveComputerLevel(level: ComputerLevel): void {
  localStorage.setItem(DIFFICULTY_STORAGE_KEY, String(level));
}

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const RANK_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function rankWord(square: Square): string {
  const rank = Number.parseInt(square[1], 10);
  return RANK_WORDS[rank - 1] ?? String(rank);
}

export function describeMove(move: Move): string {
  const piece = PIECE_NAMES[move.piece];

  if (move.isKingsideCastle()) {
    return "King castled kingside";
  }

  if (move.isQueensideCastle()) {
    return "King castled queenside";
  }

  if (move.isPromotion() && move.promotion) {
    return `${capitalize(piece)} became a ${PIECE_NAMES[move.promotion]}`;
  }

  if (move.isCapture()) {
    const captured = move.captured ? PIECE_NAMES[move.captured] : "pawn";
    return `${capitalize(piece)} captured ${captured}`;
  }

  return `${capitalize(piece)} moved to ${rankWord(move.to)}`;
}

export type LoggedMove = {
  label: string;
  color: Color;
};

export type MoveLogRow = {
  moveNumber: number;
  white?: string;
  black?: string;
};

export function groupMovesForLog(moves: LoggedMove[]): MoveLogRow[] {
  const rows: MoveLogRow[] = [];

  for (const move of moves) {
    if (move.color === PLAYER_COLOR) {
      rows.push({
        moveNumber: rows.length + 1,
        white: move.label,
      });
      continue;
    }

    const currentRow = rows.at(-1);
    if (currentRow && !currentRow.black) {
      currentRow.black = move.label;
      continue;
    }

    rows.push({
      moveNumber: rows.length + 1,
      black: move.label,
    });
  }

  return rows;
}
