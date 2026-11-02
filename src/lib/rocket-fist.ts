export const HIGH_SCORE_STORAGE_KEY = "rocket-fist-best";

export const MAX_HEARTS = 3;
export const PLAYER_RADIUS = 18;
export const PLAYER_SPEED = 305;

const DASH_SPEED = 1080;
const DASH_TIME = 0.15;
const DASH_COOLDOWN = 0.74;
const PUNCH_COOLDOWN = 0.3;
const TRIPLE_PUNCH_COOLDOWN = 0.2;
const FIST_SPEED = 780;
const FIST_LIFE = 0.42;
const FIST_RADIUS = 11;
const SPLASH_RADIUS = 62;
const COMBO_WINDOW = 2.45;
const HURT_INVULN = 1.05;
const HIT_LOCK = 0.11;
const SLOW_SCALE = 0.45;
const ENEMY_CAP = 12;

export type EnemyKind =
  | "chomp"
  | "balloon"
  | "saw"
  | "washer"
  | "dragon"
  | "trex";

export type BossKind = "washer" | "dragon" | "trex";

export type PickupKind = "triple" | "shield" | "slow" | "pizza";

export const BOSS_LABEL: Record<BossKind, string> = {
  washer: "WASHER KING",
  dragon: "PIZZA DRAGON",
  trex: "SUNGLASSES T-REX",
};

const SCORE: Record<EnemyKind, number> = {
  chomp: 100,
  balloon: 150,
  saw: 200,
  washer: 800,
  dragon: 1000,
  trex: 1200,
};

export type Enemy = {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  hurtFlash: number;
  attackTimer: number;
  phase: number;
  angle: number;
  boss: boolean;
};

export type Fist = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
};

export type Hazard = {
  id: string;
  kind: "bomb" | "fire";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  fuse: number;
};

export type Pickup = {
  id: string;
  kind: PickupKind;
  x: number;
  y: number;
  life: number;
  radius: number;
};

export type Floater = {
  id: string;
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  big: boolean;
};

export type Particle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
};

export type RocketState = {
  playerX: number;
  playerY: number;
  facing: number;
  hearts: number;
  score: number;
  combo: number;
  bestCombo: number;
  comboLeft: number;
  wave: number;
  banner: string;
  bannerLeft: number;
  intermission: number;
  spawnLeft: EnemyKind[];
  spawnTimer: number;
  enemies: Enemy[];
  fists: Fist[];
  hazards: Hazard[];
  pickups: Pickup[];
  floaters: Floater[];
  particles: Particle[];
  punchCd: number;
  dashCd: number;
  dashLeft: number;
  dashVx: number;
  dashVy: number;
  invuln: number;
  tripleLeft: number;
  shieldLeft: number;
  slowLeft: number;
  shake: number;
  hurtFlash: number;
  gameOver: boolean;
  elapsed: number;
  kills: number;
};

export type FrameInput = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  punch: boolean;
  dash: boolean;
  width: number;
  height: number;
};

export type GameEvent =
  | { type: "punch" }
  | { type: "explode"; big: boolean }
  | { type: "dash" }
  | { type: "hurt" }
  | { type: "block" }
  | { type: "pickup"; kind: PickupKind }
  | { type: "boss" }
  | { type: "wave" }
  | { type: "gameover" };

export type BestRecord = {
  score: number;
  combo: number;
};

type Arena = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `rf-${idCounter}`;
}

export function isBossKind(kind: EnemyKind): kind is BossKind {
  return kind === "washer" || kind === "dragon" || kind === "trex";
}

export function livingBoss(state: RocketState): Enemy | null {
  return state.enemies.find((enemy) => enemy.boss && enemy.hp > 0) ?? null;
}

export function getArena(width: number, height: number): Arena {
  return arena(width, height);
}

