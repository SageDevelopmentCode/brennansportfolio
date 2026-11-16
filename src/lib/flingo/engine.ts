export const BEST_KEY = "flingo-best-v1";
export const PLAYER_R = 22;
export const MAX_AIM = 160;
export const MAX_DASH = 2;

export type SoundEvent =
  | "fling"
  | "bounce"
  | "smash"
  | "combo"
  | "dash"
  | "star"
  | "hurt"
  | "land"
  | "boost"
  | "death"
  | "pop";

export type SmashKind = "donut" | "tv" | "duck" | "pinata" | "star" | "can" | "balloon";

export type Platform = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "normal" | "bounce" | "ice" | "crumble";
  life: number;
};

export type Smashable = {
  id: number;
  kind: SmashKind;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  hp: number;
  points: number;
};

export type Hazard = {
  id: number;
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  amp: number;
  baseX: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  text?: string;
};

export type Floater = {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
};

export type GameState = {
  w: number;
  h: number;
  t: number;
  seed: number;
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    grounded: boolean;
    squish: number;
    stretch: number;
    facing: number;
    invuln: number;
    dash: number;
    onPlat: number | null;
  };
  aiming: boolean;
  aimDx: number;
  aimDy: number;
  platforms: Platform[];
  smash: Smashable[];
  hazards: Hazard[];
  particles: Particle[];
  floaters: Floater[];
  camY: number;
  shake: number;
  slow: number;
  score: number;
  height: number;
  maxHeight: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  smashes: number;
  flings: number;
  stars: number;
  alive: boolean;
  banner: string;
  bannerT: number;
  nextId: number;
  genY: number;
  events: SoundEvent[];
  flash: number;
};

const GRAVITY = 1650;
const FLING_POWER = 8.6;
const AIR_DRAG = 0.18;
const GROUND_FRIC = 6;
const DASH_SPEED = 780;
const COMBO_WINDOW = 1.65;

const SMASH_DEFS: Record<
  SmashKind,
  { r: number; hp: number; points: number; color: string }
> = {
  donut: { r: 20, hp: 1, points: 80, color: "#f472b6" },
  tv: { r: 24, hp: 2, points: 140, color: "#38bdf8" },
  duck: { r: 18, hp: 1, points: 100, color: "#facc15" },
  pinata: { r: 28, hp: 3, points: 220, color: "#a78bfa" },
  star: { r: 14, hp: 1, points: 300, color: "#fde68a" },
  can: { r: 16, hp: 1, points: 60, color: "#94a3b8" },
  balloon: { r: 22, hp: 1, points: 110, color: "#fb7185" },
};

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function nextId(s: GameState) {
  return s.nextId++;
}

function burst(
  s: GameState,
  x: number,
  y: number,
  color: string,
  n: number,
  speed = 280,
) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const sp = speed * (0.4 + Math.random() * 0.8);
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.45,
      max: 0.8,
      color,
      size: 3 + Math.random() * 6,
    });
  }
}

function floater(s: GameState, x: number, y: number, text: string, color: string) {
  s.floaters.push({ x, y, vy: 70, life: 0.9, text, color });
}

function spawnPlatform(s: GameState, y: number, forced?: Partial<Platform>) {
  const r = rand(s.seed + y * 0.13 + s.platforms.length);
  const w = 90 + Math.floor(r * 140);
  const x = 40 + rand(s.seed + y * 0.27) * Math.max(40, s.w - w - 80);
  let kind: Platform["kind"] = "normal";
  const roll = rand(s.seed + y * 0.41);
  if (y > 400 && roll > 0.82) kind = "bounce";
  else if (y > 700 && roll > 0.7 && roll <= 0.82) kind = "ice";
  else if (y > 1100 && roll > 0.58 && roll <= 0.7) kind = "crumble";
  s.platforms.push({
    id: nextId(s),
    x: forced?.x ?? x,
    y,
    w: forced?.w ?? w,
    h: forced?.h ?? 18,
    kind: forced?.kind ?? kind,
    life: 1,
  });
}

