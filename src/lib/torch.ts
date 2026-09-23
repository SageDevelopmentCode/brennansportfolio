export const HIGH_SCORE_STORAGE_KEY = "torch-pop-high-score";

export const MAX_HEALTH = 10;
export const PLAYER_WIDTH = 48;
export const PLAYER_HEIGHT = 64;
export const PLAYER_HIT_RADIUS = 22;
export const PLAYER_SPEED = 320;
export const TORCH_SPEED = 520;
export const TORCH_RADIUS = 8;
export const PLAYER_BOTTOM_OFFSET = 48;

export const BUBBLE_MIN_RADIUS = 18;
export const BUBBLE_MAX_RADIUS = 32;
export const BUBBLE_BASE_SPEED = 60;
export const BUBBLE_SPEED_RAMP = 0.015;

export const SPAWN_INTERVAL_START_MS = 1200;
export const SPAWN_INTERVAL_MIN_MS = 400;
export const SPAWN_INTERVAL_RAMP_MS = 40;

export type Bubble = {
  id: string;
  x: number;
  y: number;
  radius: number;
  vy: number;
  hue: number;
  wobblePhase: number;
  rimOffset: number;
};

export type Torch = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type PopParticle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
};

export type TorchGameState = {
  playerX: number;
  bubbles: Bubble[];
  torches: Torch[];
  particles: PopParticle[];
  score: number;
  health: number;
  gameOver: boolean;
  elapsed: number;
  lastSpawnAt: number;
};

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `torch-${idCounter}`;
}

export function getPlayerY(height: number): number {
  return height - PLAYER_BOTTOM_OFFSET - PLAYER_HEIGHT;
}

export function createInitialState(width: number): TorchGameState {
  return {
    playerX: width / 2,
    bubbles: [],
    torches: [],
    particles: [],
    score: 0,
    health: MAX_HEALTH,
    gameOver: false,
    elapsed: 0,
    lastSpawnAt: 0,
  };
}

export function getSpawnInterval(elapsed: number): number {
  const reduced = SPAWN_INTERVAL_START_MS - elapsed * SPAWN_INTERVAL_RAMP_MS;
  return Math.max(SPAWN_INTERVAL_MIN_MS, reduced);
}

function spawnBubble(width: number): Bubble {
  const radius =
    BUBBLE_MIN_RADIUS +
    Math.random() * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS);
  const padding = radius + 8;
  const x = padding + Math.random() * (width - padding * 2);

  return {
    id: nextId(),
    x,
    y: -radius,
    radius,
    vy: BUBBLE_BASE_SPEED + Math.random() * 30,
    hue: 180 + Math.random() * 80,
    wobblePhase: Math.random() * Math.PI * 2,
    rimOffset: Math.random(),
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
  const dist = Math.hypot(dx, dy);
  return dist < ar + br;
}

function createPopParticles(x: number, y: number, hue: number): PopParticle[] {
  const count = 8;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 160;
    return {
      id: nextId(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      hue,
    };
  });
}

export function movePlayer(
  state: TorchGameState,
  dx: number,
  width: number
): TorchGameState {
  const half = PLAYER_WIDTH / 2;
  const minX = half + 8;
  const maxX = width - half - 8;
  const playerX = Math.max(minX, Math.min(maxX, state.playerX + dx));

  return { ...state, playerX };
}

export function throwTorch(
  state: TorchGameState,
  height: number
): TorchGameState {
  const playerY = getPlayerY(height);
  const originX = state.playerX;
  const originY = playerY + 12;

  const torch: Torch = {
    id: nextId(),
    x: originX,
    y: originY,
    vx: 0,
    vy: -TORCH_SPEED,
  };

  return {
    ...state,
    torches: [...state.torches, torch],
  };
}

export function tick(
  state: TorchGameState,
  dt: number,
  width: number,
  height: number
): TorchGameState {
  if (state.gameOver) return state;

  const elapsed = state.elapsed + dt;
  const speedMultiplier = 1 + elapsed * BUBBLE_SPEED_RAMP;

  let bubbles = state.bubbles.map((bubble) => ({
    ...bubble,
    y: bubble.y + bubble.vy * speedMultiplier * dt,
  }));

  let torches = state.torches.map((torch) => ({
    ...torch,
    x: torch.x + torch.vx * dt,
    y: torch.y + torch.vy * dt,
  }));

  let particles = state.particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 200 * dt,
      life: p.life - dt,
    }))
    .filter((p) => p.life > 0);

  const removedBubbleIds = new Set<string>();
  const activeTorches: Torch[] = [];
  let score = state.score;
  let health = state.health;
  let newParticles: PopParticle[] = [];

  for (const torch of torches) {
    if (
      torch.x < -20 ||
      torch.x > width + 20 ||
      torch.y < -20 ||
      torch.y > height + 20
    ) {
      continue;
    }

    let hit = false;
    for (const bubble of bubbles) {
      if (removedBubbleIds.has(bubble.id)) continue;
      if (
        circleCollision(torch.x, torch.y, TORCH_RADIUS, bubble.x, bubble.y, bubble.radius)
      ) {
        removedBubbleIds.add(bubble.id);
        score += 1;
        newParticles = newParticles.concat(
          createPopParticles(bubble.x, bubble.y, bubble.hue)
        );
        hit = true;
        break;
      }
    }

    if (!hit) {
      activeTorches.push(torch);
    }
  }

  const playerCenterY = getPlayerY(height) + PLAYER_HEIGHT / 2;

  for (const bubble of bubbles) {
    if (removedBubbleIds.has(bubble.id)) continue;
    if (
      circleCollision(
        state.playerX,
        playerCenterY,
        PLAYER_HIT_RADIUS,
        bubble.x,
        bubble.y,
        bubble.radius
      )
    ) {
      removedBubbleIds.add(bubble.id);
      health -= 1;
    }
  }

  bubbles = bubbles.filter(
    (b) => !removedBubbleIds.has(b.id) && b.y - b.radius < height + 40
  );
  torches = activeTorches;

  let lastSpawnAt = state.lastSpawnAt;
  const spawnInterval = getSpawnInterval(elapsed);
  const elapsedMs = elapsed * 1000;

  if (elapsedMs - lastSpawnAt >= spawnInterval) {
    bubbles = [...bubbles, spawnBubble(width)];
    lastSpawnAt = elapsedMs;
  }

  const gameOver = health <= 0;

  return {
    ...state,
    bubbles,
    torches,
    particles: [...particles, ...newParticles],
    score,
    health,
    gameOver,
    elapsed,
    lastSpawnAt,
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