function arena(width: number, height: number): Arena {
  const top = Math.round(Math.min(Math.max(height * 0.3, 150), height * 0.36));
  const bottom = Math.round(Math.min(Math.max(height * 0.18, 120), height * 0.24));
  const side = 28;
  return {
    left: side,
    top,
    right: Math.max(side + 80, width - side),
    bottom: Math.max(top + 120, height - bottom),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function colorFor(kind: EnemyKind): string {
  switch (kind) {
    case "chomp":
      return "#fb7185";
    case "balloon":
      return "#c084fc";
    case "saw":
      return "#e2e8f0";
    case "washer":
      return "#7dd3fc";
    case "dragon":
      return "#fb923c";
    case "trex":
      return "#4ade80";
  }
}

function radiusFor(kind: EnemyKind): number {
  switch (kind) {
    case "chomp":
      return 20;
    case "balloon":
      return 24;
    case "saw":
      return 16;
    case "washer":
      return 56;
    case "dragon":
      return 48;
    case "trex":
      return 50;
  }
}

function hpFor(kind: EnemyKind, wave: number): number {
  if (kind === "washer") return 12 + wave * 2;
  if (kind === "dragon") return 14 + wave * 2;
  if (kind === "trex") return 16 + wave * 2;
  if (kind === "saw" && wave >= 7) return 2;
  return 1;
}

function buildWave(wave: number): EnemyKind[] {
  const loop = Math.floor((wave - 1) / 3);

  if (wave % 3 === 0) {
    const bosses: BossKind[] = ["washer", "dragon", "trex"];
    const boss = bosses[(wave / 3 - 1) % bosses.length];
    const adds: EnemyKind[] = [];
    const addCount = 2 + loop;
    for (let i = 0; i < addCount; i += 1) {
      if (wave >= 6 && i % 3 === 2) adds.push("saw");
      else if (i % 2 === 1) adds.push("balloon");
      else adds.push("chomp");
    }
    return [boss, ...adds];
  }

  const count = 4 + wave;
  const kinds: EnemyKind[] = [];
  for (let i = 0; i < count; i += 1) {
    if (wave >= 4 && i % 5 === 4) kinds.push("saw");
    else if (wave >= 2 && i % 3 === 2) kinds.push("balloon");
    else kinds.push("chomp");
  }
  return kinds;
}

function edgeSpot(box: Arena, radius: number): { x: number; y: number } {
  const edge = Math.floor(Math.random() * 4);
  const xSpan = Math.max(1, box.right - box.left - radius * 2);
  const ySpan = Math.max(1, box.bottom - box.top - radius * 2);
  if (edge === 0) {
    return { x: box.left + radius + Math.random() * xSpan, y: box.top + radius };
  }
  if (edge === 1) {
    return { x: box.right - radius, y: box.top + radius + Math.random() * ySpan };
  }
  if (edge === 2) {
    return {
      x: box.left + radius + Math.random() * xSpan,
      y: box.bottom - radius,
    };
  }
  return { x: box.left + radius, y: box.top + radius + Math.random() * ySpan };
}

function makeEnemy(
  kind: EnemyKind,
  wave: number,
  width: number,
  height: number,
  playerX: number,
  playerY: number
): Enemy {
  const radius = radiusFor(kind);
  const box = arena(width, height);
  let x = (box.left + box.right) / 2;
  let y = box.top + radius + 8;

  if (!isBossKind(kind)) {
    const spot = edgeSpot(box, radius);
    x = spot.x;
    y = spot.y;
    if (dist(x, y, playerX, playerY) < 170) {
      x = x < width / 2 ? box.right - radius : box.left + radius;
      y = y < height / 2 ? box.bottom - radius : box.top + radius;
    }
  }

  const hp = hpFor(kind, wave);
  const angle = Math.random() * Math.PI * 2;
  const sawSpeed = 210 + wave * 14;

  return {
    id: nextId(),
    kind,
    x,
    y,
    vx: kind === "saw" ? Math.cos(angle) * sawSpeed : 0,
    vy: kind === "saw" ? Math.sin(angle) * sawSpeed : 0,
    radius,
    hp,
    maxHp: hp,
    hurtFlash: 0,
    attackTimer:
      kind === "balloon"
        ? 1.1 + Math.random() * 0.6
        : kind === "washer"
          ? 1.35
          : kind === "dragon"
            ? 0.85
            : kind === "trex"
              ? 0.85
              : 0,
    phase: 0,
    angle: kind === "dragon" ? -Math.PI / 2 : angle,
    boss: isBossKind(kind),
  };
}

function beginWave(state: RocketState, events: GameEvent[]) {
  state.wave += 1;
  state.spawnLeft = buildWave(state.wave);
  state.spawnTimer = 0.28;
  const boss = state.spawnLeft.find((kind) => isBossKind(kind));
  if (boss && isBossKind(boss)) {
    state.banner = BOSS_LABEL[boss];
    events.push({ type: "boss" });
  } else {
    state.banner = `WAVE ${state.wave}`;
    events.push({ type: "wave" });
  }
  state.bannerLeft = 1.65;
}

export function createInitialState(width: number, height: number): RocketState {
  return {
    playerX: width / 2,
    playerY: height / 2,
    facing: 0,
    hearts: MAX_HEARTS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    comboLeft: 0,
    wave: 0,
    banner: "",
    bannerLeft: 0,
    intermission: 0.4,
    spawnLeft: [],
    spawnTimer: 0,
    enemies: [],
    fists: [],
    hazards: [],
    pickups: [],
    floaters: [],
    particles: [],
    punchCd: 0,
    dashCd: 0,
    dashLeft: 0,
    dashVx: 0,
    dashVy: 0,
    invuln: 0.7,
    tripleLeft: 0,
    shieldLeft: 0,
    slowLeft: 0,
    shake: 0,
    hurtFlash: 0,
    gameOver: false,
    elapsed: 0,
    kills: 0,
  };
}

function addFloater(
  state: RocketState,
  x: number,
  y: number,
  text: string,
  big: boolean
) {
  state.floaters.push({
    id: nextId(),
    text,
    x,
    y,
    life: big ? 0.85 : 0.6,
    maxLife: big ? 0.85 : 0.6,
    big,
  });
  if (state.floaters.length > 14) {
    state.floaters.splice(0, state.floaters.length - 14);
  }
}

function burst(
  state: RocketState,
  x: number,
  y: number,
  count: number,
  color: string,
  speed = 220
) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 30 + Math.random() * speed;
    const life = 0.28 + Math.random() * 0.28;
    state.particles.push({
      id: nextId(),
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life,
      maxLife: life,
      color,
      radius: 2 + Math.random() * 3.2,
    });
  }
  if (state.particles.length > 220) {
    state.particles.splice(0, state.particles.length - 220);
  }
}

