export const HIGH_SCORE_STORAGE_KEY = "egg-whack-high-score";

export const HUNGER_MAX = 100;
export const HUNGER_DRAIN_BASE = 4.5;
export const HUNGER_DRAIN_SPEED_SCALE = 0.08;
export const BANANA_HUNGER = 14;
export const GOLDEN_BANANA_HUNGER = 28;
export const NORMAL_BANANA_SCORE = 1;
export const GOLDEN_BANANA_SCORE = 3;

export const LANE_WIDTH = 1.4;
export type Lane = -1 | 0 | 1;

export const PLAYER_COLLIDE_Z = 0.85;
export const COLLIDE_Z_MIN = -0.35;
export const SPAWN_Z_MIN = -48;
export const SPAWN_Z_MAX = -32;
export const DESPAWN_Z = 4;

export const BASE_SCROLL = 9;
export const SCROLL_RAMP = 0.018;

export const LANE_CHANGE_COOLDOWN_MS = 150;

export const JUMP_VELOCITY = 5.8;
export const GRAVITY = 20;
export const JUMP_CLEAR_Y = 0.52;
export const JUMP_COOLDOWN_MS = 120;

export const BANANA_SPAWN_START_MS = 650;
export const BANANA_SPAWN_MIN_MS = 380;
export const BANANA_SPAWN_RAMP_MS = 26;

export const OBSTACLE_SPAWN_START_MS = 2000;
export const OBSTACLE_SPAWN_MIN_MS = 850;
export const OBSTACLE_SPAWN_RAMP_MS = 48;

export const LANE_BLOCKER_MIN_Z_GAP = 5.5;

export type BananaKind = "normal" | "golden";

export type Banana = {
  id: string;
  lane: Lane;
  z: number;
  kind: BananaKind;
};

export type ObstacleKind = "lane" | "low";

export type Obstacle = {
  id: string;
  lane: Lane;
  z: number;
  kind: ObstacleKind;
};

export type GameOverReason = "crash" | "starve";

export type TickEvents = {
  bananasCollected: number;
  goldenBananasCollected: number;
  crashed: boolean;
};

export type EggGameState = {
  playerLane: Lane;
  laneChangeCooldownUntil: number;
  playerY: number;
  playerVy: number;
  jumpCooldownUntil: number;
  bananas: Banana[];
  obstacles: Obstacle[];
  score: number;
  hunger: number;
  gameOver: boolean;
  gameOverReason: GameOverReason | null;
  elapsed: number;
  lastBananaSpawnAt: number;
  lastObstacleSpawnAt: number;
};

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `run-${idCounter}`;
}

function rollBananaKind(): BananaKind {
  return Math.random() < 0.12 ? "golden" : "normal";
}

function randomLane(): Lane {
  const lanes: Lane[] = [-1, 0, 1];
  return lanes[Math.floor(Math.random() * 3)]!;
}

function randomSpawnZ(): number {
  return SPAWN_Z_MIN + Math.random() * (SPAWN_Z_MAX - SPAWN_Z_MIN);
}

function rollObstacleKind(): ObstacleKind {
  return Math.random() < 0.55 ? "lane" : "low";
}

export function laneToX(lane: Lane): number {
  return lane * LANE_WIDTH;
}

export function getScrollSpeed(elapsed: number): number {
  return BASE_SCROLL * (1 + elapsed * SCROLL_RAMP);
}

export function getDifficultyTier(elapsed: number): number {
  return Math.min(5, 1 + Math.floor(elapsed / 30));
}

const DIFFICULTY_LABELS = ["Trek", "Sprint", "Canopy", "Rush", "Frenzy"];

export function getDifficultyLabel(elapsed: number): string {
  const tier = getDifficultyTier(elapsed);
  return DIFFICULTY_LABELS[tier - 1] ?? "Frenzy";
}

export function getMaxObstacles(elapsed: number): number {
  return Math.min(7, 2 + Math.floor(elapsed / 22));
}

export function createInitialState(): EggGameState {
  return {
    playerLane: 0,
    laneChangeCooldownUntil: 0,
    playerY: 0,
    playerVy: 0,
    jumpCooldownUntil: 0,
    bananas: [],
    obstacles: [],
    score: 0,
    hunger: HUNGER_MAX,
    gameOver: false,
    gameOverReason: null,
    elapsed: 0,
    lastBananaSpawnAt: 0,
    lastObstacleSpawnAt: 0,
  };
}

