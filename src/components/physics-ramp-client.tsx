"use client";

import { PhysicsInfoDialog } from "@/components/physics-info-dialog";
import { PhysicsRacePredictDialog } from "@/components/physics-race-predict-dialog";
import { PhysicsRaceResultDialog } from "@/components/physics-race-result-dialog";
import { PHYSICS_HELP_BUTTONS, type PhysicsHelpTopic } from "@/lib/physics-help";
import {
  ANGLE_MAX_DEG,
  ANGLE_MIN_DEG,
  allBallsDone,
  BALL_MATERIALS,
  BALL_RADIUS_M,
  type BallMaterialId,
  ballCenterOnTrack,
  buildRaceResultReport,
  computeViewportLayout,
  createRaceBalls,
  DEFAULT_ANGLE_DEG,
  DEFAULT_FRICTION,
  DEFAULT_LENGTH_M,
  effectiveFriction,
  FRICTION_MAX,
  FRICTION_MIN,
  getRaceWinner,
  LENGTH_MAX_M,
  LENGTH_MIN_M,
  MAX_RACE_BALLS,
  positionOnLane,
  type RaceBall,
  type RaceResultReport,
  tickAllRaceBalls,
  type TrackPath,
  willAnyBallMove,
  worldToScreen,
} from "@/lib/physics-ramp";
import {
  getTrackForPreset,
  type TrackPresetId,
  TRACK_PRESETS,
} from "@/lib/physics-tracks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Transport = "idle" | "running" | "paused";

const MAX_DT = 1 / 120;

const PHYSICS_CANVAS = {
  skyTop: "#e0f2fe",
  skyBottom: "#f1f5f9",
  trackStroke: "#475569",
  trackEdge: "#94a3b8",
  hudText: "#1e293b",
  gravityArrow: "#db2777",
  motionArrow: "#059669",
  startDot: "#7c3aed",
  finishText: "#047857",
};

type TrailPoint = { x: number; y: number };

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  lineWidth = 2
) {
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = 8;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * head - uy * 4, y + dy - uy * head + ux * 4);
  ctx.lineTo(x + dx - ux * head + uy * 4, y + dy - uy * head - ux * 4);
  ctx.closePath();
  ctx.fill();
}

type DrawOptions = {
  path: TrackPath;
  balls: RaceBall[];
  trails: Map<string, TrailPoint[]>;
  layout: ReturnType<typeof computeViewportLayout>;
  cameraXM: number;
  width: number;
  height: number;
  showArrows: boolean;
  angleDeg: number;
  preset: TrackPresetId;
};