function spawnSmashNear(s: GameState, y: number) {
  const kinds: SmashKind[] = ["donut", "tv", "duck", "pinata", "star", "can", "balloon"];
  const roll = rand(s.seed + y * 0.53 + s.smash.length);
  let kind = kinds[Math.floor(roll * kinds.length)]!;
  if (y < 350 && kind === "pinata") kind = "donut";
  if (roll > 0.92) kind = "star";
  const def = SMASH_DEFS[kind];
  const x = 50 + rand(s.seed + y * 0.71) * (s.w - 100);
  s.smash.push({
    id: nextId(s),
    kind,
    x,
    y: y + 40 + rand(s.seed + y) * 80,
    r: def.r,
    vx: (rand(s.seed + y * 1.1) - 0.5) * 40,
    vy: (rand(s.seed + y * 1.3) - 0.5) * 20,
    rot: 0,
    spin: (rand(s.seed + y * 1.7) - 0.5) * 3,
    hp: def.hp,
    points: def.points,
  });
}

function spawnHazard(s: GameState, y: number) {
  if (y < 600) return;
  if (rand(s.seed + y * 0.91) > 0.45) return;
  const x = 80 + rand(s.seed + y * 1.01) * (s.w - 160);
  s.hazards.push({
    id: nextId(s),
    x,
    y: y + 30,
    r: 16 + rand(s.seed + y * 1.11) * 10,
    phase: rand(s.seed + y) * Math.PI * 2,
    speed: 1.2 + rand(s.seed + y * 1.2) * 1.8,
    amp: 40 + rand(s.seed + y * 1.3) * 90,
    baseX: x,
  });
}

function generateUpTo(s: GameState, targetY: number) {
  while (s.genY < targetY + s.h * 1.8) {
    const gap = 95 + rand(s.seed + s.genY * 0.07) * (70 + Math.min(90, s.genY * 0.02));
    s.genY += gap;
    spawnPlatform(s, s.genY);
    if (rand(s.seed + s.genY * 0.19) > 0.35) spawnSmashNear(s, s.genY);
    if (rand(s.seed + s.genY * 0.23) > 0.55) spawnSmashNear(s, s.genY + 30);
    spawnHazard(s, s.genY);
  }
}

export function createState(w: number, h: number): GameState {
  const s: GameState = {
    w,
    h,
    t: 0,
    seed: Math.floor(Math.random() * 1e9),
    player: {
      x: w * 0.5,
      y: 120,
      vx: 0,
      vy: 0,
      grounded: true,
      squish: 1,
      stretch: 1,
      facing: 1,
      invuln: 0,
      dash: MAX_DASH,
      onPlat: null,
    },
    aiming: false,
    aimDx: 0,
    aimDy: 0,
    platforms: [],
    smash: [],
    hazards: [],
    particles: [],
    floaters: [],
    camY: 0,
    shake: 0,
    slow: 0,
    score: 0,
    height: 0,
    maxHeight: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    smashes: 0,
    flings: 0,
    stars: 0,
    alive: true,
    banner: "",
    bannerT: 0,
    nextId: 1,
    genY: 40,
    events: [],
    flash: 0,
  };

  const startId = nextId(s);
  s.platforms.push({
    id: startId,
    x: w * 0.5 - 90,
    y: 80,
    w: 180,
    h: 20,
    kind: "normal",
    life: 1,
  });
  s.player.onPlat = startId;
  s.player.y = 80 + 20 + PLAYER_R;
  s.genY = 80;
  generateUpTo(s, h * 2);
  s.banner = "FLING IT";
  s.bannerT = 1.4;
  return s;
}

export function resizeState(s: GameState, w: number, h: number) {
  const sx = w / Math.max(1, s.w);
  s.w = w;
  s.h = h;
  s.player.x *= sx;
  for (const p of s.platforms) {
    p.x *= sx;
  }
  for (const m of s.smash) m.x *= sx;
  for (const hz of s.hazards) {
    hz.x *= sx;
    hz.baseX *= sx;
  }
}

export function startAim(s: GameState, x: number, y: number) {
  if (!s.alive || !s.player.grounded) return;
  s.aiming = true;
  const worldY = screenToWorldY(s, y);
  s.aimDx = s.player.x - x;
  s.aimDy = s.player.y - worldY;
  clampAim(s);
}

export function updateAim(s: GameState, x: number, y: number) {
  if (!s.aiming) return;
  const worldY = screenToWorldY(s, y);
  s.aimDx = s.player.x - x;
  s.aimDy = s.player.y - worldY;
  clampAim(s);
}