function getBananaSpawnInterval(elapsed: number): number {
  const reduced = BANANA_SPAWN_START_MS - elapsed * BANANA_SPAWN_RAMP_MS;
  return Math.max(BANANA_SPAWN_MIN_MS, reduced);
}

function getObstacleSpawnInterval(elapsed: number): number {
  let interval = OBSTACLE_SPAWN_START_MS - elapsed * OBSTACLE_SPAWN_RAMP_MS;
  if (elapsed > 60) interval *= 0.7;
  else if (elapsed > 30) interval *= 0.85;
  return Math.max(OBSTACLE_SPAWN_MIN_MS, interval);
}

function spawnBanana(): Banana {
  return {
    id: nextId(),
    lane: randomLane(),
    z: randomSpawnZ(),
    kind: rollBananaKind(),
  };
}

function spawnObstacle(kind: ObstacleKind): Obstacle {
  return {
    id: nextId(),
    lane: randomLane(),
    z: randomSpawnZ(),
    kind,
  };
}

function sameLane(a: Lane, b: Lane): boolean {
  return a === b;
}

function inPlayerCollideZ(z: number): boolean {
  return z >= COLLIDE_Z_MIN && z <= PLAYER_COLLIDE_Z;
}

function hungerDrainPerSecond(elapsed: number): number {
  const speed = getScrollSpeed(elapsed);
  return HUNGER_DRAIN_BASE + speed * HUNGER_DRAIN_SPEED_SCALE;
}

function pickLaneForBlocker(obstacles: Obstacle[]): Lane {
  const recentLaneBlockers = obstacles.filter(
    (o) => o.kind === "lane" && o.z > SPAWN_Z_MIN + 8
  );
  if (recentLaneBlockers.length === 0) return randomLane();

  const blocked = new Set(recentLaneBlockers.map((o) => o.lane));
  const open: Lane[] = [-1, 0, 1].filter((l) => !blocked.has(l as Lane)) as Lane[];
  if (open.length > 0) {
    return open[Math.floor(Math.random() * open.length)]!;
  }
  return randomLane();
}

function wouldBlockAllLanes(obstacles: Obstacle[], candidate: Obstacle): boolean {
  const windowMin = candidate.z - LANE_BLOCKER_MIN_Z_GAP;
  const windowMax = candidate.z + LANE_BLOCKER_MIN_Z_GAP;
  const lanesBlocked = new Set<Lane>();
  for (const o of obstacles) {
    if (o.kind !== "lane") continue;
    if (o.z >= windowMin && o.z <= windowMax) {
      lanesBlocked.add(o.lane);
    }
  }
  lanesBlocked.add(candidate.lane);
  return lanesBlocked.size >= 3;
}

export function tryChangeLane(
  state: EggGameState,
  direction: -1 | 1,
  nowMs: number
): EggGameState {
  if (nowMs < state.laneChangeCooldownUntil) return state;
  const next = (state.playerLane + direction) as number;
  if (next < -1 || next > 1) return state;
  return {
    ...state,
    playerLane: next as Lane,
    laneChangeCooldownUntil: nowMs + LANE_CHANGE_COOLDOWN_MS,
  };
}

export function tryJump(state: EggGameState, nowMs: number): EggGameState {
  if (nowMs < state.jumpCooldownUntil) return state;
  if (state.playerY > 0.02 || state.playerVy > 0.1) return state;
  return {
    ...state,
    playerVy: JUMP_VELOCITY,
    jumpCooldownUntil: nowMs + JUMP_COOLDOWN_MS,
  };
}