function drawLaneGuide(
  ctx: CanvasRenderingContext2D,
  path: TrackPath,
  laneIndex: number,
  laneCount: number,
  color: string,
  toScreen: (x: number, y: number) => { x: number; y: number }
) {
  const step = 0.4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  for (let s = 0; s <= path.totalLength; s += step) {
    const { x, y } = positionOnLane(path, s, laneIndex, laneCount, false);
    const p = toScreen(x, y);
    if (s === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawScene(ctx: CanvasRenderingContext2D, opts: DrawOptions) {
  const {
    path,
    balls,
    trails,
    layout,
    cameraXM,
    width,
    height,
    showArrows,
    angleDeg,
    preset,
  } = opts;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, PHYSICS_CANVAS.skyTop);
  sky.addColorStop(1, PHYSICS_CANVAS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const toScreen = (x: number, y: number) =>
    worldToScreen(x, y, layout, cameraXM, path);

  const laneCount = balls.length;
  for (const ball of balls) {
    const mat = BALL_MATERIALS[ball.materialId];
    drawLaneGuide(
      ctx,
      path,
      ball.laneIndex,
      laneCount,
      mat.trailColor,
      toScreen
    );
  }

  for (const ball of balls) {
    const mat = BALL_MATERIALS[ball.materialId];
    const points = trails.get(ball.id);
    if (!points || points.length < 2) continue;
    ctx.strokeStyle = mat.trailColor;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.65;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const p0 = toScreen(points[0].x, points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < points.length; i++) {
      const p = toScreen(points[i].x, points[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = PHYSICS_CANVAS.trackEdge;
  ctx.lineWidth = 20;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const first = toScreen(path.points[0].x, path.points[0].y);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < path.points.length; i++) {
    const p = toScreen(path.points[i].x, path.points[i].y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  ctx.strokeStyle = PHYSICS_CANVAS.trackStroke;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < path.points.length; i++) {
    const p = toScreen(path.points[i].x, path.points[i].y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  const start = toScreen(0, 0);
  ctx.fillStyle = PHYSICS_CANVAS.startDot;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
  ctx.fill();

  if (preset === "classic") {
    ctx.fillStyle = PHYSICS_CANVAS.hudText;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText(`${angleDeg}°`, start.x + 12, start.y - 10);
  }

  const finish = toScreen(
    path.points[path.points.length - 1].x,
    path.points[path.points.length - 1].y
  );
  ctx.fillStyle = PHYSICS_CANVAS.finishText;
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.fillText("Finish", finish.x - 18, finish.y - 14);

  for (const ball of balls) {
    const mat = BALL_MATERIALS[ball.materialId];
    const { x, y, sample } = ballCenterOnTrack(
      path,
      ball.s,
      ball.laneIndex,
      laneCount
    );
    const pos = toScreen(x, y);
    const ballR = BALL_RADIUS_M * layout.scale;

    if (showArrows && ball.phase === "alongTrack") {
      const vScale = 22;
      const vx = sample.tangentX * ball.speed * vScale;
      const vy = sample.tangentY * ball.speed * vScale;
      drawArrow(
        ctx,
        pos.x,
        pos.y,
        vx,
        vy,
        PHYSICS_CANVAS.motionArrow,
        3
      );
    }

    const grad = ctx.createRadialGradient(
      pos.x - ballR * 0.3,
      pos.y - ballR * 0.3,
      ballR * 0.1,
      pos.x,
      pos.y,
      ballR
    );
    grad.addColorStop(0, mat.highlight);
    grad.addColorStop(0.5, mat.color);
    grad.addColorStop(1, mat.outline);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mat.outline;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = PHYSICS_CANVAS.hudText;
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(mat.shortLabel, pos.x, pos.y + ballR + 14);
    ctx.textAlign = "left";
  }

  if (showArrows) {
    drawArrow(ctx, 28, 36, 0, 40, PHYSICS_CANVAS.gravityArrow, 3.5);
    ctx.fillStyle = PHYSICS_CANVAS.gravityArrow;
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("Gravity", 48, 62);
  }

  const lead = balls.find((b) => b.phase === "alongTrack") ?? balls[0];
  if (lead) {
    ctx.fillStyle = PHYSICS_CANVAS.hudText;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(`Speed: ${lead.speed.toFixed(2)} m/s`, 16, height - 16);
  }
}

export function PhysicsRampClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [trackPreset, setTrackPreset] = useState<TrackPresetId>("classic");
  const [angleDeg, setAngleDeg] = useState(DEFAULT_ANGLE_DEG);
  const [frictionMu, setFrictionMu] = useState(DEFAULT_FRICTION);
  const [lengthM, setLengthM] = useState(DEFAULT_LENGTH_M);
  const [ballMaterials, setBallMaterials] = useState<BallMaterialId[]>([
    "steel",
  ]);
  const [addMaterial, setAddMaterial] = useState<BallMaterialId>("rubber");
  const [transport, setTransport] = useState<Transport>("idle");
  const [balls, setBalls] = useState<RaceBall[]>(() =>
    createRaceBalls(["steel"])
  );
  const [cameraXM, setCameraXM] = useState(0);
  const [followCamera, setFollowCamera] = useState(false);
  const [showArrows, setShowArrows] = useState(true);
  const [predictOpen, setPredictOpen] = useState(false);
  const [predictedBallId, setPredictedBallId] = useState<string | null>(null);
  const [resultReport, setResultReport] = useState<RaceResultReport | null>(
    null
  );
  const [helpTopic, setHelpTopic] = useState<PhysicsHelpTopic | null>(null);

  const transportRef = useRef(transport);
  const ballsRef = useRef(balls);
  const frictionRef = useRef(frictionMu);
  const pathRef = useRef<TrackPath | null>(null);
  const simTimeRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const sizeRef = useRef({ width: 640, height: 480 });
  const dragRef = useRef<{ active: boolean; lastX: number }>({
    active: false,
    lastX: 0,
  });
  const trailsRef = useRef<Map<string, TrailPoint[]>>(new Map());
  const trailFrameRef = useRef(0);
  const trackPresetRef = useRef(trackPreset);

  const path = useMemo(
    () => getTrackForPreset(trackPreset, angleDeg, lengthM),
    [trackPreset, angleDeg, lengthM]
  );

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);

  useEffect(() => {
    ballsRef.current = balls;
  }, [balls]);

  useEffect(() => {
    frictionRef.current = frictionMu;
  }, [frictionMu]);

  useEffect(() => {
    trackPresetRef.current = trackPreset;
  }, [trackPreset]);

  const clearTrails = useCallback(() => {
    trailsRef.current = new Map();
    trailFrameRef.current = 0;
  }, []);

  const materialIds = ballMaterials;
  const canMove = willAnyBallMove(path, frictionMu, materialIds);
  const controlsLocked = transport === "running";

  const resetRace = useCallback(() => {
    const next = createRaceBalls(ballMaterials);
    ballsRef.current = next;
    setBalls(next);
    setTransport("idle");
    setPredictedBallId(null);
    setResultReport(null);
    simTimeRef.current = 0;
    setCameraXM(0);
    clearTrails();
  }, [ballMaterials, clearTrails]);

  useEffect(() => {
    if (transportRef.current === "running") return;
    const next = createRaceBalls(ballMaterials);
    ballsRef.current = next;
    setBalls(next);
    setPredictedBallId(null);
    setResultReport(null);
    simTimeRef.current = 0;
    clearTrails();
  }, [trackPreset, angleDeg, lengthM, frictionMu, ballMaterials, clearTrails]);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = Math.max(400, Math.min(560, width * 0.78));
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeRef.current = { width, height };
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = sizeRef.current;
    const p = pathRef.current ?? path;
    const layout = computeViewportLayout(width, height, p);
    drawScene(ctx, {
      path: p,
      balls: ballsRef.current,
      trails: trailsRef.current,
      layout,
      cameraXM,
      width,
      height,
      showArrows,
      angleDeg,
      preset: trackPreset,
    });
  }, [path, cameraXM, showArrows, angleDeg, trackPreset]);

  useEffect(() => {
    resizeCanvas();
    paint();
    const ro = new ResizeObserver(() => {
      resizeCanvas();
      paint();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resizeCanvas, paint]);

  useEffect(() => {
    paint();
  }, [balls, cameraXM, showArrows, paint]);

  useEffect(() => {
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (transportRef.current !== "running") {
        lastFrameRef.current = now;
        return;
      }

      const prev = lastFrameRef.current || now;
      let dt = (now - prev) / 1000;
      lastFrameRef.current = now;
      if (dt > 0.05) dt = 0.05;

      const p = pathRef.current;
      if (!p) return;

      const steps = Math.max(1, Math.ceil(dt / MAX_DT));
      const stepDt = dt / steps;
      let updated = ballsRef.current;
      let t = simTimeRef.current;
      for (let i = 0; i < steps; i++) {
        updated = tickAllRaceBalls(
          updated,
          stepDt,
          p,
          frictionRef.current,
          t
        );
        t += stepDt;
      }
      simTimeRef.current = t;
      ballsRef.current = updated;
      setBalls(updated);

      trailFrameRef.current += 1;
      if (trailFrameRef.current % 3 === 0) {
        const laneCount = updated.length;
        for (const ball of updated) {
          if (ball.phase !== "alongTrack") continue;
          const { x, y } = ballCenterOnTrack(
            p,
            ball.s,
            ball.laneIndex,
            laneCount
          );
          const list = trailsRef.current.get(ball.id) ?? [];
          list.push({ x, y });
          if (list.length > 400) list.shift();
          trailsRef.current.set(ball.id, list);
        }
      }

      if (followCamera) {
        const lead = updated.reduce(
          (best, b) => (b.s > best.s ? b : best),
          updated[0]
        );
        if (lead) {
          const layout = computeViewportLayout(
            sizeRef.current.width,
            sizeRef.current.height,
            p
          );
          const target = Math.max(
            0,
            lead.s - layout.viewportWidthM * 0.35
          );
          setCameraXM((c) => c + (target - c) * 0.08);
        }
      }

      if (allBallsDone(updated)) {
        transportRef.current = "paused";
        setTransport("paused");
        const winner = getRaceWinner(updated);
        const anyFinished = updated.some((b) => b.phase === "finished");
        if (winner && anyFinished) {
          setResultReport(
            buildRaceResultReport(
              winner,
              updated,
              frictionRef.current,
              predictedBallId,
              trackPresetRef.current
            )
          );
        }
      }

      paint();
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paint, followCamera, predictedBallId, ballMaterials.length]);

  const startRun = () => {
    clearTrails();
    setResultReport(null);
    setTransport("running");
    lastFrameRef.current = performance.now();
  };

  const handleStart = () => {
    if (!canMove) return;
    if (transport === "running") return;
    if (ballMaterials.length >= 2 && predictedBallId === null) {
      setPredictOpen(true);
      return;
    }
    startRun();
  };

  const handlePause = () => {
    if (transport === "running") setTransport("paused");
  };

  const handleReset = () => {
    resetRace();
    paint();
  };

  const addBall = () => {
    if (ballMaterials.length >= MAX_RACE_BALLS) return;
    setBallMaterials((m) => [...m, addMaterial]);
  };

  const removeBall = (index: number) => {
    if (ballMaterials.length <= 1) return;
    setBallMaterials((m) => m.filter((_, i) => i !== index));
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { active: true, lastX: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const { width, height } = sizeRef.current;
    const layout = computeViewportLayout(width, height, path);
    const dx = e.clientX - dragRef.current.lastX;
    dragRef.current.lastX = e.clientX;
    setCameraXM((c) =>
      Math.max(0, Math.min(path.totalLength, c - dx / layout.scale))
    );
  };

  const onCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current.active = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && !e.shiftKey) return;
    e.preventDefault();
    const { width, height } = sizeRef.current;
    const layout = computeViewportLayout(width, height, path);
    const delta = (e.deltaX + (e.shiftKey ? e.deltaY : 0)) / layout.scale;
    setCameraXM((c) =>
      Math.max(0, Math.min(path.totalLength, c + delta))
    );
  };

  return (
    <div className="physics-panel flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
      <div className="physics-controls flex w-full shrink-0 flex-col gap-5 lg:max-w-sm">
        <div>
          <label className="physics-label" htmlFor="track-preset">
            Track
          </label>
          <select
            id="track-preset"
            className="physics-select mt-2 w-full"
            value={trackPreset}
            disabled={controlsLocked}
            onChange={(e) => {
              setTrackPreset(e.target.value as TrackPresetId);
              setCameraXM(0);
            }}
          >
            {TRACK_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {trackPreset === "classic" && (
          <>
            <div>
              <label className="physics-label" htmlFor="ramp-angle">
                Ramp angle: <strong>{angleDeg}°</strong>
              </label>
              <input
                id="ramp-angle"
                type="range"
                min={ANGLE_MIN_DEG}
                max={ANGLE_MAX_DEG}
                step={1}
                value={angleDeg}
                disabled={controlsLocked}
                onChange={(e) => setAngleDeg(Number(e.target.value))}
                className="physics-range mt-2 w-full"
              />
            </div>
            <div>
              <label className="physics-label" htmlFor="ramp-length">
                Ramp length: <strong>{lengthM} m</strong>
              </label>
              <input
                id="ramp-length"
                type="range"
                min={LENGTH_MIN_M}
                max={LENGTH_MAX_M}
                step={0.5}
                value={lengthM}
                disabled={controlsLocked}
                onChange={(e) => setLengthM(Number(e.target.value))}
                className="physics-range mt-2 w-full"
              />
            </div>
          </>
        )}

        <div>
          <label className="physics-label" htmlFor="ramp-friction">
            Friction μ: <strong>{frictionMu.toFixed(2)}</strong>
          </label>
          <input
            id="ramp-friction"
            type="range"
            min={FRICTION_MIN}
            max={FRICTION_MAX}
            step={0.01}
            value={frictionMu}
            disabled={controlsLocked}
            onChange={(e) => setFrictionMu(Number(e.target.value))}
            className="physics-range mt-2 w-full"
          />
        </div>

        <div>
          <p className="physics-label mb-2">Race balls ({ballMaterials.length})</p>
          <ul className="flex flex-col gap-2">
            {ballMaterials.map((mid, i) => {
              const mat = BALL_MATERIALS[mid];
              const muEff = effectiveFriction(frictionMu, mid);
              return (
                <li
                  key={`${mid}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--physics-border)] px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: mat.color }}
                      aria-hidden
                    />
                    {mat.label}
                  </span>
                  <span className="text-xs text-[var(--physics-muted)]">
                    μ≈{muEff.toFixed(2)}
                  </span>
                  {ballMaterials.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-[var(--physics-muted)] hover:text-[var(--physics-accent)]"
                      disabled={controlsLocked}
                      onClick={() => removeBall(i)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {ballMaterials.length < MAX_RACE_BALLS && (
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className="physics-select flex-1"
                value={addMaterial}
                disabled={controlsLocked}
                onChange={(e) =>
                  setAddMaterial(e.target.value as BallMaterialId)
                }
              >
                {Object.values(BALL_MATERIALS).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="physics-btn physics-btn-secondary"
                disabled={controlsLocked}
                onClick={addBall}
              >
                Add ball
              </button>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--physics-muted)]">
          <input
            type="checkbox"
            checked={showArrows}
            onChange={(e) => setShowArrows(e.target.checked)}
            className="accent-[var(--physics-accent)]"
          />
          Show gravity &amp; motion arrows
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--physics-muted)]">
          <input
            type="checkbox"
            checked={followCamera}
            onChange={(e) => setFollowCamera(e.target.checked)}
            className="accent-[var(--physics-accent)]"
          />
          Follow lead ball
        </label>

        <div>
          <p className="physics-label mb-2">Learn more</p>
          <div className="flex flex-wrap gap-2">
            {PHYSICS_HELP_BUTTONS.map(({ topic, label }) => (
              <button
                key={topic}
                type="button"
                className="physics-info-btn"
                onClick={() => setHelpTopic(topic)}
                title={label}
              >
                ⓘ {label}
              </button>
            ))}
          </div>
        </div>

        {!canMove && (
          <p className="text-sm font-medium text-amber-700" role="status">
            Won&apos;t move — friction too high for this slope.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="physics-btn physics-btn-primary"
            disabled={!canMove || transport === "running"}
            onClick={handleStart}
          >
            Start
          </button>
          <button
            type="button"
            className="physics-btn physics-btn-secondary"
            disabled={transport !== "running"}
            onClick={handlePause}
          >
            Pause
          </button>
          <button
            type="button"
            className="physics-btn physics-btn-outline"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          ref={containerRef}
          className="physics-canvas-wrap w-full overflow-hidden rounded-2xl border border-[var(--physics-border)] touch-none"
        >
          <canvas
            ref={canvasRef}
            className="block w-full cursor-grab active:cursor-grabbing"
            aria-label="Ramp simulation"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
            onWheel={onWheel}
          />
        </div>
        <p className="text-center text-xs text-[var(--physics-muted)]">
          Drag sideways to explore the track
        </p>
      </div>

      <PhysicsRacePredictDialog
        open={predictOpen}
        balls={balls}
        onConfirm={(id) => {
          setPredictedBallId(id);
          setPredictOpen(false);
          startRun();
        }}
        onCancel={() => setPredictOpen(false)}
      />

      <PhysicsInfoDialog topic={helpTopic} onClose={() => setHelpTopic(null)} />

      <PhysicsRaceResultDialog
        report={resultReport}
        onClose={() => setResultReport(null)}
      />
    </div>
  );
}