function clampAim(s: GameState) {
  const len = Math.hypot(s.aimDx, s.aimDy);
  if (len > MAX_AIM) {
    s.aimDx = (s.aimDx / len) * MAX_AIM;
    s.aimDy = (s.aimDy / len) * MAX_AIM;
  }
  // Prefer launching upward-ish
  if (s.aimDy < 20) s.aimDy = 20;
}

export function releaseAim(s: GameState) {
  if (!s.aiming || !s.alive) {
    s.aiming = false;
    return;
  }
  const power = Math.hypot(s.aimDx, s.aimDy);
  if (power < 18) {
    s.aiming = false;
    return;
  }
  s.player.vx = s.aimDx * FLING_POWER;
  s.player.vy = s.aimDy * FLING_POWER;
  s.player.grounded = false;
  s.player.onPlat = null;
  s.player.stretch = 1.35;
  s.player.squish = 0.75;
  s.aiming = false;
  s.flings += 1;
  s.shake = Math.max(s.shake, 0.18);
  s.events.push("fling");
  burst(s, s.player.x, s.player.y, "#fde68a", 10, 220);
}

export function tryDash(s: GameState, screenX: number, screenY: number) {
  if (!s.alive || s.player.grounded || s.player.dash <= 0 || s.aiming) return;
  const worldY = screenToWorldY(s, screenY);
  let dx = screenX - s.player.x;
  let dy = worldY - s.player.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  s.player.vx = dx * DASH_SPEED;
  s.player.vy = dy * DASH_SPEED;
  s.player.dash -= 1;
  s.player.stretch = 1.45;
  s.player.squish = 0.7;
  s.shake = Math.max(s.shake, 0.22);
  s.events.push("dash");
  burst(s, s.player.x, s.player.y, "#67e8f9", 14, 360);
  floater(s, s.player.x, s.player.y + 30, "YEET!", "#67e8f9");
}

export function screenToWorldY(s: GameState, screenY: number) {
  // canvas y grows down; world y grows up; camera follows player
  const cam = s.camY;
  return cam + (s.h * 0.62 - screenY);
}

export function worldToScreenY(s: GameState, worldY: number) {
  return s.h * 0.62 - (worldY - s.camY);
}

function landOn(s: GameState, p: Platform, top: number) {
  const pl = s.player;
  pl.y = top + PLAYER_R;
  pl.grounded = true;
  pl.onPlat = p.id;
  pl.dash = MAX_DASH;
  pl.squish = 0.55;
  pl.stretch = 1.35;

  if (p.kind === "bounce") {
    pl.vy = Math.max(620, Math.abs(pl.vy) * 1.15 + 200);
    pl.grounded = false;
    pl.onPlat = null;
    s.events.push("boost");
    floater(s, pl.x, pl.y + 20, "BOING!", "#4ade80");
    burst(s, pl.x, top, "#86efac", 12, 300);
  } else if (p.kind === "ice") {
    pl.vx *= 1.15;
    pl.vy = 0;
    s.events.push("land");
  } else {
    pl.vy = 0;
    s.events.push("land");
  }

  if (p.kind === "crumble") {
    p.life -= 0.34;
    if (p.life <= 0) {
      burst(s, p.x + p.w * 0.5, p.y, "#d6d3d1", 16, 240);
      s.platforms = s.platforms.filter((x) => x.id !== p.id);
      pl.grounded = false;
      pl.onPlat = null;
      s.events.push("pop");
    }
  }

  s.combo = 0;
  s.comboTimer = 0;
}

