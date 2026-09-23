"use client";

import { ChessHintBurst } from "@/components/chess-hint-burst";
import { ChessMoveLog } from "@/components/chess-move-log";
import { getHint, pickComputerMove, type HintResult } from "@/lib/chess-ai";
import {
  applyMove,
  BOARD_SQUARES,
  COMPUTER_COLOR,
  COMPUTER_LEVELS,
  createGame,
  describeMove,
  getComputerLevelLabel,
  getGameResult,
  getLegalMovesFromSquare,
  getPieceSymbol,
  getStatusMessage,
  HINTS_PER_GAME,
  HINT_UNLOCK_MS,
  isLightSquare,
  loadComputerLevel,
  loadGame,
  loadStats,
  needsPromotion,
  PLAYER_COLOR,
  PROMOTION_OPTIONS,
  recordResult,
  saveComputerLevel,
  type ComputerLevel,
  type GameResult,
  type LastPlayerMoveContext,
  type LoggedMove,
  type MoveInput,
  type PromotionPiece,
  type ChessStats,
} from "@/lib/chess";
import type { Move, Square } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";

type GamePhase = "menu" | "playing" | "gameover";

type PendingPromotion = {
  from: Square;
  to: Square;
};

type ActiveHint = {
  from: Square;
  to: Square;
};

const AI_DELAY_MS = 400;
const HINT_UNLOCK_SECONDS = HINT_UNLOCK_MS / 1000;

function resultHeadline(result: GameResult): string {
  switch (result) {
    case "player-win":
      return "You win!";
    case "player-loss":
      return "You lost";
    case "draw":
      return "Draw";
    default:
      return "Game over";
  }
}

