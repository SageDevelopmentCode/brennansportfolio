export const HIGH_SCORE_STORAGE_KEY = "egg-whack-high-score";

export const WIN_SCORE = 100;
export const MAX_HEALTH = 7;
export const EGG_DAMAGE = 0.5;
export const SPIKE_DAMAGE = 1;
export const CHICKEN_DAMAGE = 2;
export const HEART_HEAL = 1;

export const PLAYER_WIDTH = 52;
export const PLAYER_HEIGHT = 64;
export const PLAYER_HIT_RADIUS = 22;
export const PLAYER_SPEED = 300;
export const PLAYER_BOTTOM_OFFSET = 48;

export const SPATULA_SWING_MS = 220;
export const SPATULA_HIT_WIDTH = 70;
export const SPATULA_HIT_HEIGHT = 50;

export const EGG_MIN_RADIUS = 16;
export const EGG_MAX_RADIUS = 24;
export const EGG_BASE_SPEED = 90;
export const SPIKE_WIDTH = 28;
export const SPIKE_HEIGHT = 36;
export const SPIKE_BASE_SPEED = 310;

export const EGG_SPAWN_START_MS = 650;
export const EGG_SPAWN_MIN_MS = 380;
export const EGG_SPAWN_RAMP_MS = 30;
export const SPIKE_SPAWN_START_MS = 2500;
export const SPIKE_SPAWN_MIN_MS = 1200;
export const SPIKE_SPAWN_RAMP_MS = 50;

export const BLOB_RADIUS = 24;
export const BLOB_SPEED = 95;
export const BLOB_SPAWN_START_MS = 5000;
export const BLOB_SPAWN_MIN_MS = 2800;
export const BLOB_SPAWN_RAMP_MS = 40;

export const HEART_RADIUS = 16;
export const HEART_FALL_SPEED = 65;
export const HEART_SPAWN_INTERVAL_MS = 16000;

export const CHICKEN_RADIUS = 20;
export const CHICKEN_SPEED = 130;
export const CHICKEN_SPAWN_START_MS = 3500;
export const CHICKEN_SPAWN_MIN_MS = 1800;
export const CHICKEN_SPAWN_RAMP_MS = 35;

export type Egg = {
  id: string;
  x: number;
  y: number;
  radius: number;
  vy: number;
};

export type Spike = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
};

export type Blob = {
  id: string;
  x: number;
  y: number;
  radius: number;
  wobblePhase: number;
};

export type HeartPickup = {
  id: string;
  x: number;
  y: number;
  radius: number;
  vy: number;
};

export type Chicken = {
  id: string;
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  flapPhase: number;
};

export type TickEvents = {
  blobsKilled: number;
};

export type EggGameState = {
  playerX: number;
  eggs: Egg[];
  spikes: Spike[];
  blobs: Blob[];
  hearts: HeartPickup[];
  chickens: Chicken[];
  score: number;
  health: number;
  swingUntil: number;
  gameOver: boolean;
  won: boolean;
  elapsed: number;
  lastEggSpawnAt: number;
  lastSpikeSpawnAt: number;
  lastBlobSpawnAt: number;
  lastHeartSpawnAt: number;
  lastChickenSpawnAt: number;
};

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `egg-${idCounter}`;
}

export function getPlayerY(height: number): number {
  return height - PLAYER_BOTTOM_OFFSET - PLAYER_HEIGHT;
}

export function createInitialState(width: number): EggGameState {
  return {
    playerX: width / 2,
    eggs: [],
    spikes: [],
    blobs: [],
    hearts: [],
    chickens: [],
    score: 0,
    health: MAX_HEALTH,
    swingUntil: 0,
    gameOver: false,
    won: false,
    elapsed: 0,
    lastEggSpawnAt: 0,
    lastSpikeSpawnAt: 0,
    lastBlobSpawnAt: 0,
    lastHeartSpawnAt: 0,
    lastChickenSpawnAt: 0,
  };
}

function circleCollision(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy) < ar + br;
}

