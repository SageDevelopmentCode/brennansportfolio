"use client";

import { HillClimbGarage } from "@/components/hill-climb-garage";
import { HillClimbHud } from "@/components/hill-climb-hud";
import { HillClimbStageMap } from "@/components/hill-climb-stage-map";
import { drawFrame, pushCanvasBonus, resetDriveFx } from "@/lib/hill-climb/draw";
import { HillClimbEngine } from "@/lib/hill-climb/engine";
import {
  hasSeenTutorial,
  loadProgress,
  markTutorialSeen,
  resetProgress,
  saveProgress,
  upgradeLevelsForVehicle,
} from "@/lib/hill-climb/progress";
import {
  discountedCoinCost,
  STAGE_DIAMOND_DISCOUNT,
  VEHICLE_DIAMOND_UNLOCK,
} from "@/lib/hill-climb/meta";
import { getStageById } from "@/lib/hill-climb/stages";
import {
  playBonusSound,
  playCoinSound,
  playCrashSound,
  playFuelCollectSound,
  playFuelEmptySound,
  playLowFuelBeep,
  resumeHillClimbAudio,
  isHillClimbMuted,
  setHillClimbMuted,
  startEngineSound,
  stopEngineSound,
  updateEngineRpm,
} from "@/lib/hill-climb/sounds";
import {
  CAMERA_LERP,
  CAMERA_MAX_DY,
  CRASH_SHAKE_MS,
  GAME_OVER_DELAY_MS,
  HUD_COMMIT_MS,
  LANDING_SHAKE_MS,
} from "@/lib/hill-climb/tuning";
import { computeEffectiveStats, upgradeCost } from "@/lib/hill-climb/upgrades";
import { getVehicleById } from "@/lib/hill-climb/vehicles";
import type { BonusKind, HillClimbProgress } from "@/lib/hill-climb/types";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Screen = "menu" | "stages" | "garage" | "playing" | "paused" | "gameover" | "gameover_pending";

type BonusTotals = Record<BonusKind, number>;

const EMPTY_BONUSES = (): BonusTotals => ({
  airTime: 0,
  backflip: 0,
  frontflip: 0,
  neckFlip: 0,
});

const BONUS_LABEL: Record<BonusKind, string> = {
  airTime: "Air time",
  backflip: "Backflip",
  frontflip: "Front flip",
  neckFlip: "Neck flip",
};

type BonusPopup = { id: number; text: string };

