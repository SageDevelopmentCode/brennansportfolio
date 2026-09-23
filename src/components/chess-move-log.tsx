"use client";

import { groupMovesForLog, type LoggedMove } from "@/lib/chess";
import { useEffect, useRef } from "react";

type ChessMoveLogProps = {
  moves: LoggedMove[];
};

export function ChessMoveLog({ moves }: ChessMoveLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = groupMovesForLog(moves);
  const latestRowIndex = rows.length - 1;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [moves.length]);

  return (
    <aside className="chess-move-log" aria-label="Move log">
      <div className="chess-move-log-header">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--chess-muted)]">
          Move log
        </h2>
        <span className="text-xs font-semibold text-[var(--chess-muted)]">
          {moves.length} {moves.length === 1 ? "move" : "moves"}
        </span>
      </div>

      <div ref={scrollRef} className="chess-move-log-scroll">
        {rows.length === 0 ? (
          <p className="chess-move-log-empty">No moves yet</p>
        ) : (
          <ol className="chess-move-log-list">
            {rows.map((row, index) => (
              <li
                key={row.moveNumber}
                className={`chess-move-log-row ${
                  index === latestRowIndex ? "chess-move-log-row-active" : ""
                }`}
              >
                <span className="chess-move-log-number">{row.moveNumber}.</span>
                <span className="chess-move-log-label">{row.white ?? "…"}</span>
                <span className="chess-move-log-label">{row.black ?? ""}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
