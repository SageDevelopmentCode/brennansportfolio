"use client";

import {
  ATTACK_RANGE,
  createDenialGameState,
  createDenialPlayer,
  DENIAL_PLAYER_RADIUS,
  DENIAL_PLAYER_SPEED,
  tickDenialGame,
  type DenialGameState,
  type DenialVec2,
} from "@/lib/shelter-denial-game";
import {
  buildDenial2dWallGrid,
  DENIAL_EXIT_ZONE,
  DENIAL_GARY_POS,
  DENIAL_SIZE_X,
  DENIAL_SIZE_Z,
  generateShelterDenialWorld,
  moveDenialPlayer2d,
} from "@/lib/shelter-denial-world";
import { useEffect, useMemo, useRef } from "react";

export type ShelterDenial2dSceneProps = {
  gameStateRef: React.MutableRefObject<DenialGameState>;
  onGameStateChange: (state: DenialGameState) => void;
  onPigDistance: (distance: number) => void;
  onCaught: () => void;
  onGaryHit: () => void;
  onFocusChange: (focused: boolean) => void;
};

const TILE_PX = 22;

const COLORS = {
  floor: "#3d3428",
  floorAlt: "#352e24",
  wall: "#6b7280",
  wallTop: "#9ca3af",
  exit: "#22c55e",
  office: "#2d4a32",
};

function worldToScreen(
  wx: number,
  wz: number,
  camX: number,
  camZ: number,
  viewW: number,
  viewH: number,
): { sx: number; sy: number } {
  const sx = wx * TILE_PX - camX + viewW / 2;
  const sy = wz * TILE_PX - camZ + viewH / 2;
  return { sx, sy };
}