function hashRunSeed(stageId: string, runCount: number): number {
  const s = `${stageId}:${runCount}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}

function setupCanvas(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement;
  if (!parent) return { w: 0, h: 0, dpr: 1 };
  const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h, dpr };
}

function HillClimbTutorialOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-labelledby="hill-climb-tutorial-title"
    >
      <div className="hill-climb-glass max-w-md rounded-2xl p-6 text-left shadow-xl">
        <h2 id="hill-climb-tutorial-title" className="text-lg font-bold">How to play Hill Run</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--hill-muted)]">
          <li>Hold <strong className="text-[var(--hill-ink)]">GAS</strong> (D or →) to drive. Fuel drains the whole time you are moving.</li>
          <li>Use <strong className="text-[var(--hill-ink)]">BRAKE</strong> (A or ←) to slow down, reverse, or flip forward in the air.</li>
          <li>Gas in the air does a backflip. Land flips and long jumps for bonus coins.</li>
          <li>Grab coin lines and fuel cans. A head hit is Driver Down. The garage spends coins on upgrades.</li>
        </ul>
        <div className="mt-6 flex gap-2">
          <button type="button" className="hill-climb-btn-ghost flex-1" onClick={onDismiss}>
            Skip
          </button>
          <button type="button" className="hill-climb-btn-primary flex-1" onClick={onDismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export function HillClimbGameClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HillClimbEngine | null>(null);
  const matterRef = useRef<typeof import("matter-js") | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const screenRef = useRef<Screen>("menu");
  const progressRef = useRef<HillClimbProgress>({
    coins: 0,
    diamonds: 0,
    ownedVehicles: ["hill-climber"],
    ownedStages: ["countryside"],
    selectedVehicleId: "hill-climber",
    selectedStageId: "countryside",
    upgrades: {},
    bestDistanceM: {},
    runCount: 0,
  });
  const finishRunRef = useRef<(snap: ReturnType<HillClimbEngine["getSnapshot"]>) => void>(() => {});
  const runSeedRef = useRef(42);
  const camRef = useRef({ x: 0, y: 0 });
  const lastHudCommitRef = useRef(0);
  const lastHudSnapRef = useRef({ meters: 0, coins: 0, fuelBand: 20, alive: true });
  const shakeUntilRef = useRef(0);
  const pendingSnapRef = useRef<ReturnType<HillClimbEngine["getSnapshot"]> | null>(null);
  const newBestRef = useRef(false);

  const [screen, setScreen] = useState<Screen>("menu");
  const [runKey, setRunKey] = useState(0);
  const [progress, setProgress] = useState<HillClimbProgress>(progressRef.current);
  const [gasDown, setGasDown] = useState(false);
  const [brakeDown, setBrakeDown] = useState(false);
  const [popups, setPopups] = useState<BonusPopup[]>([]);
  const popupIdRef = useRef(0);
  const zoomRef = useRef(1);
  const landingRef = useRef(0);
  const [hud, setHud] = useState({
    fuel: 100,
    fuelMax: 100,
    rpm: 0,
    speedKmh: 0,
    distanceM: 0,
    coinsThisRun: 0,
    nextFuelM: 0,
    bonusTotals: EMPTY_BONUSES(),
    reason: null as "fuel" | "crash" | null,
  });
  const [showNewBest, setShowNewBest] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastCoinSoundRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const dismissTutorial = useCallback(() => {
    markTutorialSeen();
    setShowTutorial(false);
  }, []);

  useEffect(() => {
    const loaded = loadProgress();
    progressRef.current = loaded;
    setProgress(loaded);
    setMuted(isHillClimbMuted());
    if (!hasSeenTutorial()) setShowTutorial(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const onChange = () => {
      reduceMotionRef.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setScreenBoth = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreen(s);
  }, []);

  const persist = useCallback((next: HillClimbProgress) => {
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  }, []);

  const inputRef = useRef({ gas: false, brake: false });
  useEffect(() => {
    inputRef.current = { gas: gasDown, brake: brakeDown };
    engineRef.current?.setInput(inputRef.current);
  }, [gasDown, brakeDown]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "ArrowRight" || e.code === "KeyD") setGasDown(true);
      if (e.code === "ArrowLeft" || e.code === "KeyA") setBrakeDown(true);
      if (e.code === "Escape" && screenRef.current === "playing") setScreenBoth("paused");
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ArrowRight" || e.code === "KeyD") setGasDown(false);
      if (e.code === "ArrowLeft" || e.code === "KeyA") setBrakeDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setScreenBoth]);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const stopLoop = useCallback(() => {
    cancelAnimation();
    stopEngineSound();
    engineRef.current?.destroy();
    engineRef.current = null;
  }, [cancelAnimation]);

  const commitHud = useCallback((snap: ReturnType<HillClimbEngine["getSnapshot"]>, force = false) => {
    const now = performance.now();
    const meters = Math.floor(snap.distanceM);
    const fuelBand = Math.floor((snap.fuel / snap.fuelMax) * 20);
    const last = lastHudSnapRef.current;
    const shouldCommit =
      force ||
      now - lastHudCommitRef.current > HUD_COMMIT_MS ||
      meters !== last.meters ||
      snap.coinsThisRun !== last.coins ||
      fuelBand !== last.fuelBand ||
      snap.alive !== last.alive;
    if (!shouldCommit) return;
    lastHudCommitRef.current = now;
    lastHudSnapRef.current = {
      meters,
      coins: snap.coinsThisRun,
      fuelBand,
      alive: snap.alive,
    };
    setHud({
      fuel: snap.fuel,
      fuelMax: snap.fuelMax,
      rpm: snap.rpm,
      speedKmh: snap.speedKmh,
      distanceM: snap.distanceM,
      coinsThisRun: snap.coinsThisRun,
      nextFuelM: snap.distanceToNextFuelM,
      bonusTotals: snap.bonusTotals,
      reason: snap.gameOverReason,
    });
  }, []);

  const finishRun = useCallback(
    (snap: ReturnType<HillClimbEngine["getSnapshot"]>) => {
      const prog = progressRef.current;
      const stageId = prog.selectedStageId;
      const prevBest = prog.bestDistanceM[stageId] ?? 0;
      const isNewBest = snap.distanceM > prevBest;
      newBestRef.current = isNewBest;
      setShowNewBest(isNewBest);
      persist({
        ...prog,
        coins: prog.coins + snap.coinsThisRun,
        diamonds: prog.diamonds + snap.diamondsThisRun,
        bestDistanceM: {
          ...prog.bestDistanceM,
          [stageId]: Math.max(prevBest, snap.distanceM),
        },
      });
      if (snap.gameOverReason === "crash") playCrashSound();
      else playFuelEmptySound();
      if (!reduceMotionRef.current) {
        shakeUntilRef.current = performance.now() + CRASH_SHAKE_MS;
      }
      pendingSnapRef.current = snap;
      setScreenBoth("gameover_pending");
      window.setTimeout(() => {
        if (pendingSnapRef.current) {
          setHud((h) => ({
            ...h,
            distanceM: pendingSnapRef.current!.distanceM,
            coinsThisRun: pendingSnapRef.current!.coinsThisRun,
            nextFuelM: pendingSnapRef.current!.distanceToNextFuelM,
            bonusTotals: pendingSnapRef.current!.bonusTotals,
            reason: pendingSnapRef.current!.gameOverReason,
          }));
          setScreenBoth("gameover");
        }
      }, GAME_OVER_DELAY_MS);
    },
    [persist, setScreenBoth]
  );

  useEffect(() => {
    finishRunRef.current = finishRun;
  }, [finishRun]);

  const startRun = useCallback(async () => {
    stopLoop();
    resumeHillClimbAudio();
    const Matter = matterRef.current ?? (await import("matter-js"));
    matterRef.current = Matter;

    const prog = progressRef.current;
    const runCount = (prog.runCount ?? 0) + 1;
    const seed = hashRunSeed(prog.selectedStageId, runCount);
    runSeedRef.current = seed;
    persist({ ...prog, runCount });

    const stats = computeEffectiveStats(prog.selectedVehicleId, prog);
    engineRef.current = new HillClimbEngine(Matter, {
      stageId: prog.selectedStageId,
      vehicleId: prog.selectedVehicleId,
      stats,
      seed,
      upgradeLevels: upgradeLevelsForVehicle(prog, prog.selectedVehicleId),
    });
    camRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    landingRef.current = 0;
    resetDriveFx();
    setPopups([]);
    startEngineSound();
    setScreenBoth("playing");
    setGasDown(false);
    setBrakeDown(false);
    setShowNewBest(false);
    setHud({
      fuel: stats.fuelCapacity,
      fuelMax: stats.fuelCapacity,
      rpm: 0,
      speedKmh: 0,
      distanceM: 0,
      coinsThisRun: 0,
      nextFuelM: 150,
      bonusTotals: EMPTY_BONUSES(),
      reason: null,
    });
    setRunKey((k) => k + 1);
  }, [persist, setScreenBoth, stopLoop]);

  const inRun =
    screen === "playing" ||
    screen === "paused" ||
    screen === "gameover" ||
    screen === "gameover_pending";

  useEffect(() => {
    if (!inRun || !engineRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => setupCanvas(canvas);
    resize();
    window.addEventListener("resize", resize);

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const eng = engineRef.current;
      if (!eng) return;

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      const scr = screenRef.current;

      if (scr === "playing" || scr === "gameover_pending") {
        if (scr === "playing") eng.setInput(inputRef.current);
        else eng.setInput({ gas: false, brake: false });
        eng.step(dt);
        if (scr === "playing") {
          const snap = eng.getSnapshot();
          if (eng.pollCoinCollect()) {
            if (now - lastCoinSoundRef.current > 80) {
              playCoinSound();
              lastCoinSoundRef.current = now;
            }
          }
          if (eng.pollFuelCollect()) {
            playFuelCollectSound();
          }
          const chassis = eng.getChassisPosition();
          for (const bonus of eng.pollBonusEvents()) {
            const id = ++popupIdRef.current;
            const countSuffix = bonus.count > 1 ? ` x${bonus.count}` : "";
            const text = `${BONUS_LABEL[bonus.kind]} +${bonus.coins}${countSuffix}`;
            setPopups((prev) => [...prev.slice(-3), { id, text }]);
            playBonusSound();
            const canvasLabel =
              bonus.kind === "airTime"
                ? `AIR TIME ${bonus.count}s`
                : `${BONUS_LABEL[bonus.kind]}${countSuffix}`;
            pushCanvasBonus(canvasLabel, chassis.x, chassis.y - 36);
            window.setTimeout(() => {
              setPopups((prev) => prev.filter((p) => p.id !== id));
            }, 1300);
          }
          const impact = eng.pollLandingImpact();
          landingRef.current = impact;
          if (!reduceMotionRef.current && impact > 0.2) {
            shakeUntilRef.current = now + Math.min(LANDING_SHAKE_MS * 1.2, LANDING_SHAKE_MS * impact * 1.5);
          }
          if (snap.fuel > 0 && snap.fuel / snap.fuelMax < 0.2) playLowFuelBeep();
          updateEngineRpm(snap.rpm, inputRef.current.gas && snap.fuel > 0);
          commitHud(snap);
          if (!snap.alive) finishRunRef.current(snap);
        }
      }

      const ctx = canvas.getContext("2d");
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      if (!ctx || w <= 0 || h <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const zoomTarget = eng.getZoom();
      zoomRef.current += (zoomTarget - zoomRef.current) * 0.08;
      const zoom = zoomRef.current;
      const targetX = eng.getCameraX(w / zoom);
      const targetY = eng.getCameraY(h / zoom);
      camRef.current.x += (targetX - camRef.current.x) * CAMERA_LERP;
      const dy = (targetY - camRef.current.y) * CAMERA_LERP;
      camRef.current.y += Math.max(-CAMERA_MAX_DY, Math.min(CAMERA_MAX_DY, dy));

      let shakeX = 0;
      let shakeY = 0;
      if (!reduceMotionRef.current && now < shakeUntilRef.current) {
        shakeX = (Math.random() - 0.5) * 10;
        shakeY = (Math.random() - 0.5) * 8;
      }

      const bestM = progressRef.current.bestDistanceM[progressRef.current.selectedStageId] ?? 0;
      drawFrame(
        ctx,
        w,
        h,
        camRef.current.x,
        camRef.current.y,
        progressRef.current.selectedStageId,
        eng,
        progressRef.current.selectedVehicleId,
        runSeedRef.current,
        shakeX,
        shakeY,
        inputRef.current.gas,
        landingRef.current,
        bestM,
        zoom
      );
      landingRef.current = 0;

      if (
        screenRef.current === "playing" ||
        screenRef.current === "paused" ||
        screenRef.current === "gameover" ||
        screenRef.current === "gameover_pending"
      ) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimation();
    };
  }, [inRun, runKey, screen, cancelAnimation, commitHud]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const stage = getStageById(progress.selectedStageId);
  const vehicle = getVehicleById(progress.selectedVehicleId);

  const stageBest = progress.bestDistanceM[progress.selectedStageId];

  return (
    <div className="flex flex-col gap-4">
      {showTutorial && screen === "menu" && (
        <HillClimbTutorialOverlay onDismiss={dismissTutorial} />
      )}
      {screen === "menu" && (
        <div className="hill-climb-menu-backdrop relative mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--hill-border)] shadow-xl">
          <div className="hill-climb-menu-scene absolute inset-0" aria-hidden />
          <div className="hill-climb-glass relative rounded-2xl p-8 text-center">
          <h1 className="hill-climb-menu-title text-4xl font-black tracking-tight">Hill Run</h1>
          <p className="mt-1 text-sm text-[var(--hill-muted)]">Cartoon hill racing</p>
          <div className="absolute right-3 top-3 flex gap-1">
            <button
              type="button"
              className="hill-climb-btn-ghost min-h-8 px-2 text-xs"
              aria-label="Help and tutorial"
              onClick={() => setShowTutorial(true)}
            >
              ?
            </button>
            <button
              type="button"
              className="hill-climb-btn-ghost min-h-8 px-2 text-xs"
              aria-label={muted ? "Sound off" : "Sound on"}
              onClick={() => {
                const next = !muted;
                setHillClimbMuted(next);
                setMuted(next);
                if (next) stopEngineSound();
              }}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
          <p className="text-sm text-[var(--hill-muted)]">
            {stage.name} · {vehicle.name}
          </p>
          {stageBest != null && stageBest > 0 && (
            <p className="mt-1 text-xs font-semibold text-[var(--hill-accent)]">
              Best on this stage: {Math.floor(stageBest)} m
            </p>
          )}
          <button
            type="button"
            className="hill-climb-btn-primary mt-6 w-full text-lg"
            onClick={() => startRun()}
          >
            Play
          </button>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className="hill-climb-btn-ghost" onClick={() => setScreenBoth("stages")}>
              Stages
            </button>
            <button type="button" className="hill-climb-btn-ghost" onClick={() => setScreenBoth("garage")}>
              Garage
            </button>
          </div>
          <p className="mt-4 text-xs text-[var(--hill-muted)]">
            🪙 {progress.coins.toLocaleString()} · 💎 {progress.diamonds.toLocaleString()}
          </p>
          <button
            type="button"
            className="mt-3 text-[10px] text-[var(--hill-muted)] underline opacity-70 hover:opacity-100"
            onClick={() => {
              if (
                window.confirm(
                  "Reset all Hill Run progress (coins, unlocks, upgrades, bests)? This cannot be undone."
                )
              ) {
                const fresh = resetProgress();
                progressRef.current = fresh;
                setProgress(fresh);
              }
            }}
          >
            Reset progress (testing)
          </button>
          </div>
        </div>
      )}

      {screen === "stages" && (
        <HillClimbStageMap
          progress={progress}
          onBack={() => setScreenBoth("menu")}
          onSelect={(id) => persist({ ...progress, selectedStageId: id })}
          onBuy={(id, useDiamondDiscount) => {
            const s = getStageById(id);
            if (progress.ownedStages.includes(id)) return;
            let coinCost = s.unlockCost;
            let diamonds = 0;
            if (
              useDiamondDiscount &&
              id === STAGE_DIAMOND_DISCOUNT.stageId &&
              s.unlockCost > 0
            ) {
              coinCost = discountedCoinCost(s.unlockCost, STAGE_DIAMOND_DISCOUNT.coinMultiplier);
              diamonds = STAGE_DIAMOND_DISCOUNT.diamondsRequired;
            }
            if (progress.coins < coinCost || progress.diamonds < diamonds) return;
            persist({
              ...progress,
              coins: progress.coins - coinCost,
              diamonds: progress.diamonds - diamonds,
              ownedStages: [...progress.ownedStages, id],
              selectedStageId: id,
            });
          }}
        />
      )}

      {screen === "garage" && (
        <HillClimbGarage
          progress={progress}
          onBack={() => setScreenBoth("menu")}
          onSelectVehicle={(id) => persist({ ...progress, selectedVehicleId: id })}
          onBuyVehicle={(id, useDiamonds) => {
            const v = getVehicleById(id);
            if (progress.ownedVehicles.includes(id)) return;
            let coinCost = v.unlockCost;
            let diamonds = 0;
            if (useDiamonds && id === VEHICLE_DIAMOND_UNLOCK.vehicleId) {
              coinCost = discountedCoinCost(v.unlockCost, VEHICLE_DIAMOND_UNLOCK.coinMultiplier);
              diamonds = VEHICLE_DIAMOND_UNLOCK.diamondsRequired;
            }
            if (progress.coins < coinCost || progress.diamonds < diamonds) return;
            persist({
              ...progress,
              coins: progress.coins - coinCost,
              diamonds: progress.diamonds - diamonds,
              ownedVehicles: [...progress.ownedVehicles, id],
              selectedVehicleId: id,
            });
          }}
          onUpgrade={(vehicleId, partId) => {
            const level = progress.upgrades[vehicleId]?.[partId] ?? 0;
            const cost = upgradeCost(partId, level + 1);
            if (progress.coins < cost) return;
            persist({
              ...progress,
              coins: progress.coins - cost,
              upgrades: {
                ...progress.upgrades,
                [vehicleId]: {
                  ...progress.upgrades[vehicleId],
                  [partId]: level + 1,
                },
              },
            });
          }}
        />
      )}

      {inRun && (
        <div
          className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--hill-border)] bg-sky-200 shadow-xl touch-none overscroll-none"
          style={{ touchAction: "none" }}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
          {(screen === "playing" || screen === "paused") && (
            <HillClimbHud
              fuel={hud.fuel}
              fuelMax={hud.fuelMax}
              coins={progress.coins + hud.coinsThisRun}
              diamonds={progress.diamonds}
              rpm={hud.rpm}
              speedKmh={hud.speedKmh}
              distanceM={hud.distanceM}
              bestM={progress.bestDistanceM[progress.selectedStageId] ?? 0}
              nextFuelM={hud.nextFuelM}
              gasDown={gasDown}
              brakeDown={brakeDown}
              popups={popups}
              onGasDown={setGasDown}
              onBrakeDown={setBrakeDown}
              onPause={() => setScreenBoth("paused")}
            />
          )}
          {screen === "paused" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="hill-climb-glass rounded-xl p-6 text-center">
                <h3 className="text-lg font-bold">Paused</h3>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    className="hill-climb-btn-ghost text-sm"
                    onClick={() => {
                      const next = !muted;
                      setHillClimbMuted(next);
                      setMuted(next);
                      if (next) stopEngineSound();
                    }}
                  >
                    Sound: {muted ? "Off" : "On"}
                  </button>
                  <button type="button" className="hill-climb-btn-primary" onClick={() => setScreenBoth("playing")}>
                    Resume
                  </button>
                  <button
                    type="button"
                    className="hill-climb-btn-ghost"
                    onClick={() => {
                      stopLoop();
                      setScreenBoth("menu");
                    }}
                  >
                    Quit to menu
                  </button>
                </div>
              </div>
            </div>
          )}
          {screen === "gameover" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <div className="hill-climb-gameover-card hill-climb-glass max-w-sm rounded-xl p-6 text-center">
                <h3 className="hill-climb-gameover-title text-2xl font-black">
                  {hud.reason === "crash" ? "Driver Down" : "Out of Fuel"}
                </h3>
                {showNewBest && (
                  <p className="mt-1 text-sm font-bold text-[var(--hill-accent)]">New best distance!</p>
                )}
                <p className="mt-2 text-[var(--hill-muted)]">
                  {Math.floor(hud.distanceM)} m · +{hud.coinsThisRun} coins
                </p>
                <ul className="mt-2 space-y-0.5 text-sm text-[var(--hill-ink)]">
                  {(Object.keys(BONUS_LABEL) as BonusKind[])
                    .filter((kind) => hud.bonusTotals[kind] > 0)
                    .map((kind) => (
                      <li key={kind}>
                        {BONUS_LABEL[kind]} +{hud.bonusTotals[kind]}
                      </li>
                    ))}
                </ul>
                <button
                  type="button"
                  className="hill-climb-btn-primary mt-4 w-full"
                  onClick={() => startRun()}
                >
                  Retry
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="hill-climb-btn-ghost text-sm"
                    onClick={() => {
                      stopLoop();
                      setScreenBoth("garage");
                    }}
                  >
                    Garage
                  </button>
                  <button
                    type="button"
                    className="hill-climb-btn-ghost text-sm"
                    onClick={() => {
                      stopLoop();
                      setScreenBoth("stages");
                    }}
                  >
                    Stages
                  </button>
                </div>
                <button
                  type="button"
                  className="hill-climb-btn-ghost mt-2 w-full"
                  onClick={() => {
                    stopLoop();
                    setScreenBoth("menu");
                  }}
                >
                  Menu
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-[var(--hill-muted)]">
        <Link href="/" className="underline hover:text-[var(--hill-accent)]">← All projects</Link>
        · A/D pedals · Gas backflips · Brake front flips · Esc pause
      </p>
    </div>
  );
}