export function tick(
  state: EggGameState,
  dt: number,
  _now: number
): { state: EggGameState; events: TickEvents } {
  const emptyEvents: TickEvents = {
    bananasCollected: 0,
    goldenBananasCollected: 0,
    crashed: false,
  };

  if (state.gameOver) {
    return { state, events: emptyEvents };
  }

  const elapsed = state.elapsed + dt;
  const elapsedMs = elapsed * 1000;
  const scrollSpeed = getScrollSpeed(elapsed);
  const dz = scrollSpeed * dt;

  let playerY = state.playerY;
  let playerVy = state.playerVy;
  playerVy -= GRAVITY * dt;
  playerY += playerVy * dt;
  if (playerY <= 0) {
    playerY = 0;
    playerVy = 0;
  }

  let bananas = state.bananas.map((b) => ({ ...b, z: b.z + dz }));
  let obstacles = state.obstacles.map((o) => ({ ...o, z: o.z + dz }));

  const removedBananaIds = new Set<string>();

  let bananasCollected = 0;
  let goldenBananasCollected = 0;
  let score = state.score;
  let hunger = state.hunger - hungerDrainPerSecond(elapsed) * dt;
  let gameOverReason = state.gameOverReason;
  let crashed = false;

  for (const banana of bananas) {
    if (removedBananaIds.has(banana.id)) continue;
    if (
      sameLane(banana.lane, state.playerLane) &&
      inPlayerCollideZ(banana.z)
    ) {
      removedBananaIds.add(banana.id);
      if (banana.kind === "golden") {
        score += GOLDEN_BANANA_SCORE;
        hunger = Math.min(HUNGER_MAX, hunger + GOLDEN_BANANA_HUNGER);
        goldenBananasCollected += 1;
      } else {
        score += NORMAL_BANANA_SCORE;
        hunger = Math.min(HUNGER_MAX, hunger + BANANA_HUNGER);
        bananasCollected += 1;
      }
    }
  }

  for (const obstacle of obstacles) {
    if (!sameLane(obstacle.lane, state.playerLane)) continue;
    if (!inPlayerCollideZ(obstacle.z)) continue;

    if (obstacle.kind === "lane") {
      crashed = true;
      gameOverReason = "crash";
      break;
    }
    if (obstacle.kind === "low" && playerY < JUMP_CLEAR_Y) {
      crashed = true;
      gameOverReason = "crash";
      break;
    }
  }

  bananas = bananas.filter((b) => !removedBananaIds.has(b.id) && b.z < DESPAWN_Z);
  obstacles = obstacles.filter((o) => o.z < DESPAWN_Z);

  let lastBananaSpawnAt = state.lastBananaSpawnAt;
  let lastObstacleSpawnAt = state.lastObstacleSpawnAt;

  if (elapsedMs - lastBananaSpawnAt >= getBananaSpawnInterval(elapsed)) {
    bananas = [...bananas, spawnBanana()];
    if (Math.random() < 0.35) {
      bananas = [...bananas, spawnBanana()];
    }
    lastBananaSpawnAt = elapsedMs;
  }

  const maxObstacles = getMaxObstacles(elapsed);
  if (
    !crashed &&
    obstacles.length < maxObstacles &&
    elapsedMs - lastObstacleSpawnAt >= getObstacleSpawnInterval(elapsed)
  ) {
    const kind = rollObstacleKind();
    let candidate =
      kind === "lane"
        ? { ...spawnObstacle("lane"), lane: pickLaneForBlocker(obstacles) }
        : spawnObstacle("low");

    if (candidate.kind === "lane" && wouldBlockAllLanes(obstacles, candidate)) {
      const altLane = ([-1, 0, 1] as Lane[]).find((l) => l !== candidate.lane);
      if (altLane !== undefined) {
        candidate = { ...candidate, lane: altLane };
      }
    }

    if (
      candidate.kind !== "lane" ||
      !wouldBlockAllLanes(obstacles, candidate)
    ) {
      obstacles = [...obstacles, candidate];
    }
    lastObstacleSpawnAt = elapsedMs;
  }

  if (!crashed && hunger <= 0) {
    gameOverReason = "starve";
  }

  const gameOver = crashed || hunger <= 0;

  return {
    state: {
      ...state,
      playerY,
      playerVy,
      bananas,
      obstacles,
      score,
      hunger: Math.max(0, hunger),
      gameOver,
      gameOverReason,
      elapsed,
      lastBananaSpawnAt,
      lastObstacleSpawnAt,
    },
    events: {
      bananasCollected,
      goldenBananasCollected,
      crashed,
    },
  };
}

export function loadHighScore(): number {
  if (typeof window === "undefined") return 0;

  try {
    const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): number {
  const current = loadHighScore();
  const next = Math.max(current, score);

  if (typeof window !== "undefined") {
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(next));
  }

  return next;
}