export default function ShelterDenial2dScene({
  gameStateRef,
  onGameStateChange,
  onPigDistance,
  onCaught,
  onGaryHit,
  onFocusChange,
}: ShelterDenial2dSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<DenialVec2>(createDenialPlayer());
  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const attackQueuedRef = useRef(false);
  const wallGrid = useMemo(() => {
    const voxels = generateShelterDenialWorld();
    return buildDenial2dWallGrid(voxels);
  }, []);

  const callbacksRef = useRef({
    onGameStateChange,
    onPigDistance,
    onCaught,
    onGaryHit,
    onFocusChange,
  });
  callbacksRef.current = {
    onGameStateChange,
    onPigDistance,
    onCaught,
    onGaryHit,
    onFocusChange,
  };

  useEffect(() => {
    playerRef.current = createDenialPlayer();
    gameStateRef.current = createDenialGameState();
  }, [gameStateRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const applyKey = (down: boolean, event: KeyboardEvent) => {
      if (event.code === "KeyW" || event.code === "ArrowUp") keysRef.current.up = down;
      if (event.code === "KeyS" || event.code === "ArrowDown") keysRef.current.down = down;
      if (event.code === "KeyA" || event.code === "ArrowLeft") keysRef.current.left = down;
      if (event.code === "KeyD" || event.code === "ArrowRight") keysRef.current.right = down;
      if (down && event.code === "Space" && gameStateRef.current.phase === "fight") {
        attackQueuedRef.current = true;
        event.preventDefault();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => applyKey(true, event);
    const onKeyUp = (event: KeyboardEvent) => applyKey(false, event);

    const onMouseDown = () => {
      attackQueuedRef.current = true;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("focus", () => callbacksRef.current.onFocusChange(true));
    canvas.addEventListener("blur", () => callbacksRef.current.onFocusChange(false));

    let raf = 0;
    let last = performance.now();

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const viewW = rect.width;
      const viewH = rect.height;
      if (canvas.width !== Math.floor(viewW * dpr) || canvas.height !== Math.floor(viewH * dpr)) {
        canvas.width = Math.floor(viewW * dpr);
        canvas.height = Math.floor(viewH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const gs = gameStateRef.current;
      const ended = gs.phase === "won" || gs.phase === "lost";

      if (!ended && document.activeElement === canvas) {
        const k = keysRef.current;
        let vx = 0;
        let vz = 0;
        if (k.up) vz -= DENIAL_PLAYER_SPEED;
        if (k.down) vz += DENIAL_PLAYER_SPEED;
        if (k.left) vx -= DENIAL_PLAYER_SPEED;
        if (k.right) vx += DENIAL_PLAYER_SPEED;
        const len = Math.hypot(vx, vz);
        if (len > DENIAL_PLAYER_SPEED) {
          vx = (vx / len) * DENIAL_PLAYER_SPEED;
          vz = (vz / len) * DENIAL_PLAYER_SPEED;
        }
        playerRef.current = moveDenialPlayer2d(
          playerRef.current,
          vx,
          vz,
          dt,
          wallGrid,
          DENIAL_PLAYER_RADIUS,
        );
      }

      if (!ended) {
        const attackPressed = attackQueuedRef.current;
        attackQueuedRef.current = false;
        const result = tickDenialGame(gs, {
          dt,
          nowMs: now,
          player: playerRef.current,
          attackPressed,
        });
        gameStateRef.current = result.state;
        callbacksRef.current.onGameStateChange(result.state);
        callbacksRef.current.onPigDistance(result.pigDistance);
        if (result.caught) callbacksRef.current.onCaught();
        if (result.garyHit) callbacksRef.current.onGaryHit();
      }

      const player = playerRef.current;
      const camX = player.x * TILE_PX;
      const camZ = player.z * TILE_PX;
      const state = gameStateRef.current;

      ctx.fillStyle = "#0f0a12";
      ctx.fillRect(0, 0, viewW, viewH);

      const x0 = Math.max(0, Math.floor((camX - viewW / 2) / TILE_PX) - 1);
      const x1 = Math.min(DENIAL_SIZE_X, Math.ceil((camX + viewW / 2) / TILE_PX) + 1);
      const z0 = Math.max(0, Math.floor((camZ - viewH / 2) / TILE_PX) - 1);
      const z1 = Math.min(DENIAL_SIZE_Z, Math.ceil((camZ + viewH / 2) / TILE_PX) + 1);

      for (let z = z0; z < z1; z += 1) {
        for (let x = x0; x < x1; x += 1) {
          const { sx, sy } = worldToScreen(x, z, camX, camZ, viewW, viewH);
          const wall = wallGrid[z][x];
          const inOffice = z >= 37 && x >= 6 && x <= 14;
          const inExit =
            x >= DENIAL_EXIT_ZONE.minX &&
            x <= DENIAL_EXIT_ZONE.maxX &&
            z >= DENIAL_EXIT_ZONE.minZ &&
            z <= DENIAL_EXIT_ZONE.maxZ;

          if (wall) {
            ctx.fillStyle = COLORS.wall;
            ctx.fillRect(sx, sy, TILE_PX + 1, TILE_PX + 1);
            ctx.fillStyle = COLORS.wallTop;
            ctx.fillRect(sx, sy, TILE_PX + 1, 4);
          } else {
            ctx.fillStyle =
              (x + z) % 2 === 0
                ? inOffice
                  ? COLORS.office
                  : COLORS.floor
                : inOffice
                  ? "#264228"
                  : COLORS.floorAlt;
            ctx.fillRect(sx, sy, TILE_PX, TILE_PX);
            if (inExit && state.phase === "escape") {
              ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
              ctx.fillRect(sx, sy, TILE_PX, TILE_PX);
            }
          }
        }
      }

      const drawEntity = (
        wx: number,
        wz: number,
        color: string,
        emoji: string,
        size = TILE_PX * 0.75,
      ) => {
        const { sx, sy } = worldToScreen(wx, wz, camX, camZ, viewW, viewH);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx + TILE_PX / 2, sy + TILE_PX / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${Math.floor(size * 0.9)}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, sx + TILE_PX / 2, sy + TILE_PX / 2 + 1);
      };

      if (state.phase === "escape" && state.pigActive) {
        drawEntity(state.pig.x, state.pig.z, "#e8a0b8", "🐷");
      }

      if (state.phase === "fight" || state.phase === "won") {
        const flinch = now < state.garyFlinchUntil;
        drawEntity(
          DENIAL_GARY_POS.x,
          DENIAL_GARY_POS.z,
          flinch ? "#f87171" : "#64748b",
          "🥸",
          flinch ? TILE_PX * 0.9 : TILE_PX * 0.8,
        );
        if (state.phase === "fight") {
          const { sx, sy } = worldToScreen(
            DENIAL_GARY_POS.x,
            DENIAL_GARY_POS.z,
            camX,
            camZ,
            viewW,
            viewH,
          );
          ctx.strokeStyle = "rgba(248, 113, 113, 0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            sx + TILE_PX / 2,
            sy + TILE_PX / 2,
            ATTACK_RANGE * TILE_PX,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      }

      drawEntity(player.x, player.z, "#60a5fa", "🏃");

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onMouseDown);
    };
  }, [gameStateRef, wallGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="shelter-denial-2d-canvas"
      tabIndex={0}
      aria-label="Shelter escape mini-game"
    />
  );
}
