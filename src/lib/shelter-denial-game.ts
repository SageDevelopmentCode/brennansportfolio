import {
  DENIAL_GARY_POS,
  DENIAL_PIG_SPAWN,
  DENIAL_PLAYER_SPAWN,
  playerInExitZone,
} from "@/lib/shelter-denial-world";

export type DenialGamePhase = "escape" | "fight" | "won" | "lost";

export const GARY_MAX_HP = 5;
/** Slightly slower than player (5.6) so escape is doable but scary. */
export const PIG_SPEED = 4.2;
export const PIG_CATCH_RADIUS = 0.85;
export const PIG_GRACE_SECONDS = 2;
export const ATTACK_COOLDOWN_MS = 420;
export const ATTACK_RANGE = 3.2;
export const DENIAL_PLAYER_SPEED = 5.6;
export const DENIAL_PLAYER_RADIUS = 0.32;

export type DenialVec2 = {
  x: number;
  z: number;
};

export type DenialEntity = DenialVec2;

export type DenialGameState = {
  phase: DenialGamePhase;
  elapsed: number;
  pig: DenialEntity;
  pigActive: boolean;
  garyHp: number;
  garyFlinchUntil: number;
  lastGaryLine: string | null;
  attackCooldownUntil: number;
};

const GARY_HIT_LINES = [
  "Hey! I'm staff!",
  "That's assault!",
  "Gary files a complaint!",
  "My badge says DO NOT PUNCH",
  "The pig saw that!",
];

export function createDenialGameState(): DenialGameState {
  return {
    phase: "escape",
    elapsed: 0,
    pig: { x: DENIAL_PIG_SPAWN.x, z: DENIAL_PIG_SPAWN.z },
    pigActive: false,
    garyHp: GARY_MAX_HP,
    garyFlinchUntil: 0,
    lastGaryLine: null,
    attackCooldownUntil: 0,
  };
}

export function createDenialPlayer(): DenialVec2 {
  return { x: DENIAL_PLAYER_SPAWN.x, z: DENIAL_PLAYER_SPAWN.z };
}

function distXZ(a: DenialVec2, b: DenialVec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export type DenialTickInput = {
  dt: number;
  nowMs: number;
  player: DenialVec2;
  attackPressed: boolean;
};

export type DenialTickResult = {
  state: DenialGameState;
  pigDistance: number;
  caught: boolean;
  garyHit: boolean;
};

export function tickDenialGame(
  state: DenialGameState,
  input: DenialTickInput,
): DenialTickResult {
  const next: DenialGameState = { ...state, pig: { ...state.pig } };
  next.elapsed += input.dt;

  if (next.phase === "won" || next.phase === "lost") {
    return {
      state: next,
      pigDistance: distXZ(input.player, next.pig),
      caught: false,
      garyHit: false,
    };
  }

  if (next.phase === "escape") {
    if (next.elapsed >= PIG_GRACE_SECONDS) {
      next.pigActive = true;
    }

    if (next.pigActive) {
      const dx = input.player.x - next.pig.x;
      const dz = input.player.z - next.pig.z;
      const len = Math.hypot(dx, dz) || 1;
      const step = PIG_SPEED * input.dt;
      next.pig.x += (dx / len) * step;
      next.pig.z += (dz / len) * step;
    }

    const pigDistance = distXZ(input.player, next.pig);
    if (next.pigActive && pigDistance < PIG_CATCH_RADIUS) {
      next.phase = "lost";
      return { state: next, pigDistance, caught: true, garyHit: false };
    }

    if (playerInExitZone(input.player.x, input.player.z)) {
      next.phase = "fight";
      next.pigActive = false;
    }

    return { state: next, pigDistance, caught: false, garyHit: false };
  }

  if (next.phase === "fight") {
    let garyHit = false;
    const toGary = distXZ(input.player, {
      x: DENIAL_GARY_POS.x,
      z: DENIAL_GARY_POS.z,
    });

    if (
      input.attackPressed &&
      input.nowMs >= next.attackCooldownUntil &&
      toGary <= ATTACK_RANGE
    ) {
      next.garyHp -= 1;
      next.attackCooldownUntil = input.nowMs + ATTACK_COOLDOWN_MS;
      next.garyFlinchUntil = input.nowMs + 200;
      next.lastGaryLine =
        GARY_HIT_LINES[GARY_MAX_HP - next.garyHp] ??
        GARY_HIT_LINES[GARY_HIT_LINES.length - 1];
      garyHit = true;

      if (next.garyHp <= 0) {
        next.phase = "won";
      }
    }

    const pigDistance = distXZ(input.player, next.pig);
    return { state: next, pigDistance, caught: false, garyHit };
  }

  return {
    state: next,
    pigDistance: distXZ(input.player, next.pig),
    caught: false,
    garyHit: false,
  };
}