export function ChessGameClient() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [fen, setFen] = useState(() => createGame().fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [stats, setStats] = useState<ChessStats>(() => loadStats());
  const [computerLevel, setComputerLevel] = useState<ComputerLevel>(() =>
    loadComputerLevel()
  );
  const [finalResult, setFinalResult] = useState<GameResult>("ongoing");
  const [moveLog, setMoveLog] = useState<LoggedMove[]>([]);
  const [hintsRemaining, setHintsRemaining] = useState(HINTS_PER_GAME);
  const [hintReady, setHintReady] = useState(false);
  const [hintSecondsLeft, setHintSecondsLeft] = useState(0);
  const [activeHint, setActiveHint] = useState<ActiveHint | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [showHintBurst, setShowHintBurst] = useState(false);
  const [pendingHint, setPendingHint] = useState<HintResult | null>(null);
  const [lastPlayerMoveContext, setLastPlayerMoveContext] =
    useState<LastPlayerMoveContext | null>(null);

  const game = useMemo(() => loadGame(fen), [fen]);
  const isThinking = aiPending;

  const recordMove = useCallback((applied: Move) => {
    setMoveLog((previous) => [
      ...previous,
      { label: describeMove(applied), color: applied.color },
    ]);
  }, []);

  const finishIfOver = useCallback((nextFen: string) => {
    const nextGame = loadGame(nextFen);
    const result = getGameResult(nextGame);

    if (result === "ongoing") {
      return false;
    }

    setFinalResult(result);
    setStats(recordResult(result));
    setPhase("gameover");
    setSelectedSquare(null);
    setLegalTargets([]);
    return true;
  }, []);

  const commitMove = useCallback(
    (move: MoveInput) => {
      const fenBefore = fen;
      const nextGame = loadGame(fen);
      const applied = applyMove(nextGame, move);

      if (!applied) {
        return;
      }

      if (applied.color === PLAYER_COLOR) {
        setLastPlayerMoveContext({ fenBefore, move: applied });
      }

      const nextFen = nextGame.fen();
      recordMove(applied);
      setFen(nextFen);
      setSelectedSquare(null);
      setLegalTargets([]);
      setPendingPromotion(null);
      setActiveHint(null);
      setHintMessage(null);

      if (!finishIfOver(nextFen) && nextGame.turn() === COMPUTER_COLOR) {
        setAiPending(true);
      }
    },
    [fen, finishIfOver, recordMove]
  );

  const startGame = useCallback(() => {
    const nextGame = createGame();
    setFen(nextGame.fen());
    setSelectedSquare(null);
    setLegalTargets([]);
    setPendingPromotion(null);
    setAiPending(false);
    setMoveLog([]);
    setHintsRemaining(HINTS_PER_GAME);
    setHintReady(false);
    setHintSecondsLeft(0);
    setActiveHint(null);
    setHintMessage(null);
    setShowHintBurst(false);
    setPendingHint(null);
    setLastPlayerMoveContext(null);
    setFinalResult("ongoing");
    setPhase("playing");
  }, []);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (phase !== "playing" || isThinking || pendingPromotion) {
        return;
      }

      if (game.turn() !== PLAYER_COLOR) {
        return;
      }

      const piece = game.get(square);

      if (selectedSquare && legalTargets.includes(square)) {
        if (needsPromotion(game, selectedSquare, square)) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        commitMove({ from: selectedSquare, to: square });
        return;
      }

      if (piece && piece.color === PLAYER_COLOR) {
        setSelectedSquare(square);
        setLegalTargets(getLegalMovesFromSquare(game, square));
        return;
      }

      setSelectedSquare(null);
      setLegalTargets([]);
    },
    [
      phase,
      isThinking,
      pendingPromotion,
      game,
      selectedSquare,
      legalTargets,
      commitMove,
    ]
  );

  const handleLevelChange = useCallback((level: ComputerLevel) => {
    setComputerLevel(level);
    saveComputerLevel(level);
  }, []);

  const playerTurn = game.turn();

  const handleHintBurstComplete = useCallback(() => {
    setShowHintBurst(false);

    if (!pendingHint) {
      return;
    }

    setActiveHint({
      from: pendingHint.move.from as Square,
      to: pendingHint.move.to as Square,
    });
    setHintMessage(pendingHint.message);
    setPendingHint(null);
  }, [pendingHint]);

  const handleHint = useCallback(() => {
    if (
      !hintReady ||
      hintsRemaining <= 0 ||
      phase !== "playing" ||
      isThinking ||
      playerTurn !== PLAYER_COLOR
    ) {
      return;
    }

    const hintStart = performance.now();
    const result = getHint(fen, lastPlayerMoveContext);
    const hintMs = Math.round(performance.now() - hintStart);
    // #region agent log
    fetch('http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'38d66a'},body:JSON.stringify({sessionId:'38d66a',location:'chess-game-client.tsx:handleHint',message:'getHint duration',data:{hintMs,hasResult:Boolean(result)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!result) {
      return;
    }

    setPendingHint(result);
    setShowHintBurst(true);
    setHintsRemaining((remaining) => remaining - 1);
  }, [
    hintReady,
    hintsRemaining,
    phase,
    isThinking,
    playerTurn,
    fen,
    lastPlayerMoveContext,
  ]);

  useEffect(() => {
    if (phase !== "playing" || playerTurn !== PLAYER_COLOR || isThinking) {
      return;
    }

    const timers: number[] = [];

    for (let elapsed = 0; elapsed < HINT_UNLOCK_SECONDS; elapsed++) {
      const secondsLeft = HINT_UNLOCK_SECONDS - elapsed;
      timers.push(
        window.setTimeout(() => {
          setHintSecondsLeft(secondsLeft);
        }, elapsed * 1000)
      );
    }

    timers.push(
      window.setTimeout(() => {
        // #region agent log
        fetch('http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'38d66a'},body:JSON.stringify({sessionId:'38d66a',location:'chess-game-client.tsx:hintTimer',message:'hint unlocked',data:{unlockMs:HINT_UNLOCK_MS},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setHintReady(true);
        setHintSecondsLeft(0);
      }, HINT_UNLOCK_MS)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      setHintReady(false);
      setHintSecondsLeft(0);
    };
  }, [phase, fen, isThinking, playerTurn]);

  const handlePromotion = useCallback(
    (promotion: PromotionPiece) => {
      if (!pendingPromotion) {
        return;
      }

      commitMove({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion,
      });
    },
    [pendingPromotion, commitMove]
  );

  useEffect(() => {
    if (!aiPending) {
      return;
    }

    const timer = window.setTimeout(() => {
      const aiStart = performance.now();
      const move = pickComputerMove(fen, computerLevel);
      const aiMs = Math.round(performance.now() - aiStart);
      // #region agent log
      fetch('http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'38d66a'},body:JSON.stringify({sessionId:'38d66a',location:'chess-game-client.tsx:aiTurn',message:'pickComputerMove duration',data:{aiMs,computerLevel,hasMove:Boolean(move)},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (move) {
        const nextGame = loadGame(fen);
        const applied = applyMove(nextGame, {
          from: move.from as Square,
          to: move.to as Square,
          promotion: move.promotion as PromotionPiece | undefined,
        });

        if (applied) {
          const nextFen = nextGame.fen();
          recordMove(applied);
          setFen(nextFen);
          finishIfOver(nextFen);
        }
      }

      setAiPending(false);
    }, AI_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [aiPending, fen, finishIfOver, computerLevel, recordMove]);

  const statusMessage =
    phase === "gameover"
      ? resultHeadline(finalResult)
      : isThinking
        ? "Computer is thinking…"
        : getStatusMessage(game);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="chess-glass-card rounded-3xl p-6 sm:p-8">
        {phase === "menu" && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--chess-muted)]">
                How to play
              </p>
              <p className="mt-2 text-[var(--chess-ink)]">
                You play as white. Tap a piece, then tap a highlighted square to
                move. Beat the computer with full chess rules — castling, en
                passant, and pawn promotion included.
              </p>
            </div>

            <fieldset>
              <legend className="text-sm font-bold uppercase tracking-widest text-[var(--chess-muted)]">
                Computer level
              </legend>
              <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10">
                {COMPUTER_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleLevelChange(level)}
                    className={`chess-level-btn ${
                      computerLevel === level ? "chess-level-btn-active" : ""
                    }`}
                    aria-pressed={computerLevel === level}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-[var(--chess-muted)]">
                Level {computerLevel} — {getComputerLevelLabel(computerLevel)}
              </p>
            </fieldset>

            {(stats.wins > 0 || stats.losses > 0 || stats.draws > 0) && (
              <div className="flex flex-wrap gap-2">
                <div className="chess-stat-pill">
                  Wins: <strong>{stats.wins}</strong>
                </div>
                <div className="chess-stat-pill">
                  Losses: <strong>{stats.losses}</strong>
                </div>
                <div className="chess-stat-pill">
                  Draws: <strong>{stats.draws}</strong>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={startGame}
              className="chess-btn-primary w-full sm:w-auto"
            >
              Play vs computer
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "gameover") && (
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="chess-stat-pill">{statusMessage}</div>
                {phase === "playing" && (
                  <button
                    type="button"
                    onClick={handleHint}
                    disabled={
                      !hintReady ||
                      hintsRemaining <= 0 ||
                      isThinking ||
                      playerTurn !== PLAYER_COLOR
                    }
                    className={
                      hintReady && hintsRemaining > 0
                        ? "chess-hint-btn"
                        : "chess-hint-btn chess-hint-btn-disabled"
                    }
                  >
                    {hintsRemaining <= 0
                      ? "Hint (0)"
                      : hintReady
                        ? `Hint (${hintsRemaining})`
                        : `Hint in ${hintSecondsLeft}s…`}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="chess-stat-pill">
                  Level: <strong>{computerLevel}</strong>
                </div>
                <div className="chess-stat-pill">
                  W: <strong>{stats.wins}</strong>
                </div>
                <div className="chess-stat-pill">
                  L: <strong>{stats.losses}</strong>
                </div>
                <div className="chess-stat-pill">
                  D: <strong>{stats.draws}</strong>
                </div>
              </div>
            </div>

            {hintMessage && (
              <p className="chess-hint-message">{hintMessage}</p>
            )}

            <div className="chess-play-layout">
              <div className="chess-board-wrap chess-board-wrap-relative">
                {showHintBurst && (
                  <ChessHintBurst onComplete={handleHintBurstComplete} />
                )}
                <div className="chess-board" role="grid" aria-label="Chess board">
                  {BOARD_SQUARES.map((square) => {
                    const piece = game.get(square);
                    const isSelected = selectedSquare === square;
                    const isTarget = legalTargets.includes(square);
                    const isCaptureTarget =
                      isTarget && Boolean(piece) && piece?.color === COMPUTER_COLOR;
                    const isHintFrom = activeHint?.from === square;
                    const isHintTo = activeHint?.to === square;

                    return (
                      <button
                        key={square}
                        type="button"
                        role="gridcell"
                        aria-label={piece ? `${square} ${piece.color} ${piece.type}` : square}
                        disabled={phase === "gameover" || isThinking}
                        onClick={() => handleSquareClick(square)}
                        className={[
                          "chess-square",
                          isLightSquare(square)
                            ? "chess-square-light"
                            : "chess-square-dark",
                          isSelected ? "chess-square-selected" : "",
                          isTarget ? "chess-square-target" : "",
                          isCaptureTarget ? "chess-square-capture" : "",
                          isHintFrom ? "chess-square-hint-from" : "",
                          isHintTo ? "chess-square-hint-to" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {piece && (
                          <span
                            className={[
                              "chess-piece",
                              piece.color === "w"
                                ? "chess-piece-white"
                                : "chess-piece-black",
                            ].join(" ")}
                            aria-hidden
                          >
                            {getPieceSymbol(piece.color, piece.type)}
                          </span>
                        )}
                        {isTarget && !piece && (
                          <span className="chess-move-dot" aria-hidden />
                        )}
                        {isHintTo && !isTarget && (
                          <span className="chess-hint-dot" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ChessMoveLog moves={moveLog} />
            </div>

            {pendingPromotion && (
              <div className="chess-promotion-panel">
                <p className="text-sm font-semibold text-[var(--chess-ink)]">
                  Promote pawn to:
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {PROMOTION_OPTIONS.map((option) => (
                    <button
                      key={option.piece}
                      type="button"
                      onClick={() => handlePromotion(option.piece)}
                      className="chess-promotion-btn"
                    >
                      <span className="text-2xl" aria-hidden>
                        {getPieceSymbol(PLAYER_COLOR, option.piece)}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === "gameover" && (
              <div className="flex w-full flex-col items-center gap-4 text-center">
                <p className="text-2xl font-extrabold text-[var(--chess-ink)]">
                  {resultHeadline(finalResult)}
                </p>
                <p className="text-[var(--chess-muted)]">
                  {getStatusMessage(game)}
                </p>
                <button
                  type="button"
                  onClick={startGame}
                  className="chess-btn-primary w-full sm:w-auto"
                >
                  Play again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