function hitSmash(s: GameState, m: Smashable) {
  const pl = s.player;
  const speed = Math.hypot(pl.vx, pl.vy);
  const dmg = speed > 520 ? 2 : 1;
  m.hp -= dmg;
  const nx = m.x - pl.x;
  const ny = m.y - pl.y;
  const nlen = Math.hypot(nx, ny) || 1;
  pl.vx -= (nx / nlen) * 180;
  pl.vy -= (ny / nlen) * 140;
  m.vx += (nx / nlen) * 220;
  m.vy += (ny / nlen) * 180 + 80;
  s.shake = Math.max(s.shake, 0.25);
  s.events.push("smash");

  if (m.hp <= 0) {
    const mult = Math.max(1, s.combo);
    const pts = Math.floor(m.points * (1 + (mult - 1) * 0.55));
    s.score += pts;
    s.smashes += 1;
    s.combo += 1;
    s.comboTimer = COMBO_WINDOW;
    if (s.combo > s.bestCombo) s.bestCombo = s.combo;
    if (m.kind === "star") {
      s.stars += 1;
      s.events.push("star");
      s.slow = Math.max(s.slow, 0.18);
      s.flash = 0.12;
    }
    const colors: Record<SmashKind, string> = {
      donut: "#f9a8d4",
      tv: "#7dd3fc",
      duck: "#fde047",
      pinata: "#c4b5fd",
      star: "#fef08a",
      can: "#cbd5e1",
      balloon: "#fda4af",
    };
    burst(s, m.x, m.y, colors[m.kind], 18, 420);
    floater(s, m.x, m.y, `+${pts}`, colors[m.kind]);
    if (s.combo >= 3) {
      s.events.push("combo");
      floater(s, pl.x, pl.y + 40, `x${s.combo} COMBO`, "#fb923c");
      s.slow = Math.max(s.slow, 0.12);
    }
    if (m.kind === "pinata") {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2;
        s.particles.push({
          x: m.x,
          y: m.y,
          vx: Math.cos(a) * 200,
          vy: Math.sin(a) * 200 + 100,
          life: 0.7,
          max: 0.7,
          color: ["#f472b6", "#facc15", "#67e8f9", "#a78bfa"][i % 4]!,
          size: 5,
          text: ["🍬", "🍭", "✨", "🎉"][i % 4],
        });
      }
      s.score += 50 * mult;
    }
    s.smash = s.smash.filter((x) => x.id !== m.id);
  }
}

