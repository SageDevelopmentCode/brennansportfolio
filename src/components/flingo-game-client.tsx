"use client";

import { drawGame } from "@/lib/flingo/draw";
import {
  createState,
  loadBest,
  releaseAim,
  resizeState,
  saveBest,
  startAim,
  tick,
  tryDash,
  updateAim,
  type BestRecord,
  type GameState,
} from "@/lib/flingo/engine";
import { playFlingoSound, resumeFlingoAudio, setFlingoMuted } from "@/lib/flingo/sounds";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Phase = "menu" | "playing" | "paused" | "gameover";

type Summary = {
  score: number;
  height: number;
  combo: number;
  smashes: number;
  flings: number;
  stars: number;
  newBest: boolean;
  line: string;
};

const DEATH_LINES = [
  "Gravity wins. For now.",
  "That was a spectacular plummet.",
  "The void ate your vibe.",
  "Blob down. Blob not out.",
  "You flinged. You bonked. You fell.",
  "Science? Never heard of her.",
  "Peak chaos achieved. Then the floor.",
  "Respectfully: yeet harder next time.",
];

const bestListeners = new Set<() => void>();

function subscribeBest(cb: () => void) {
  bestListeners.add(cb);
  return () => {
    bestListeners.delete(cb);
  };
}

function readBestRaw() {
  try {
    return localStorage.getItem("flingo-best-v1") ?? "";
  } catch {
    return "";
  }
}

function notifyBest() {
  bestListeners.forEach((l) => l());
}

function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function parseBest(raw: string): BestRecord | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BestRecord;
  } catch {
    return null;
  }
}