function dropLoot(state: RocketState, enemy: Enemy) {
  const rolls = enemy.boss ? 2 : Math.random() < 0.4 ? 1 : 0;
  const kinds: PickupKind[] = ["triple", "shield", "slow", "pizza"];
  for (let i = 0; i < rolls; i += 1) {
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    state.pickups.push({
      id: nextId(),
      kind,
      x: enemy.x + (i - (rolls - 1) / 2) * 36,
      y: enemy.y,
      life: 10,
      radius: 16,
    });
  }
  if (state.pickups.length > 8) {
    state.pickups.splice(0, state.pickups.length - 8);
  }
}

function damageEnemy(state: RocketState, enemy: Enemy, amount: number) {
  if (enemy.hp <= 0 || enemy.hurtFlash > 0) return;
  enemy.hp -= amount;
  enemy.hurtFlash = HIT_LOCK;
  state.shake = Math.max(state.shake, enemy.boss ? 8 : 5);

  if (enemy.hp > 0) return;

  state.combo += 1;
  state.comboLeft = COMBO_WINDOW;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  const points = SCORE[enemy.kind] * state.combo;
  state.score += points;
  state.kills += 1;
  state.shake = Math.max(state.shake, enemy.boss ? 18 : 8);
  burst(state, enemy.x, enemy.y, enemy.boss ? 30 : 12, colorFor(enemy.kind), enemy.boss ? 340 : 220);
  if (state.combo >= 2) {
    addFloater(state, enemy.x, enemy.y - enemy.radius - 8, `COMBO x${state.combo}`, true);
  }
  addFloater(state, enemy.x, enemy.y + 8, `+${points}`, false);
  dropLoot(state, enemy);
}