function circleRectCollision(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function getSpatulaHitbox(
  playerX: number,
  height: number
): { x: number; y: number; w: number; h: number } {
  const playerY = getPlayerY(height);
  return {
    x: playerX - SPATULA_HIT_WIDTH / 2,
    y: playerY - SPATULA_HIT_HEIGHT,
    w: SPATULA_HIT_WIDTH,
    h: SPATULA_HIT_HEIGHT,
  };
}

function spawnEgg(width: number): Egg {
  const radius =
    EGG_MIN_RADIUS + Math.random() * (EGG_MAX_RADIUS - EGG_MIN_RADIUS);
  const padding = radius + 8;
  const x = padding + Math.random() * (width - padding * 2);

  return {
    id: nextId(),
    x,
    y: -radius * 2,
    radius,
    vy: EGG_BASE_SPEED + Math.random() * 40,
  };
}

function spawnSpike(width: number): Spike {
  const padding = SPIKE_WIDTH / 2 + 8;
  const x = padding + Math.random() * (width - padding * 2);

  return {
    id: nextId(),
    x,
    y: -SPIKE_HEIGHT,
    width: SPIKE_WIDTH,
    height: SPIKE_HEIGHT,
    vy: SPIKE_BASE_SPEED + Math.random() * 80,
  };
}

function spawnBlob(width: number, height: number): Blob {
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -BLOB_RADIUS : width + BLOB_RADIUS;
  const y = height * 0.25 + Math.random() * height * 0.45;

  return {
    id: nextId(),
    x,
    y,
    radius: BLOB_RADIUS,
    wobblePhase: Math.random() * Math.PI * 2,
  };
}

function findNearestEgg(blob: Blob, eggs: Egg[]): Egg | null {
  if (eggs.length === 0) return null;

  let nearest: Egg | null = null;
  let nearestDist = Infinity;

  for (const egg of eggs) {
    const dist = Math.hypot(egg.x - blob.x, egg.y - blob.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = egg;
    }
  }

  return nearest;
}

function getEggSpawnInterval(elapsed: number): number {
  const reduced = EGG_SPAWN_START_MS - elapsed * EGG_SPAWN_RAMP_MS;
  return Math.max(EGG_SPAWN_MIN_MS, reduced);
}

function getSpikeSpawnInterval(elapsed: number): number {
  const reduced = SPIKE_SPAWN_START_MS - elapsed * SPIKE_SPAWN_RAMP_MS;
  return Math.max(SPIKE_SPAWN_MIN_MS, reduced);
}

function getBlobSpawnInterval(elapsed: number): number {
  const reduced = BLOB_SPAWN_START_MS - elapsed * BLOB_SPAWN_RAMP_MS;
  return Math.max(BLOB_SPAWN_MIN_MS, reduced);
}

function spawnHeart(width: number): HeartPickup {
  const padding = HEART_RADIUS + 12;
  const x = padding + Math.random() * (width - padding * 2);
  return {
    id: nextId(),
    x,
    y: -HEART_RADIUS * 2,
    radius: HEART_RADIUS,
    vy: HEART_FALL_SPEED,
  };
}

function spawnChicken(width: number, height: number): Chicken {
  const fromLeft = Math.random() < 0.5;
  const y = height * 0.35 + Math.random() * (height * 0.45);
  return {
    id: nextId(),
    x: fromLeft ? CHICKEN_RADIUS + 10 : width - CHICKEN_RADIUS - 10,
    y,
    vx: fromLeft ? CHICKEN_SPEED : -CHICKEN_SPEED,
    facing: fromLeft ? 1 : -1,
    flapPhase: Math.random() * Math.PI * 2,
  };
}

function getChickenSpawnInterval(elapsed: number): number {
  const reduced = CHICKEN_SPAWN_START_MS - elapsed * CHICKEN_SPAWN_RAMP_MS;
  return Math.max(CHICKEN_SPAWN_MIN_MS, reduced);
}

export function movePlayer(
  state: EggGameState,
  dx: number,
  width: number
): EggGameState {
  const half = PLAYER_WIDTH / 2;
  const minX = half + 8;
  const maxX = width - half - 8;
  const playerX = Math.max(minX, Math.min(maxX, state.playerX + dx));

  return { ...state, playerX };
}

export function startSwing(state: EggGameState, now: number): EggGameState {
  if (now < state.swingUntil) return state;
  return { ...state, swingUntil: now + SPATULA_SWING_MS };
}

export function isSwinging(state: EggGameState, now: number): boolean {
  return now < state.swingUntil;
}

export function tick(
  state: EggGameState,
  dt: number,
  now: number,
  width: number,
  height: number
): { state: EggGameState; events: TickEvents } {
  if (state.gameOver || state.won) {
    return { state, events: { blobsKilled: 0 } };
  }

  const elapsed = state.elapsed + dt;
  const elapsedMs = elapsed * 1000;
  const speedMultiplier = 1 + elapsed * 0.01;

  let eggs = state.eggs.map((egg) => ({
    ...egg,
    y: egg.y + egg.vy * speedMultiplier * dt,
  }));

  let spikes = state.spikes.map((spike) => ({
    ...spike,
    y: spike.y + spike.vy * speedMultiplier * dt,
  }));

  let blobs = state.blobs.map((blob) => {
    const target = findNearestEgg(blob, eggs);
    if (!target) return blob;

    const dx = target.x - blob.x;
    const dy = target.y - blob.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = BLOB_SPEED * speedMultiplier;
    return {
      ...blob,
      x: blob.x + (dx / dist) * speed * dt,
      y: blob.y + (dy / dist) * speed * dt,
    };
  });

  let hearts = state.hearts.map((heart) => ({
    ...heart,
    y: heart.y + heart.vy * dt,
  }));

  let chickens = state.chickens.map((chicken) => {
    let x = chicken.x + chicken.vx * speedMultiplier * dt;
    let vx = chicken.vx;
    let facing = chicken.facing;
    const margin = CHICKEN_RADIUS + 8;

    if (x < margin) {
      x = margin;
      vx = Math.abs(vx);
      facing = 1;
    } else if (x > width - margin) {
      x = width - margin;
      vx = -Math.abs(vx);
      facing = -1;
    }

    return {
      ...chicken,
      x,
      vx,
      facing,
      flapPhase: chicken.flapPhase + dt * 12,
    };
  });

  const removedEggIds = new Set<string>();
  const removedSpikeIds = new Set<string>();
  const removedBlobIds = new Set<string>();
  const removedHeartIds = new Set<string>();
  const removedChickenIds = new Set<string>();
  let blobsKilled = 0;
  let score = state.score;
  let health = state.health;

  if (isSwinging(state, now)) {
    const hitbox = getSpatulaHitbox(state.playerX, height);
    for (const egg of eggs) {
      if (removedEggIds.has(egg.id)) continue;
      if (
        circleRectCollision(
          egg.x,
          egg.y,
          egg.radius,
          hitbox.x,
          hitbox.y,
          hitbox.w,
          hitbox.h
        )
      ) {
        removedEggIds.add(egg.id);
        score += 1;
      }
    }

    for (const blob of blobs) {
      if (removedBlobIds.has(blob.id)) continue;
      if (
        circleRectCollision(
          blob.x,
          blob.y,
          blob.radius,
          hitbox.x,
          hitbox.y,
          hitbox.w,
          hitbox.h
        )
      ) {
        removedBlobIds.add(blob.id);
        blobsKilled += 1;
      }
    }

    for (const chicken of chickens) {
      if (removedChickenIds.has(chicken.id)) continue;
      if (
        circleRectCollision(
          chicken.x,
          chicken.y,
          CHICKEN_RADIUS,
          hitbox.x,
          hitbox.y,
          hitbox.w,
          hitbox.h
        )
      ) {
        removedChickenIds.add(chicken.id);
      }
    }
  }

  const playerCenterY = getPlayerY(height) + PLAYER_HEIGHT / 2;

  for (const egg of eggs) {
    if (removedEggIds.has(egg.id)) continue;
    if (
      circleCollision(
        state.playerX,
        playerCenterY,
        PLAYER_HIT_RADIUS,
        egg.x,
        egg.y,
        egg.radius
      )
    ) {
      removedEggIds.add(egg.id);
      health = Math.max(0, health - EGG_DAMAGE);
    }
  }

  for (const spike of spikes) {
    const spikeCenterX = spike.x;
    const spikeCenterY = spike.y + spike.height / 2;
    const spikeRadius = Math.max(spike.width, spike.height) / 2;
    if (
      circleCollision(
        state.playerX,
        playerCenterY,
        PLAYER_HIT_RADIUS,
        spikeCenterX,
        spikeCenterY,
        spikeRadius
      )
    ) {
      removedSpikeIds.add(spike.id);
      health = Math.max(0, health - SPIKE_DAMAGE);
    }
  }

  for (const blob of blobs) {
    if (removedBlobIds.has(blob.id)) continue;

    for (const egg of eggs) {
      if (removedEggIds.has(egg.id)) continue;
      if (
        circleCollision(blob.x, blob.y, blob.radius, egg.x, egg.y, egg.radius)
      ) {
        removedEggIds.add(egg.id);
        break;
      }
    }
  }

  for (const heart of hearts) {
    if (removedHeartIds.has(heart.id)) continue;
    if (
      circleCollision(
        state.playerX,
        playerCenterY,
        PLAYER_HIT_RADIUS,
        heart.x,
        heart.y,
        heart.radius
      )
    ) {
      removedHeartIds.add(heart.id);
      health = Math.min(MAX_HEALTH, health + HEART_HEAL);
    }
  }

  for (const chicken of chickens) {
    if (removedChickenIds.has(chicken.id)) continue;
    if (
      circleCollision(
        state.playerX,
        playerCenterY,
        PLAYER_HIT_RADIUS,
        chicken.x,
        chicken.y,
        CHICKEN_RADIUS
      )
    ) {
      removedChickenIds.add(chicken.id);
      health = Math.max(0, health - CHICKEN_DAMAGE);
    }
  }

  eggs = eggs.filter(
    (e) =>
      !removedEggIds.has(e.id) && e.y - e.radius < height + 40
  );
  spikes = spikes.filter(
    (s) => !removedSpikeIds.has(s.id) && s.y < height + 40
  );
  blobs = blobs.filter(
    (b) =>
      !removedBlobIds.has(b.id) &&
      b.x > -b.radius - 20 &&
      b.x < width + b.radius + 20 &&
      b.y > -b.radius - 20 &&
      b.y < height + b.radius + 20
  );
  hearts = hearts.filter(
    (h) => !removedHeartIds.has(h.id) && h.y - h.radius < height + 40
  );
  chickens = chickens.filter((c) => !removedChickenIds.has(c.id));

  let lastEggSpawnAt = state.lastEggSpawnAt;
  let lastSpikeSpawnAt = state.lastSpikeSpawnAt;
  let lastBlobSpawnAt = state.lastBlobSpawnAt;
  let lastHeartSpawnAt = state.lastHeartSpawnAt;
  let lastChickenSpawnAt = state.lastChickenSpawnAt;

  if (elapsedMs - lastEggSpawnAt >= getEggSpawnInterval(elapsed)) {
    eggs = [...eggs, spawnEgg(width)];
    lastEggSpawnAt = elapsedMs;
  }

  if (elapsedMs - lastSpikeSpawnAt >= getSpikeSpawnInterval(elapsed)) {
    spikes = [...spikes, spawnSpike(width)];
    lastSpikeSpawnAt = elapsedMs;
  }

  if (elapsedMs - lastBlobSpawnAt >= getBlobSpawnInterval(elapsed)) {
    blobs = [...blobs, spawnBlob(width, height)];
    lastBlobSpawnAt = elapsedMs;
  }

  if (
    health < MAX_HEALTH &&
    elapsedMs - lastHeartSpawnAt >= HEART_SPAWN_INTERVAL_MS
  ) {
    hearts = [...hearts, spawnHeart(width)];
    lastHeartSpawnAt = elapsedMs;
  }

  if (
    chickens.length < 8 &&
    elapsedMs - lastChickenSpawnAt >= getChickenSpawnInterval(elapsed)
  ) {
    chickens = [...chickens, spawnChicken(width, height)];
    if (chickens.length < 7 && Math.random() < 0.4) {
      chickens = [...chickens, spawnChicken(width, height)];
    }
    lastChickenSpawnAt = elapsedMs;
  }

  const won = score >= WIN_SCORE;
  const gameOver = health <= 0;

  return {
    state: {
      ...state,
      eggs,
      spikes,
      blobs,
      hearts,
      chickens,
      score,
      health,
      won,
      gameOver,
      elapsed,
      lastEggSpawnAt,
      lastSpikeSpawnAt,
      lastBlobSpawnAt,
      lastHeartSpawnAt,
      lastChickenSpawnAt,
    },
    events: { blobsKilled },
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
