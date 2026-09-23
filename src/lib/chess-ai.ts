import type { ComputerLevel, LastPlayerMoveContext } from "@/lib/chess";
import { Chess, type Move, type PieceSymbol } from "chess.js";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20_000,
};

const CENTER_BONUS: Record<string, number> = {
  d4: 12,
  e4: 12,
  d5: 12,
  e5: 12,
  c3: 6,
  d3: 6,
  e3: 6,
  f3: 6,
  c4: 6,
  f4: 6,
  c5: 6,
  f5: 6,
  c6: 6,
  d6: 6,
  e6: 6,
  f6: 6,
};

type SearchConfig = {
  depth: number;
  randomChance: number;
  topMoves: number;
  strongEval: boolean;
};

export type ComputerMove = {
  from: string;
  to: string;
  promotion?: string;
};

export type HintResult = {
  move: ComputerMove;
  message: string;
};

const HINT_SEARCH_DEPTH = 4;

function getSearchConfig(level: ComputerLevel): SearchConfig {
  if (level <= 2) {
    return { depth: 1, randomChance: level === 1 ? 0.9 : 0.75, topMoves: 1, strongEval: false };
  }
  if (level <= 4) {
    return { depth: 1, randomChance: 0, topMoves: 3, strongEval: false };
  }
  if (level <= 6) {
    return { depth: 2, randomChance: 0, topMoves: 2, strongEval: false };
  }
  if (level <= 8) {
    return { depth: 3, randomChance: 0, topMoves: 1, strongEval: false };
  }
  return { depth: 3, randomChance: 0, topMoves: 1, strongEval: true };
}

export function pickComputerMove(
  fen: string,
  level: ComputerLevel
): ComputerMove | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];

  if (moves.length === 0) {
    return null;
  }

  const config = getSearchConfig(level);

  if (Math.random() < config.randomChance) {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return toComputerMove(randomMove);
  }

  const scoredMoves: { move: Move; score: number }[] = [];

  for (const move of moves) {
    game.move(move);
    const score = minimax(
      game,
      config.depth - 1,
      -Infinity,
      Infinity,
      config.strongEval
    );
    game.undo();
    scoredMoves.push({ move, score });
  }

  scoredMoves.sort((a, b) => b.score - a.score);

  const bestScore = scoredMoves[0].score;
  const candidates = scoredMoves
    .filter((entry) => entry.score === bestScore)
    .map((entry) => entry.move);

  const topPool = scoredMoves
    .slice(0, Math.min(config.topMoves, scoredMoves.length))
    .map((entry) => entry.move);

  const pool = config.topMoves === 1 ? candidates : topPool;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  return toComputerMove(chosen);
}

export function pickHintMove(fen: string): ComputerMove | null {
  const start = performance.now();
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];

  if (moves.length === 0) {
    return null;
  }

  let bestScore = Infinity;
  let bestMoves: Move[] = [];

  for (const move of moves) {
    game.move(move);
    const score = minimax(
      game,
      HINT_SEARCH_DEPTH - 1,
      -Infinity,
      Infinity,
      true
    );
    game.undo();

    if (score < bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  const result = toComputerMove(chosen);
  // #region agent log
  fetch('http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'38d66a'},body:JSON.stringify({sessionId:'38d66a',location:'chess-ai.ts:pickHintMove',message:'hint search done',data:{hintSearchMs:Math.round(performance.now()-start),moveCount:moves.length,depth:HINT_SEARCH_DEPTH},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  return result;
}

export function analyzeLastPlayerMove(
  fenBefore: string,
  move: Move
): string {
  const game = new Chess(fenBefore);
  const scoreBefore = evaluateForWhite(game, true);

  game.move(move);
  const scoreAfter = evaluateForWhite(game, true);
  const delta = scoreAfter - scoreBefore;

  if (delta <= -150) {
    return "Careful — your last move left you in trouble.";
  }

  if (delta < -30) {
    return "Your last move was okay, but try this next.";
  }

  return "Good move! Here's a strong follow-up.";
}

export function getHint(
  fen: string,
  lastPlayerMove: LastPlayerMoveContext | null
): HintResult | null {
  const move = pickHintMove(fen);

  if (!move) {
    return null;
  }

  const message = lastPlayerMove
    ? analyzeLastPlayerMove(lastPlayerMove.fenBefore, lastPlayerMove.move)
    : "Here's a strong opening move.";

  return { move, message };
}

function evaluateForWhite(game: Chess, strongEval: boolean): number {
  return -evaluate(game, strongEval);
}

function toComputerMove(move: Move): ComputerMove {
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  };
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  strongEval: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluate(game, strongEval);
  }

  const maximizing = game.turn() === "b";
  const moves = game.moves({ verbose: true }) as Move[];

  if (maximizing) {
    let maxEval = -Infinity;

    for (const move of moves) {
      game.move(move);
      const score = minimax(game, depth - 1, alpha, beta, strongEval);
      game.undo();
      maxEval = Math.max(maxEval, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break;
      }
    }

    return maxEval;
  }

  let minEval = Infinity;

  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, alpha, beta, strongEval);
    game.undo();
    minEval = Math.min(minEval, score);
    beta = Math.min(beta, score);
    if (beta <= alpha) {
      break;
    }
  }

  return minEval;
}

function evaluate(game: Chess, strongEval: boolean): number {
  if (game.isCheckmate()) {
    return game.turn() === "b" ? -100_000 : 100_000;
  }

  if (game.isDraw()) {
    return 0;
  }

  const mobilityWeight = strongEval ? 4 : 2;
  const checkWeight = strongEval ? 40 : 25;
  const positionalMultiplier = strongEval ? 1.5 : 1;

  let score = 0;
  const board = game.board();

  for (const row of board) {
    for (const cell of row) {
      if (!cell) {
        continue;
      }

      const value = PIECE_VALUES[cell.type];
      const positional = (CENTER_BONUS[cell.square] ?? 0) * positionalMultiplier;
      const total = value + positional;

      score += cell.color === "b" ? total : -total;
    }
  }

  const mobility = game.moves().length;
  score += game.turn() === "b" ? mobility * mobilityWeight : -mobility * mobilityWeight;

  if (game.inCheck()) {
    score += game.turn() === "b" ? -checkWeight : checkWeight;
  }

  return score;
}