function tryHurtPlayer(state: RocketState, events: GameEvent[]) {
  if (state.gameOver || state.invuln > 0 || state.dashLeft > 0) return;

  if (state.shieldLeft > 0) {
    state.shieldLeft = Math.max(0, state.shieldLeft - 2.3);
    state.invuln = 0.32;
    state.shake = Math.max(state.shake, 7);
    events.push({ type: "block" });
    return;
  }

  state.hearts -= 1;
  state.combo = 0;
  state.comboLeft = 0;
  state.invuln = HURT_INVULN;
  state.hurtFlash = 0.32;
  state.shake = 18;
  events.push({ type: "hurt" });

  if (state.hearts <= 0) {
    state.hearts = 0;
    state.gameOver = true;
    events.push({ type: "gameover" });
  }
}

function fireFist(state: RocketState, angle: number) {
  state.fists.push({
    id: nextId(),
    x: state.playerX + Math.cos(angle) * (PLAYER_RADIUS + 10),
    y: state.playerY + Math.sin(angle) * (PLAYER_RADIUS + 10),
    vx: Math.cos(angle) * FIST_SPEED,
    vy: Math.sin(angle) * FIST_SPEED,
    radius: FIST_RADIUS,
    life: FIST_LIFE,
  });
}

function pushFire(
  state: RocketState,
  x: number,
  y: number,
  angle: number,
  speed: number
) {
  state.hazards.push({
    id: nextId(),
    kind: "fire",
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 11,
    life: 2.5,
    fuse: 0,
  });
}

function dropBomb(state: RocketState, x: number, y: number) {
  state.hazards.push({
    id: nextId(),
    kind: "bomb",
    x,
    y,
    vx: 0,
    vy: 36,
    radius: 13,
    life: 2,
    fuse: 1.15,
  });
}

function detonate(state: RocketState, bomb: Hazard, events: GameEvent[]) {
  const blast = 64;
  burst(state, bomb.x, bomb.y, 18, "#fb923c", 280);
  state.shake = Math.max(state.shake, 12);
  events.push({ type: "explode", big: true });

  for (const enemy of state.enemies) {
    if (dist(enemy.x, enemy.y, bomb.x, bomb.y) < blast + enemy.radius * 0.25) {
      damageEnemy(state, enemy, 1);
    }
  }

  if (dist(state.playerX, state.playerY, bomb.x, bomb.y) < blast + PLAYER_RADIUS * 0.35) {
    tryHurtPlayer(state, events);
  }
}

function splash(state: RocketState, x: number, y: number) {
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.hurtFlash > 0) continue;
    if (dist(enemy.x, enemy.y, x, y) < SPLASH_RADIUS + enemy.radius * 0.2) {
      damageEnemy(state, enemy, 1);
    }
  }
}

function chase(enemy: Enemy, px: number, py: number, speed: number, dt: number) {
  const dx = px - enemy.x;
  const dy = py - enemy.y;
  const magnitude = Math.hypot(dx, dy) || 1;
  enemy.angle = Math.atan2(dy, dx);
  enemy.vx = (dx / magnitude) * speed;
  enemy.vy = (dy / magnitude) * speed;
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
}

function clampEnemy(enemy: Enemy, box: Arena) {
  enemy.x = clamp(enemy.x, box.left + enemy.radius, box.right - enemy.radius);
  enemy.y = clamp(enemy.y, box.top + enemy.radius, box.bottom - enemy.radius);
}

function separateMinions(enemies: Enemy[]) {
  for (let i = 0; i < enemies.length; i += 1) {
    const a = enemies[i];
    if (a.boss || a.kind === "saw" || a.hp <= 0) continue;
    for (let j = i + 1; j < enemies.length; j += 1) {
      const b = enemies[j];
      if (b.boss || b.kind === "saw" || b.hp <= 0) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const magnitude = Math.hypot(dx, dy) || 0.001;
      const min = a.radius + b.radius - 4;
      if (magnitude >= min) continue;
      const push = (min - magnitude) / 2;
      const nx = dx / magnitude;
      const ny = dy / magnitude;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
    }
  }
}