export function FlingoGameClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const pointerIdRef = useRef<number | null>(null);
  const aimingRef = useRef(false);
  const lastTs = useRef(0);
  const hudRef = useRef({ score: 0, height: 0, combo: 0, dash: 2 });

  const [phase, setPhase] = useState<Phase>("menu");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState(hudRef.current);

  const bestRaw = useSyncExternalStore(subscribeBest, readBestRaw, () => "");
  const best = parseBest(bestRaw);
  const isTouch = useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );

  const goPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const startGame = useCallback(() => {
    resumeFlingoAudio();
    const canvas = canvasRef.current;
    const w = canvas?.clientWidth || window.innerWidth;
    const h = canvas?.clientHeight || window.innerHeight;
    stateRef.current = createState(w, h);
    setSummary(null);
    aimingRef.current = false;
    pointerIdRef.current = null;
    goPhase("playing");
    playFlingoSound("fling");
  }, [goPhase]);

  const endGame = useCallback(
    (s: GameState) => {
      const prev = loadBest();
      const rec: BestRecord = {
        score: Math.max(prev.score, Math.floor(s.score)),
        height: Math.max(prev.height, Math.floor(s.maxHeight)),
        combo: Math.max(prev.combo, s.bestCombo),
        smashes: Math.max(prev.smashes, s.smashes),
      };
      const newBest = Math.floor(s.score) > prev.score;
      saveBest(rec);
      notifyBest();
      setSummary({
        score: Math.floor(s.score),
        height: Math.floor(s.maxHeight),
        combo: s.bestCombo,
        smashes: s.smashes,
        flings: s.flings,
        stars: s.stars,
        newBest,
        line: DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)]!,
      });
      goPhase("gameover");
    },
    [goPhase],
  );

  const quitToMenu = useCallback(() => {
    stateRef.current = null;
    setSummary(null);
    goPhase("menu");
  }, [goPhase]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === "playing") goPhase("paused");
    else if (phaseRef.current === "paused") goPhase("playing");
  }, [goPhase]);

  useEffect(() => {
    setFlingoMuted(muted);
  }, [muted]);

  // Resize + game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (stateRef.current) resizeState(stateRef.current, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const loop = (ts: number) => {
      const dt = lastTs.current ? Math.min(0.05, (ts - lastTs.current) / 1000) : 0.016;
      lastTs.current = ts;
      const s = stateRef.current;
      const phaseNow = phaseRef.current;

      if (s && phaseNow === "playing") {
        tick(s, dt);
        for (const ev of s.events) playFlingoSound(ev);
        if (!s.alive) endGame(s);

        const nextHud = {
          score: Math.floor(s.score),
          height: Math.floor(s.maxHeight),
          combo: s.combo,
          dash: s.player.dash,
        };
        const prev = hudRef.current;
        if (
          prev.score !== nextHud.score ||
          prev.height !== nextHud.height ||
          prev.combo !== nextHud.combo ||
          prev.dash !== nextHud.dash
        ) {
          hudRef.current = nextHud;
          setHud(nextHud);
        }
      }

      // Always paint something
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (s && (phaseNow === "playing" || phaseNow === "paused" || phaseNow === "gameover")) {
        drawGame(ctx, s);
        if (phaseNow === "paused") {
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        // Menu backdrop
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#0ea5e9");
        g.addColorStop(0.5, "#f97316");
        g.addColorStop(1, "#7c3aed");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        // floating blobs
        const t = ts / 1000;
        for (let i = 0; i < 12; i++) {
          const x = ((i * 97 + t * (20 + i)) % (w + 80)) - 40;
          const y = 80 + ((i * 73) % (h - 100));
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.fillStyle = ["#fde68a", "#f9a8d4", "#67e8f9", "#c4b5fd"][i % 4]!;
          ctx.arc(x, y + Math.sin(t + i) * 12, 18 + (i % 4) * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [endGame]);

  // Input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const localPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (phaseRef.current !== "playing") return;
      const s = stateRef.current;
      if (!s) return;
      resumeFlingoAudio();
      const { x, y } = localPoint(e);

      if (s.player.grounded) {
        pointerIdRef.current = e.pointerId;
        aimingRef.current = true;
        canvas.setPointerCapture(e.pointerId);
        startAim(s, x, y);
      } else {
        tryDash(s, x, y);
        for (const ev of s.events) playFlingoSound(ev);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!aimingRef.current || e.pointerId !== pointerIdRef.current) return;
      const s = stateRef.current;
      if (!s) return;
      const { x, y } = localPoint(e);
      updateAim(s, x, y);
    };

    const onUp = (e: PointerEvent) => {
      if (!aimingRef.current || e.pointerId !== pointerIdRef.current) return;
      const s = stateRef.current;
      aimingRef.current = false;
      pointerIdRef.current = null;
      if (!s) return;
      releaseAim(s);
      for (const ev of s.events) playFlingoSound(ev);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        togglePause();
        return;
      }
      if (e.code === "KeyM") {
        setMuted((m) => !m);
        return;
      }
      if (phaseRef.current === "menu" && (e.code === "Space" || e.code === "Enter")) {
        startGame();
        return;
      }
      if (phaseRef.current === "gameover" && (e.code === "Space" || e.code === "Enter")) {
        startGame();
        return;
      }
      if (phaseRef.current !== "playing") return;
      const s = stateRef.current;
      if (!s) return;
      if (e.code === "Space" && !s.player.grounded) {
        // dash upward-ish
        tryDash(s, s.player.x, 40);
        for (const ev of s.events) playFlingoSound(ev);
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [startGame, togglePause]);

  return (
    <div className="flingo-theme relative h-[100dvh] w-full overflow-hidden bg-[#0c4a6e] select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      {phase === "playing" && (
        <>
          <div className="pointer-events-none absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex flex-col gap-1">
            <p className="text-3xl font-bold text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.45)]">
              {hud.score.toLocaleString()}
            </p>
            <p className="text-sm font-semibold text-white/85 drop-shadow">
              ▲ {hud.height.toLocaleString()}m
              {hud.combo > 1 ? ` · x${hud.combo}` : ""}
            </p>
          </div>
          <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-xl text-white backdrop-blur transition hover:bg-black/60"
              aria-label="Mute"
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              type="button"
              onClick={togglePause}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-xl text-white backdrop-blur transition hover:bg-black/60"
              aria-label="Pause"
            >
              ⏸
            </button>
          </div>
          {!isTouch && (
            <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/30 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
              Drag to fling · tap / space mid-air to YEET
            </p>
          )}
        </>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center">
          <div className="animate-bounce text-7xl drop-shadow-[0_8px_0_rgba(0,0,0,0.25)] sm:text-8xl">
            🟠
          </div>
          <h1
            className="mt-1 text-6xl font-bold tracking-tight text-amber-200 sm:text-8xl"
            style={{
              textShadow:
                "0 6px 0 #9a3412, 0 10px 0 rgba(0,0,0,0.35), 0 0 40px rgba(251,146,60,0.55)",
              WebkitTextStroke: "2px #7c2d12",
            }}
          >
            FLINGO
          </h1>
          <p className="mt-4 max-w-md text-lg font-semibold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.55)] sm:text-xl">
            Drag. Fling. Smash floating junk. Climb forever.
            <br />
            <span className="text-amber-200">Zero lessons. Maximum yeet.</span>
          </p>
          <button
            type="button"
            onClick={startGame}
            className="mt-8 rounded-full border-4 border-amber-100 bg-gradient-to-b from-amber-300 to-orange-500 px-14 py-5 text-3xl font-bold text-orange-950 shadow-[0_8px_0_#9a3412,0_14px_30px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:shadow-[0_10px_0_#9a3412,0_18px_34px_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_3px_0_#9a3412]"
          >
            FLING 🚀
          </button>
          <div className="mt-8 grid max-w-lg gap-1 rounded-2xl bg-black/35 px-6 py-4 text-sm font-semibold text-white/90 backdrop-blur sm:text-base">
            <p>{isTouch ? "👆 Drag back on the blob to aim, release to launch" : "🖱️ Drag back on the blob to aim, release to launch"}</p>
            <p>{isTouch ? "💥 Tap mid-air to YEET (2 dashes per landing)" : "💥 Click / Space mid-air to YEET (2 dashes)"}</p>
            <p>🍩 Smash snacks for combos · 🟢 green pads BOING</p>
            <p>⚠️ Spinny saws are rude. Ignore them with style.</p>
          </div>
          {best && best.score > 0 && (
            <p className="mt-5 text-base font-bold text-amber-100 drop-shadow-[0_2px_0_rgba(0,0,0,0.55)]">
              🏆 Best: {best.score.toLocaleString()} pts · {best.height.toLocaleString()}m · x
              {best.combo} combo
            </p>
          )}
          <Link
            href="/"
            className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-black/35 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-black/55"
          >
            ← Hub
          </Link>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/55 backdrop-blur-sm">
          <h2 className="text-6xl font-bold text-white" style={{ textShadow: "0 5px 0 rgba(0,0,0,0.4)" }}>
            PAUSED
          </h2>
          <p className="text-lg font-semibold text-white/80">The junk is patiently floating.</p>
          <button
            type="button"
            onClick={togglePause}
            className="rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-10 py-4 text-2xl font-bold text-orange-950 shadow-[0_6px_0_#9a3412] transition hover:-translate-y-1 active:translate-y-1"
          >
            KEEP FLINGING
          </button>
          <button
            type="button"
            onClick={quitToMenu}
            className="rounded-full bg-white/15 px-8 py-3 text-lg font-bold text-white transition hover:bg-white/25"
          >
            Quit to menu
          </button>
        </div>
      )}

      {phase === "gameover" && summary && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto bg-black/65 px-6 py-8 text-center backdrop-blur-sm">
          <div className="text-7xl">💥</div>
          <h2
            className="mt-2 text-5xl font-bold text-orange-300 sm:text-6xl"
            style={{ textShadow: "0 5px 0 #9a3412" }}
          >
            WIPED OUT
          </h2>
          <p className="mt-3 text-xl font-semibold text-white/90">{summary.line}</p>
          {summary.newBest && (
            <p className="mt-4 animate-bounce rounded-full bg-amber-300 px-5 py-2 text-xl font-bold text-orange-900 shadow-lg">
              🏆 NEW HIGH SCORE! 🏆
            </p>
          )}
          <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3">
            {[
              ["⭐", "Score", summary.score.toLocaleString()],
              ["▲", "Height", `${summary.height.toLocaleString()}m`],
              ["💥", "Smashes", summary.smashes.toLocaleString()],
              ["🔥", "Best combo", `x${summary.combo}`],
              ["🚀", "Flings", String(summary.flings)],
              ["⭐", "Stars", String(summary.stars)],
            ].map(([emoji, label, value]) => (
              <div key={label} className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white/70">
                  {emoji} {label}
                </p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={startGame}
            className="mt-8 rounded-full border-4 border-amber-100 bg-gradient-to-b from-amber-300 to-orange-500 px-12 py-4 text-3xl font-bold text-orange-950 shadow-[0_8px_0_#9a3412] transition hover:-translate-y-1 active:translate-y-1"
          >
            AGAIN! 🟠
          </button>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={quitToMenu}
              className="rounded-full bg-white/15 px-6 py-2 font-bold text-white transition hover:bg-white/25"
            >
              Menu
            </button>
            <Link
              href="/"
              className="rounded-full bg-white/15 px-6 py-2 font-bold text-white transition hover:bg-white/25"
            >
              Hub
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