export function tick(s: GameState, dtRaw: number) {
  if (!s.alive) return;
  let dt = Math.min(0.033, dtRaw);
  if (s.slow > 0) {
    s.slow -= dtRaw;
    dt *= 0.35;
  }
  s.t += dt;
  s.events = [];
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 2.2);
  if (s.flash > 0) s.flash = Math.max(0, s.flash - dt);
  if (s.bannerT > 0) s.bannerT -= dt;
  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
  }

  const pl = s.player;
  pl.invuln = Math.max(0, pl.invuln - dt);
  pl.squish += (1 - pl.squish) * Math.min(1, dt * 10);
  pl.stretch += (1 - pl.stretch) * Math.min(1, dt * 10);

  if (!pl.grounded && !s.aiming) {
    pl.vy -= GRAVITY * dt;
    pl.vx *= 1 - AIR_DRAG * dt;
    pl.x += pl.vx * dt;
    pl.y += pl.vy * dt;
    if (pl.vx !== 0) pl.facing = pl.vx > 0 ? 1 : -1;
  } else if (pl.grounded && !s.aiming) {
    const plat = s.platforms.find((p) => p.id === pl.onPlat);
    if (plat?.kind === "ice") {
      pl.vx *= 1 - 0.4 * dt;
      pl.x += pl.vx * dt;
    } else {
      pl.vx *= 1 - GROUND_FRIC * dt;
      if (Math.abs(pl.vx) < 8) pl.vx = 0;
      pl.x += pl.vx * dt;
    }
    if (plat) {
      pl.y = plat.y + plat.h + PLAYER_R;
      if (pl.x < plat.x - 8 || pl.x > plat.x + plat.w + 8) {
        pl.grounded = false;
        pl.onPlat = null;
      }
    } else {
      pl.grounded = false;
    }
  }

  // Walls
  if (pl.x < PLAYER_R) {
    pl.x = PLAYER_R;
    pl.vx = Math.abs(pl.vx) * 0.55;
    s.events.push("bounce");
  }
  if (pl.x > s.w - PLAYER_R) {
    pl.x = s.w - PLAYER_R;
    pl.vx = -Math.abs(pl.vx) * 0.55;
    s.events.push("bounce");
  }

  // Platform collisions (falling onto tops)
  if (!pl.grounded && pl.vy < 0) {
    for (const p of s.platforms) {
      const top = p.y + p.h;
      const prevY = pl.y - pl.vy * dt;
      if (
        prevY - PLAYER_R >= top - 2 &&
        pl.y - PLAYER_R <= top + 6 &&
        pl.x > p.x - 4 &&
        pl.x < p.x + p.w + 4
      ) {
        landOn(s, p, top);
        break;
      }
    }
  }

  // Smashables
  for (const m of s.smash) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.rot += m.spin * dt;
    m.vy -= 20 * dt;
    if (m.x < m.r || m.x > s.w - m.r) {
      m.vx *= -1;
      m.x = Math.max(m.r, Math.min(s.w - m.r, m.x));
    }
    const dx = m.x - pl.x;
    const dy = m.y - pl.y;
    const rr = m.r + PLAYER_R;
    if (dx * dx + dy * dy < rr * rr && Math.hypot(pl.vx, pl.vy) > 120) {
      hitSmash(s, m);
    }
  }

  // Hazards
  for (const hz of s.hazards) {
    hz.phase += hz.speed * dt;
    hz.x = hz.baseX + Math.sin(hz.phase) * hz.amp;
    const dx = hz.x - pl.x;
    const dy = hz.y - pl.y;
    if (pl.invuln <= 0 && dx * dx + dy * dy < (hz.r + PLAYER_R * 0.85) ** 2) {
      pl.vx *= -0.4;
      pl.vy = Math.abs(pl.vy) * 0.3 + 200;
      pl.invuln = 1.1;
      pl.grounded = false;
      pl.onPlat = null;
      s.shake = 0.4;
      s.events.push("hurt");
      burst(s, pl.x, pl.y, "#fb7185", 16, 320);
      // Knock score a little but don't kill immediately
      s.combo = 0;
      floater(s, pl.x, pl.y, "OUCH", "#fb7185");
    }
  }

  // Height / score
  s.height = Math.max(0, pl.y - 120);
  if (s.height > s.maxHeight) {
    const gain = s.height - s.maxHeight;
    s.maxHeight = s.height;
    s.score += Math.floor(gain * 0.35);
  }

  // Camera
  const targetCam = pl.y - s.h * 0.28;
  s.camY += (targetCam - s.camY) * Math.min(1, dt * 5);

  // Death: fall too far below camera / best height
  if (pl.y < s.camY - s.h * 0.55 || pl.y < s.maxHeight - s.h * 1.35) {
    s.alive = false;
    s.events.push("death");
    s.banner = "WIPED OUT";
    s.bannerT = 2;
    burst(s, pl.x, pl.y, "#fda4af", 28, 480);
  }

  // Particles / floaters
  for (const p of s.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy -= 400 * dt;
  }
  s.particles = s.particles.filter((p) => p.life > 0);
  for (const f of s.floaters) {
    f.life -= dt;
    f.y += f.vy * dt;
  }
  s.floaters = s.floaters.filter((f) => f.life > 0);

  // Cull + generate
  const minY = s.camY - s.h;
  s.platforms = s.platforms.filter((p) => p.y > minY - 40);
  s.smash = s.smash.filter((m) => m.y > minY - 40);
  s.hazards = s.hazards.filter((h) => h.y > minY - 40);
  generateUpTo(s, s.camY + s.h * 1.5);

  // Milestone banners
  const milestones = [500, 1000, 2000, 3500, 5000, 8000];
  for (const m of milestones) {
    if (s.maxHeight >= m && s.maxHeight - s.player.vy * dt < m) {
      s.banner = m >= 5000 ? "ABSOLUTELY UNHINGED" : m >= 2000 ? "SEND IT" : "NICE FLING";
      s.bannerT = 1.2;
      s.events.push("combo");
    }
  }
}

export type BestRecord = {
  score: number;
  height: number;
  combo: number;
  smashes: number;
};

export function loadBest(): BestRecord {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { score: 0, height: 0, combo: 0, smashes: 0 };
    const p = JSON.parse(raw) as BestRecord;
    return {
      score: p.score || 0,
      height: p.height || 0,
      combo: p.combo || 0,
      smashes: p.smashes || 0,
    };
  } catch {
    return { score: 0, height: 0, combo: 0, smashes: 0 };
  }
}

export function saveBest(rec: BestRecord) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(rec));
  } catch {}
}

export function smashColor(kind: SmashKind) {
  return SMASH_DEFS[kind].color;
}