function moveEnemies(
  state: RocketState,
  enemyDt: number,
  width: number,
  height: number
) {
  const box = arena(width, height);

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;

    if (enemy.kind === "chomp") {
      const speed = 150 + state.wave * 9;
      chase(enemy, state.playerX, state.playerY, speed, enemyDt);
      clampEnemy(enemy, box);
      continue;
    }

    if (enemy.kind === "balloon") {
      enemy.angle += enemyDt * 0.8;
      const speed = 48 + state.wave * 3;
      const dx = state.playerX - enemy.x;
      const dy = state.playerY - enemy.y;
      const magnitude = Math.hypot(dx, dy) || 1;
      const mixX = Math.cos(enemy.angle) * 0.4 + (dx / magnitude) * 0.6;
      const mixY = Math.sin(enemy.angle) * 0.4 + (dy / magnitude) * 0.6;
      const mix = Math.hypot(mixX, mixY) || 1;
      enemy.x += (mixX / mix) * speed * enemyDt;
      enemy.y += (mixY / mix) * speed * enemyDt;
      enemy.attackTimer -= enemyDt;
      if (enemy.attackTimer <= 0) {
        dropBomb(state, enemy.x, enemy.y + 8);
        enemy.attackTimer = Math.max(1.25, 2.35 - state.wave * 0.05);
      }
      clampEnemy(enemy, box);
      continue;
    }

    if (enemy.kind === "saw") {
      enemy.x += enemy.vx * enemyDt;
      enemy.y += enemy.vy * enemyDt;
      enemy.angle += enemyDt * 9;
      if (enemy.x < box.left + enemy.radius) {
        enemy.x = box.left + enemy.radius;
        enemy.vx = Math.abs(enemy.vx);
      } else if (enemy.x > box.right - enemy.radius) {
        enemy.x = box.right - enemy.radius;
        enemy.vx = -Math.abs(enemy.vx);
      }
      if (enemy.y < box.top + enemy.radius) {
        enemy.y = box.top + enemy.radius;
        enemy.vy = Math.abs(enemy.vy);
      } else if (enemy.y > box.bottom - enemy.radius) {
        enemy.y = box.bottom - enemy.radius;
        enemy.vy = -Math.abs(enemy.vy);
      }
      continue;
    }

    if (enemy.kind === "washer") {
      chase(enemy, state.playerX, state.playerY, 62 + state.wave, enemyDt);
      clampEnemy(enemy, box);
      enemy.attackTimer -= enemyDt;
      if (enemy.attackTimer <= 0) {
        for (let i = 0; i < 8; i += 1) {
          pushFire(state, enemy.x, enemy.y, (Math.PI * 2 * i) / 8, 230);
        }
        enemy.attackTimer = 2.55;
      }
      continue;
    }

    if (enemy.kind === "dragon") {
      enemy.angle += enemyDt * (0.85 + state.wave * 0.02);
      const orbit = Math.min(box.right - box.left, box.bottom - box.top) * 0.3;
      const cx = (box.left + box.right) / 2;
      const cy = (box.top + box.bottom) / 2;
      enemy.x = cx + Math.cos(enemy.angle) * orbit;
      enemy.y = cy + Math.sin(enemy.angle) * orbit * 0.7;
      enemy.attackTimer -= enemyDt;
      if (enemy.attackTimer <= 0) {
        const aim = Math.atan2(state.playerY - enemy.y, state.playerX - enemy.x);
        pushFire(state, enemy.x, enemy.y, aim, 280 + state.wave * 4);
        enemy.attackTimer = Math.max(0.7, 1.15 - state.wave * 0.02);
      }
      continue;
    }

    enemy.attackTimer -= enemyDt;
    if (enemy.phase === 0) {
      enemy.angle = Math.atan2(state.playerY - enemy.y, state.playerX - enemy.x);
      enemy.vx = 0;
      enemy.vy = 0;
      if (enemy.attackTimer <= 0) {
        enemy.phase = 1;
        enemy.attackTimer = 0.46;
        const speed = 430 + state.wave * 10;
        enemy.vx = Math.cos(enemy.angle) * speed;
        enemy.vy = Math.sin(enemy.angle) * speed;
      }
    } else {
      enemy.x += enemy.vx * enemyDt;
      enemy.y += enemy.vy * enemyDt;
      clampEnemy(enemy, box);
      if (enemy.attackTimer <= 0) {
        enemy.phase = 0;
        enemy.attackTimer = 0.95;
      }
    }
  }

  separateMinions(state.enemies);
}

