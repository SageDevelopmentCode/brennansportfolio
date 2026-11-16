"use client";

import { drawGame, type Joy } from "@/lib/quack-attack/draw";
import {
  applyChoice,
  choiceInfo,
  createState,
  megaQuack,
  rollChoices,
  tick,
  type Choice,
  type GameState,
} from "@/lib/quack-attack/engine";
import { playQuackSound, resumeQuackAudio, setQuackMuted } from "@/lib/quack-attack/sounds";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

type Phase = "menu" | "playing" | "levelup" | "paused" | "gameover";

type Summary = {
  time: number;
  kills: number;
  level: number;
  bestCombo: number;
  score: number;
  newBest: boolean;
  message: string;
};

type Best = { score: number; time: number; kills: number };

const BEST_KEY = "quack-attack-best-v1";

const DEATH_LINES = [
  "You got out-blobbed.",
  "The blobs send their regards.",
  "Quack... quack... (dramatic fade out)",
  "Not a skill issue. A blob issue.",
  "Even the sunglasses couldn't save you.",
  "King Glorp is laughing somewhere.",
  "That was a LOT of blobs, honestly.",
  "You will be remembered as a very cool duck.",
  "The rubber chickens will miss you.",
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
    return localStorage.getItem(BEST_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseBest(raw: string): Best | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Best;
    return typeof parsed.score === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writeBest(best: Best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {}
  bestListeners.forEach((listener) => listener());
}

function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function QuackAttackGameClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const choicesRef = useRef<Choice[]>([]);
  const levelUpAtRef = useRef(0);
  const keysRef = useRef(new Set<string>());
  const joyRef = useRef<Joy & { id: number }>({ active: false, ox: 0, oy: 0, x: 0, y: 0, id: -1 });
  const touchRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("menu");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [muted, setMuted] = useState(false);

  const bestRaw = useSyncExternalStore(subscribeBest, readBestRaw, () => "");
  const best = useMemo(() => parseBest(bestRaw), [bestRaw]);
  const isTouch = useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );

  useEffect(() => {
    touchRef.current = isTouch;
  }, [isTouch]);

  const goPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const startGame = useCallback(() => {
    resumeQuackAudio();
    stateRef.current = createState(false);
    choicesRef.current = [];
    keysRef.current.clear();
    joyRef.current.active = false;
    setChoices([]);
    setSummary(null);
    goPhase("playing");
    playQuackSound("quack");
  }, [goPhase]);

  const choose = useCallback(
    (index: number) => {
      const s = stateRef.current;
      const c = choicesRef.current[index];
      if (!s || !c || phaseRef.current !== "levelup") return;
      if (performance.now() - levelUpAtRef.current < 350) return;
      applyChoice(s, c);
      s.pendingLevelUps--;
      playQuackSound("pickup");
      if (s.pendingLevelUps > 0) {
        const next = rollChoices(s);
        choicesRef.current = next;
        levelUpAtRef.current = performance.now();
        setChoices(next);
      } else {
        choicesRef.current = [];
        setChoices([]);
        goPhase("playing");
      }
    },
    [goPhase],
  );

  const togglePause = useCallback(() => {
    if (phaseRef.current === "playing") {
      keysRef.current.clear();
      joyRef.current.active = false;
      goPhase("paused");
    } else if (phaseRef.current === "paused") {
      goPhase("playing");
    }
  }, [goPhase]);

  const triggerMega = useCallback(() => {
    const s = stateRef.current;
    if (!s || phaseRef.current !== "playing") return;
    if (!megaQuack(s)) playQuackSound("nope");
  }, []);

  const quitToMenu = useCallback(() => {
    stateRef.current = createState(true);
    setSummary(null);
    goPhase("menu");
  }, [goPhase]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      setQuackMuted(!m);
      return !m;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    stateRef.current = createState(true);
    const view = { w: 1, h: 1, dpr: 1, zoom: 1 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      view.w = Math.max(1, rect.width);
      view.h = Math.max(1, rect.height);
      view.dpr = dpr;
      view.zoom = Math.min(1.1, Math.max(0.55, Math.min(rect.width, rect.height) / 760));
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const readMove = () => {
      let x = 0;
      let y = 0;
      for (const code of keysRef.current) {
        const dir = MOVE_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x || y) return { x, y };
      const joy = joyRef.current;
      if (!joy.active) return { x: 0, y: 0 };
      const dx = joy.x - joy.ox;
      const dy = joy.y - joy.oy;
      const d = Math.hypot(dx, dy);
      if (d < 6) return { x: 0, y: 0 };
      const k = Math.min(1, d / 60) / d;
      return { x: dx * k, y: dy * k };
    };

    const finish = (s: GameState) => {
      const prev = parseBest(readBestRaw());
      const newBest = !prev || s.score > prev.score;
      if (newBest) writeBest({ score: s.score, time: s.t, kills: s.kills });
      setSummary({
        time: s.t,
        kills: s.kills,
        level: s.level,
        bestCombo: s.bestCombo,
        score: s.score,
        newBest,
        message: DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)],
      });
      goPhase("gameover");
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      if (!s) return;
      s.viewW = view.w / view.zoom;
      s.viewH = view.h / view.zoom;
      const ph = phaseRef.current;

      if (ph === "menu") {
        tick(s, dt, { x: 0, y: 0 });
        if (s.pendingLevelUps > 0) {
          const options = rollChoices(s);
          applyChoice(s, options[Math.floor(Math.random() * options.length)]);
          s.pendingLevelUps--;
        }
        s.events.length = 0;
      } else if (ph === "playing") {
        tick(s, dt, readMove());
        for (const ev of s.events) playQuackSound(ev);
        s.events.length = 0;
        if (s.over) {
          finish(s);
        } else if (s.pendingLevelUps > 0) {
          const options = rollChoices(s);
          choicesRef.current = options;
          levelUpAtRef.current = performance.now();
          keysRef.current.clear();
          joyRef.current.active = false;
          setChoices(options);
          goPhase("levelup");
        }
      }

      drawGame(ctx, s, view, {
        hud: ph !== "menu",
        joy: ph === "playing" ? joyRef.current : null,
        touch: touchRef.current,
      });
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [goPhase]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ph = phaseRef.current;
      if (MOVE_KEYS[e.code]) {
        keysRef.current.add(e.code);
        if (ph === "playing") e.preventDefault();
      }
      if (e.repeat) return;
      if (e.code === "KeyM") toggleMute();
      if (ph === "menu" || ph === "gameover") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (ph === "levelup") {
        const n = ["Digit1", "Digit2", "Digit3"].indexOf(e.code);
        if (n >= 0) choose(n);
        if (e.code === "Space") e.preventDefault();
        return;
      }
      if (e.code === "Escape" || e.code === "KeyP") togglePause();
      if (e.code === "Space") {
        e.preventDefault();
        triggerMega();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    const onBlur = () => {
      keysRef.current.clear();
      if (phaseRef.current === "playing") togglePause();
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [choose, startGame, toggleMute, togglePause, triggerMega]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    joyRef.current = { active: true, ox: x, oy: y, x, y, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const joy = joyRef.current;
    if (!joy.active || joy.id !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    joy.x = e.clientX - rect.left;
    joy.y = e.clientY - rect.top;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (joyRef.current.id === e.pointerId) joyRef.current.active = false;
  };

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#7ccb51] font-[family-name:var(--font-display)]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {(phase === "playing" || phase === "paused") && (
        <div className="absolute right-3 top-7 z-20 flex gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-xl text-white backdrop-blur transition hover:bg-black/60"
            aria-label={muted ? "Unmute" : "Mute"}
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
      )}

      {phase === "playing" && isTouch && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            triggerMega();
          }}
          className="absolute bottom-20 right-5 z-20 grid h-20 w-20 place-items-center rounded-full border-4 border-yellow-200 bg-gradient-to-br from-yellow-300 to-orange-500 text-4xl shadow-[0_8px_30px_rgba(250,204,21,0.6)] active:scale-90"
          aria-label="Mega Quack"
        >
          🦆
        </button>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-sky-500/50 via-transparent to-emerald-900/60 px-6 text-center">
          <div className="animate-bounce text-7xl drop-shadow-[0_8px_0_rgba(0,0,0,0.25)] sm:text-8xl">🦆</div>
          <h1
            className="mt-2 text-6xl font-bold tracking-tight text-yellow-300 sm:text-8xl"
            style={{
              textShadow: "0 6px 0 #c2410c, 0 10px 0 rgba(0,0,0,0.35), 0 0 40px rgba(253,224,71,0.6)",
              WebkitTextStroke: "2px #7c2d12",
            }}
          >
            QUACK ATTACK
          </h1>
          <p className="mt-4 max-w-md text-lg font-semibold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.6)] sm:text-xl">
            You are a duck. You have sunglasses. There are about a billion blobs.
            <br />
            <span className="text-yellow-200">Nothing to learn. Just vibes.</span>
          </p>
          <button
            type="button"
            onClick={startGame}
            className="mt-8 rounded-full border-4 border-yellow-200 bg-gradient-to-b from-yellow-300 to-orange-500 px-14 py-5 text-3xl font-bold text-orange-950 shadow-[0_8px_0_#9a3412,0_14px_30px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:shadow-[0_10px_0_#9a3412,0_18px_34px_rgba(0,0,0,0.35)] active:translate-y-1 active:shadow-[0_3px_0_#9a3412]"
          >
            PLAY 🦆
          </button>
          <div className="mt-8 grid max-w-lg gap-1 rounded-2xl bg-black/35 px-6 py-4 text-sm font-semibold text-white/90 backdrop-blur sm:text-base">
            <p>{isTouch ? "👆 Drag anywhere to waddle" : "⌨️ WASD or arrow keys to waddle"}</p>
            <p>🍞 Your weapons fire all by themselves</p>
            <p>💎 Grab gems → level up → pick something silly</p>
            <p>{isTouch ? "🦆 Tap the duck button for MEGA QUACK" : "␣ SPACE for MEGA QUACK when the bar is full"}</p>
          </div>
          {best && (
            <p className="mt-5 text-base font-bold text-yellow-200 drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]">
              🏆 Best: {best.score.toLocaleString()} pts • {formatTime(best.time)} survived •{" "}
              {best.kills.toLocaleString()} blobs bonked
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

      {phase === "levelup" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-[2px]">
          <h2
            className="animate-pulse text-5xl font-bold text-yellow-300 sm:text-6xl"
            style={{ textShadow: "0 5px 0 #a16207, 0 0 30px rgba(253,224,71,0.7)" }}
          >
            LEVEL UP!
          </h2>
          <p className="mt-2 text-lg font-semibold text-white/85">Pick one. There are no wrong answers.</p>
          <div className="mt-6 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
            {choices.map((c, i) => {
              const info = choiceInfo(c);
              const tone =
                info.kind === "weapon"
                  ? "from-amber-300 via-orange-400 to-rose-500 shadow-[0_8px_0_#9f1239]"
                  : info.kind === "passive"
                    ? "from-sky-300 via-blue-400 to-indigo-600 shadow-[0_8px_0_#312e81]"
                    : "from-lime-300 via-emerald-400 to-teal-600 shadow-[0_8px_0_#134e4a]";
              return (
                <button
                  key={`${info.name}-${i}`}
                  type="button"
                  onClick={() => choose(i)}
                  className={`group relative flex flex-row items-center gap-4 rounded-3xl bg-gradient-to-br p-5 text-left transition hover:-translate-y-2 hover:scale-[1.03] active:translate-y-1 sm:flex-col sm:items-center sm:p-6 sm:text-center ${tone} ${info.isNew ? "ring-4 ring-yellow-200" : ""}`}
                >
                  {info.isNew && (
                    <span className="absolute -right-2 -top-3 rotate-6 rounded-full bg-yellow-300 px-3 py-1 text-sm font-bold text-orange-900 shadow-lg">
                      NEW!
                    </span>
                  )}
                  <span className="text-6xl transition group-hover:scale-125 group-hover:rotate-12 sm:text-7xl">
                    {info.emoji}
                  </span>
                  <span className="flex flex-col sm:items-center">
                    <span className="text-2xl font-bold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]">
                      {info.name}
                    </span>
                    {!info.isNew && (
                      <span className="mt-1 w-fit rounded-full bg-black/25 px-3 py-0.5 text-sm font-bold text-white">
                        {info.tag}
                      </span>
                    )}
                    <span className="mt-2 text-base font-semibold text-white/95">{info.desc}</span>
                  </span>
                  {!isTouch && (
                    <span className="absolute bottom-2 right-3 text-xs font-bold text-white/60 sm:static sm:mt-1">
                      press {i + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/60 backdrop-blur-sm">
          <h2 className="text-6xl font-bold text-white" style={{ textShadow: "0 5px 0 rgba(0,0,0,0.4)" }}>
            PAUSED
          </h2>
          <p className="text-lg font-semibold text-white/80">The blobs are politely waiting.</p>
          <button
            type="button"
            onClick={togglePause}
            className="rounded-full bg-gradient-to-b from-yellow-300 to-orange-500 px-10 py-4 text-2xl font-bold text-orange-950 shadow-[0_6px_0_#9a3412] transition hover:-translate-y-1 active:translate-y-1"
          >
            KEEP QUACKING
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
          <div className="text-7xl">😵</div>
          <h2
            className="mt-2 text-5xl font-bold text-rose-400 sm:text-6xl"
            style={{ textShadow: "0 5px 0 #881337" }}
          >
            DUCK DOWN!
          </h2>
          <p className="mt-3 text-xl font-semibold text-white/90">{summary.message}</p>
          {summary.newBest && (
            <p className="mt-4 animate-bounce rounded-full bg-yellow-300 px-5 py-2 text-xl font-bold text-orange-900 shadow-lg">
              🏆 NEW HIGH SCORE! 🏆
            </p>
          )}
          <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3">
            {[
              ["⭐", "Score", summary.score.toLocaleString()],
              ["⏱️", "Survived", formatTime(summary.time)],
              ["💀", "Blobs bonked", summary.kills.toLocaleString()],
              ["🔥", "Best combo", `x${summary.bestCombo}`],
              ["📈", "Level", String(summary.level)],
              ["🏆", "Best ever", (best?.score ?? summary.score).toLocaleString()],
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
            className="mt-8 rounded-full border-4 border-yellow-200 bg-gradient-to-b from-yellow-300 to-orange-500 px-12 py-4 text-3xl font-bold text-orange-950 shadow-[0_8px_0_#9a3412] transition hover:-translate-y-1 active:translate-y-1"
          >
            AGAIN! 🦆
          </button>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={quitToMenu}
              className="rounded-full bg-white/15 px-6 py-2 font-bold text-white transition hover:bg-white/25"
            >
              Menu
            </button>
            <Link href="/" className="rounded-full bg-white/15 px-6 py-2 font-bold text-white transition hover:bg-white/25">
              Hub
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