function movePlayer(state: RocketState, input: FrameInput, dt: number, events: GameEvent[]) {
  const box = arena(input.width, input.height);
  const aimDx = input.aimX - state.playerX;
  const aimDy = input.aimY - state.playerY;
  if (Math.hypot(aimDx, aimDy) > 6) {
    state.facing = Math.atan2(aimDy, aimDx);
  }

  if (input.dash && state.dashCd <= 0 && state.dashLeft <= 0) {
    let dx = input.moveX;
    let dy = input.moveY;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < 0.2) {
      dx = Math.cos(state.facing);
      dy = Math.sin(state.facing);
    } else {
      dx /= magnitude;
      dy /= magnitude;
    }
    state.dashVx = dx * DASH_SPEED;
    state.dashVy = dy * DASH_SPEED;
    state.dashLeft = DASH_TIME;
    state.dashCd = DASH_COOLDOWN;
    events.push({ type: "dash" });
  }

  if (state.dashLeft > 0) {
    state.playerX += state.dashVx * dt;
    state.playerY += state.dashVy * dt;
    state.particles.push({
      id: nextId(),
      x: state.playerX,
      y: state.playerY,
      vx: 0,
      vy: 0,
      life: 0.18,
      maxLife: 0.18,
      color: "#67e8f9",
      radius: 10,
    });
  } else {
    const magnitude = Math.hypot(input.moveX, input.moveY);
    if (magnitude > 0) {
      state.playerX += (input.moveX / magnitude) * PLAYER_SPEED * dt;
      state.playerY += (input.moveY / magnitude) * PLAYER_SPEED * dt;
    }
  }

  state.playerX = clamp(
    state.playerX,
    box.left + PLAYER_RADIUS,
    box.right - PLAYER_RADIUS
  );
  state.playerY = clamp(
    state.playerY,
    box.top + PLAYER_RADIUS,
    box.bottom - PLAYER_RADIUS
  );

  if (input.punch && state.punchCd <= 0) {
    const triple = state.tripleLeft > 0;
    state.punchCd = triple ? TRIPLE_PUNCH_COOLDOWN : PUNCH_COOLDOWN;
    const offsets = triple ? [-0.26, 0, 0.26] : [0];
    for (const offset of offsets) fireFist(state, state.facing + offset);
    events.push({ type: "punch" });
    burst(state, state.playerX, state.playerY, 4, "#fdba74", 80);
  }
}

function moveFists(
  state: RocketState,
  dt: number,
  width: number,
  height: number,
  events: GameEvent[]
) {
  for (const fist of state.fists) {
    if (fist.life <= 0) continue;
    fist.life -= dt;
    fist.x += fist.vx * dt;
    fist.y += fist.vy * dt;
    if (
      fist.life <= 0 ||
      fist.x < -30 ||
      fist.y < -30 ||
      fist.x > width + 30 ||
      fist.y > height + 30
    ) {
      fist.life = 0;
      continue;
    }

    let consumed = false;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || enemy.hurtFlash > 0) continue;
      if (dist(fist.x, fist.y, enemy.x, enemy.y) < fist.radius + enemy.radius * 0.82) {
        damageEnemy(state, enemy, 1);
        splash(state, fist.x, fist.y);
        burst(state, fist.x, fist.y, 10, "#fb923c", 200);
        events.push({ type: "explode", big: enemy.boss });
        consumed = true;
        break;
      }
    }

    if (consumed) {
      fist.life = 0;
      continue;
    }

    for (const hazard of state.hazards) {
      if (hazard.life <= 0) continue;
      if (dist(fist.x, fist.y, hazard.x, hazard.y) >= fist.radius + hazard.radius) {
        continue;
      }
      fist.life = 0;
      if (hazard.kind === "bomb") {
        hazard.life = 0;
        hazard.fuse = 0;
        detonate(state, hazard, events);
      } else {
        hazard.life = 0;
        burst(state, hazard.x, hazard.y, 6, "#fdba74", 140);
        events.push({ type: "explode", big: false });
      }
      break;
    }
  }

  state.fists = state.fists.filter((fist) => fist.life > 0);
}

function moveHazards(
  state: RocketState,
  enemyDt: number,
  width: number,
  height: number,
  events: GameEvent[]
) {
  if (state.hazards.length > 48) {
    state.hazards.splice(0, state.hazards.length - 48);
  }

  for (const hazard of state.hazards) {
    if (hazard.life <= 0) continue;

    if (hazard.kind === "bomb") {
      hazard.fuse -= enemyDt;
      hazard.y += hazard.vy * enemyDt;
      if (hazard.fuse <= 0) {
        hazard.life = 0;
        detonate(state, hazard, events);
      }
      continue;
    }

    hazard.life -= enemyDt;
    hazard.x += hazard.vx * enemyDt;
    hazard.y += hazard.vy * enemyDt;
    if (
      hazard.x < -40 ||
      hazard.y < -40 ||
      hazard.x > width + 40 ||
      hazard.y > height + 40
    ) {
      hazard.life = 0;
      continue;
    }
    if (
      dist(hazard.x, hazard.y, state.playerX, state.playerY) <
      hazard.radius + PLAYER_RADIUS * 0.72
    ) {
      tryHurtPlayer(state, events);
      hazard.life = 0;
      burst(state, hazard.x, hazard.y, 6, "#fb923c", 120);
    }
  }

  state.hazards = state.hazards.filter((hazard) => hazard.life > 0);
}

function touchEnemies(state: RocketState, events: GameEvent[]) {
  if (state.gameOver) return;

  if (state.dashLeft > 0) {
    let smacked = false;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || enemy.hurtFlash > 0) continue;
      if (
        dist(enemy.x, enemy.y, state.playerX, state.playerY) <
        (enemy.radius + PLAYER_RADIUS) * 0.88
      ) {
        damageEnemy(state, enemy, 1);
        const dx = enemy.x - state.playerX;
        const dy = enemy.y - state.playerY;
        const magnitude = Math.hypot(dx, dy) || 1;
        enemy.x += (dx / magnitude) * (enemy.boss ? 8 : 20);
        enemy.y += (dy / magnitude) * (enemy.boss ? 8 : 20);
        smacked = true;
      }
    }
    if (smacked) events.push({ type: "explode", big: false });
    return;
  }

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const reach = enemy.boss ? 0.7 : 0.8;
    if (
      dist(enemy.x, enemy.y, state.playerX, state.playerY) <
      (enemy.radius + PLAYER_RADIUS) * reach
    ) {
      tryHurtPlayer(state, events);
      break;
    }
  }
}

function collectPickups(state: RocketState, dt: number, events: GameEvent[]) {
  for (const pickup of state.pickups) {
    if (
      dist(pickup.x, pickup.y, state.playerX, state.playerY) <
      PLAYER_RADIUS + pickup.radius
    ) {
      pickup.life = 0;
      if (pickup.kind === "triple") state.tripleLeft = 8;
      if (pickup.kind === "shield") state.shieldLeft = 6.5;
      if (pickup.kind === "slow") state.slowLeft = 5;
      if (pickup.kind === "pizza") {
        if (state.hearts < MAX_HEARTS) {
          state.hearts += 1;
          addFloater(state, pickup.x, pickup.y - 18, "HEAL", true);
        } else {
          state.score += 250;
          addFloater(state, pickup.x, pickup.y - 18, "+250", true);
        }
      }
      events.push({ type: "pickup", kind: pickup.kind });
      burst(state, pickup.x, pickup.y, 8, "#fde68a", 140);
      continue;
    }
    pickup.life -= dt;
  }
  state.pickups = state.pickups.filter((pickup) => pickup.life > 0);
}

function fadeFx(state: RocketState, dt: number) {
  for (const floater of state.floaters) {
    floater.life -= dt;
    floater.y -= 42 * dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0);

  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 30 * dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
  if (state.particles.length > 220) {
    state.particles.splice(0, state.particles.length - 220);
  }
}

export function tick(
  state: RocketState,
  dt: number,
  input: FrameInput
): GameEvent[] {
  if (state.gameOver) return [];

  const step = clamp(dt, 0, 0.033);
  const events: GameEvent[] = [];
  state.elapsed += step;

  state.punchCd = Math.max(0, state.punchCd - step);
  state.dashCd = Math.max(0, state.dashCd - step);
  state.dashLeft = Math.max(0, state.dashLeft - step);
  state.invuln = Math.max(0, state.invuln - step);
  state.tripleLeft = Math.max(0, state.tripleLeft - step);
  state.shieldLeft = Math.max(0, state.shieldLeft - step);
  state.slowLeft = Math.max(0, state.slowLeft - step);
  state.bannerLeft = Math.max(0, state.bannerLeft - step);
  state.hurtFlash = Math.max(0, state.hurtFlash - step);
  state.shake = Math.max(0, state.shake - step * 32);

  if (state.combo > 0) {
    state.comboLeft -= step;
    if (state.comboLeft <= 0) {
      state.combo = 0;
      state.comboLeft = 0;
    }
  }

  for (const enemy of state.enemies) {
    enemy.hurtFlash = Math.max(0, enemy.hurtFlash - step);
  }

  movePlayer(state, input, step, events);

  if (state.intermission > 0) {
    state.intermission -= step;
    if (state.intermission <= 0) {
      state.intermission = 0;
      beginWave(state, events);
    }
  } else if (state.spawnLeft.length > 0 && state.enemies.length < ENEMY_CAP) {
    state.spawnTimer -= step;
    if (state.spawnTimer <= 0) {
      const kind = state.spawnLeft.shift();
      if (kind) {
        state.enemies.push(
          makeEnemy(
            kind,
            state.wave,
            input.width,
            input.height,
            state.playerX,
            state.playerY
          )
        );
      }
      state.spawnTimer = Math.max(0.24, 0.52 - state.wave * 0.018);
    }
  }

  const enemyDt = step * (state.slowLeft > 0 ? SLOW_SCALE : 1);
  moveEnemies(state, enemyDt, input.width, input.height);
  moveFists(state, step, input.width, input.height, events);
  moveHazards(state, enemyDt, input.width, input.height, events);
  touchEnemies(state, events);
  if (!state.gameOver) collectPickups(state, step, events);

  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);

  if (
    !state.gameOver &&
    state.wave > 0 &&
    state.intermission <= 0 &&
    state.spawnLeft.length === 0 &&
    state.enemies.length === 0
  ) {
    state.intermission = 1.15;
    state.banner = "CLEAR";
    state.bannerLeft = 0.85;
  }

  fadeFx(state, step);
  return events;
}

export function loadBest(): BestRecord {
  if (typeof window === "undefined") return { score: 0, combo: 0 };

  try {
    const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    if (!raw) return { score: 0, combo: 0 };
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as Partial<BestRecord>;
      return {
        score: Number.isFinite(parsed.score) ? Number(parsed.score) : 0,
        combo: Number.isFinite(parsed.combo) ? Number(parsed.combo) : 0,
      };
    }
    const score = Number.parseInt(raw, 10);
    return { score: Number.isFinite(score) ? score : 0, combo: 0 };
  } catch {
    return { score: 0, combo: 0 };
  }
}

export function saveBest(
  score: number,
  combo: number
): { best: BestRecord; isNewScore: boolean } {
  const current = loadBest();
  const isNewScore = score > current.score && score > 0;
  const best: BestRecord = {
    score: Math.max(current.score, score),
    combo: Math.max(current.combo, combo),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(best));
  }

  return { best, isNewScore };
}
