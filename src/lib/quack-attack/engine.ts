export type SoundEvent =
  | "shoot"
  | "hit"
  | "kill"
  | "gem"
  | "levelup"
  | "hurt"
  | "boom"
  | "zap"
  | "laser"
  | "quack"
  | "boss"
  | "bossdown"
  | "chest"
  | "pickup"
  | "swarm"
  | "death"
  | "squeak"
  | "throw"
  | "nope";

export const WEAPON_IDS = [
  "bread",
  "chicken",
  "zap",
  "bomb",
  "laser",
  "aura",
  "flipflop",
] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];

export const PASSIVE_IDS = [
  "fins",
  "sauce",
  "coffee",
  "bigbread",
  "feathers",
  "magnet",
  "socks",
  "bath",
] as const;
export type PassiveId = (typeof PASSIVE_IDS)[number];

export const MAX_LEVEL = 5;
export const METER_MAX = 100;

export const WEAPON_DEFS: Record<
  WeaponId,
  { name: string; emoji: string; blurb: string; levels: string[] }
> = {
  bread: {
    name: "Bread Blaster",
    emoji: "🍞",
    blurb: "Yeets toast at the closest goober.",
    levels: [
      "Fires toast",
      "Faster toasting",
      "2 toasts + they go through blobs",
      "Even faster toasting",
      "3 TOASTS. Maximum carbs.",
    ],
  },
  chicken: {
    name: "Rubber Chickens",
    emoji: "🐔",
    blurb: "They spin around you and SQUEAK.",
    levels: [
      "2 spinning chickens",
      "3 chickens",
      "Bigger, meaner chickens",
      "4 chickens",
      "6 CHICKENS. Chicken hurricane.",
    ],
  },
  zap: {
    name: "Thunder Quack",
    emoji: "⚡",
    blurb: "Lightning that bounces blob to blob.",
    levels: [
      "Zaps 3 blobs in a chain",
      "Zaps 4 blobs",
      "Zaps 5, more often",
      "Zaps 6, even more often",
      "Zaps 8. Weather report: OUCH.",
    ],
  },
  bomb: {
    name: "Bath Bombs",
    emoji: "💣",
    blurb: "Lobs fizzy bombs. Very explode-y.",
    levels: [
      "1 bomb",
      "Bigger boom",
      "2 bombs at once",
      "Even bigger boom",
      "3 bombs. Bath time is over.",
    ],
  },
  laser: {
    name: "Laser Eyes",
    emoji: "👀",
    blurb: "Sunglasses off. Lasers on.",
    levels: [
      "1 laser beam",
      "Stronger beam",
      "2 beams (front AND back)",
      "Thicker beams",
      "4 BEAMS. You are a disco ball of doom.",
    ],
  },
  aura: {
    name: "Stinky Bubble",
    emoji: "🫧",
    blurb: "A bubble of stink. Blobs hate it.",
    levels: [
      "Small stink bubble",
      "Bigger stink",
      "Stinkier stink",
      "Huge stink",
      "LEGENDARY STINK",
    ],
  },
  flipflop: {
    name: "Boomerang Flip-Flop",
    emoji: "🩴",
    blurb: "THWACK! And it comes back!",
    levels: [
      "1 flip-flop",
      "2 flip-flops",
      "Harder thwacks",
      "3 flip-flops",
      "4 flip-flops. Sandal storm.",
    ],
  },
};

export const PASSIVE_DEFS: Record<
  PassiveId,
  { name: string; emoji: string; blurb: string }
> = {
  fins: { name: "Zoomies", emoji: "💨", blurb: "+12% move speed. Nyoom." },
  sauce: { name: "Hot Sauce", emoji: "🌶️", blurb: "+15% damage. Spicy." },
  coffee: { name: "Triple Espresso", emoji: "☕", blurb: "Weapons fire 10% faster." },
  bigbread: { name: "Supersize", emoji: "🍔", blurb: "+20% weapon size." },
  feathers: { name: "Extra Fluff", emoji: "🪶", blurb: "+25 max HP and a full heal." },
  magnet: { name: "Magnet Beak", emoji: "🧲", blurb: "Grab gems from way farther away." },
  socks: { name: "Lucky Socks", emoji: "🧦", blurb: "+8% chance for double-damage crits." },
  bath: { name: "Bubble Bath", emoji: "🛁", blurb: "Heal 1 HP every second." },
};

export type Choice =
  | { kind: "weapon"; id: WeaponId; level: number }
  | { kind: "passive"; id: PassiveId; level: number }
  | { kind: "snack" }
  | { kind: "gold" };

export type EnemyKind =
  | "blob"
  | "mini"
  | "bat"
  | "brute"
  | "splitter"
  | "spitter"
  | "boss";

export type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  kx: number;
  ky: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  xp: number;
  flash: number;
  seed: number;
  dead: boolean;
  chickenCd: number;
  attackCd: number;
  mode: "walk" | "windup" | "charge";
  modeTimer: number;
  dx: number;
  dy: number;
};

export type Proj = {
  kind: "bread" | "flipflop" | "spit";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  pierce: number;
  ttl: number;
  spin: number;
  hit: Set<number>;
  returning: boolean;
  hostile: boolean;
  dead: boolean;
};

export type Bomb = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  dmg: number;
  radius: number;
};

export type Gem = { x: number; y: number; value: number; speed: number; pulled: boolean };
export type PickupKind = "pizza" | "magnet" | "nuke" | "chest";
export type Pickup = { kind: PickupKind; x: number; y: number; age: number };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  ttl: number;
  max: number;
};
export type FloatText = {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  ttl: number;
  max: number;
};
export type Beam = { angle: number; len: number; width: number; ttl: number; max: number };
export type Bolt = { pts: { x: number; y: number }[]; ttl: number; max: number };
export type Ring = {
  x: number;
  y: number;
  r0: number;
  r1: number;
  ttl: number;
  max: number;
  color: string;
  width: number;
};
export type Banner = { text: string; sub: string; color: string; ttl: number; max: number };

export type Stats = {
  dmgMul: number;
  cdMul: number;
  areaMul: number;
  speed: number;
  magnet: number;
  crit: number;
  regen: number;
  maxHp: number;
  auraR: number;
  chickenR: number;
};

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  invuln: number;
  face: 1 | -1;
  aim: number;
  moving: boolean;
};

export type GameState = {
  t: number;
  demo: boolean;
  player: Player;
  cam: { x: number; y: number };
  shake: number;
  viewW: number;
  viewH: number;
  weapons: Partial<Record<WeaponId, number>>;
  weaponCd: Record<WeaponId, number>;
  passives: Record<PassiveId, number>;
  stats: Stats;
  enemies: Enemy[];
  projs: Proj[];
  bombs: Bomb[];
  gems: Gem[];
  pickups: Pickup[];
  particles: Particle[];
  texts: FloatText[];
  beams: Beam[];
  bolts: Bolt[];
  rings: Ring[];
  banner: Banner | null;
  chickenAngle: number;
  auraTick: number;
  level: number;
  xp: number;
  xpNeed: number;
  pendingLevelUps: number;
  kills: number;
  score: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  meter: number;
  spawnAcc: number;
  nextSwarmAt: number;
  swarmCount: number;
  nextBossAt: number;
  bossCount: number;
  bossName: string;
  events: SoundEvent[];
  dying: number;
  over: boolean;
  nextId: number;
  grid: Map<number, Enemy[]>;
};

export type MoveInput = { x: number; y: number };

const BREAD = {
  cd: [0.62, 0.52, 0.46, 0.4, 0.32],
  count: [1, 1, 2, 2, 3],
  pierce: [1, 1, 2, 2, 3],
  dmg: [10, 12, 14, 16, 20],
};
const CHICKEN = { count: [2, 3, 3, 4, 6], dmg: [8, 10, 14, 16, 20] };
const ZAP = {
  cd: [1.6, 1.4, 1.2, 1.0, 0.8],
  chain: [3, 4, 5, 6, 8],
  dmg: [16, 20, 24, 28, 34],
};
const BOMB = {
  cd: [2.4, 2.1, 1.8, 1.6, 1.3],
  count: [1, 1, 2, 2, 3],
  dmg: [30, 38, 46, 54, 66],
  radius: [70, 80, 88, 96, 112],
};
const LASER = {
  cd: [2.6, 2.3, 2.0, 1.8, 1.5],
  beams: [1, 1, 2, 2, 4],
  dmg: [26, 34, 42, 50, 62],
  width: [14, 16, 18, 22, 26],
};
const AURA = { dmg: [5, 7, 9, 11, 14], radius: [70, 85, 100, 118, 140] };
const FLIP = {
  cd: [1.8, 1.6, 1.4, 1.2, 1.0],
  count: [1, 2, 2, 3, 4],
  dmg: [16, 20, 25, 30, 36],
};

const ENEMY_BASE: Record<
  EnemyKind,
  { hp: number; speed: number; r: number; dmg: number; xp: number }
> = {
  blob: { hp: 12, speed: 75, r: 15, dmg: 8, xp: 1 },
  mini: { hp: 5, speed: 110, r: 9, dmg: 5, xp: 1 },
  bat: { hp: 7, speed: 150, r: 11, dmg: 6, xp: 1 },
  brute: { hp: 70, speed: 52, r: 28, dmg: 18, xp: 6 },
  splitter: { hp: 30, speed: 70, r: 19, dmg: 10, xp: 3 },
  spitter: { hp: 22, speed: 85, r: 16, dmg: 8, xp: 3 },
  boss: { hp: 2600, speed: 72, r: 64, dmg: 22, xp: 10 },
};

const BOSS_NAMES = ["KING GLORP", "KING GLORP II", "EMPEROR GLORP", "GLORP THE ETERNAL"];

const CELL = 72;
const MAX_ENEMY_R = 64;
const MAX_PARTICLES = 700;
const MAX_TEXTS = 110;
const MAX_GEMS = 350;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

function cellKey(cx: number, cy: number) {
  return ((cx & 0xffff) << 16) | (cy & 0xffff);
}

export function xpNeedFor(level: number) {
  return Math.floor(3 + (level - 1) * 3 + Math.pow(level - 1, 1.95) * 0.5);
}

function computeStats(s: GameState): Stats {
  const p = s.passives;
  const areaMul = 1 + 0.2 * p.bigbread;
  const aura = s.weapons.aura ?? 0;
  const chicken = s.weapons.chicken ?? 0;
  return {
    dmgMul: 1 + 0.15 * p.sauce,
    cdMul: Math.pow(0.9, p.coffee),
    areaMul,
    speed: 230 * (1 + 0.12 * p.fins),
    magnet: 120 * (1 + 0.45 * p.magnet),
    crit: 0.05 + 0.08 * p.socks,
    regen: p.bath,
    maxHp: 100 + 25 * p.feathers,
    auraR: aura ? AURA.radius[aura - 1] * areaMul : 0,
    chickenR: chicken ? (78 + chicken * 6) * areaMul : 0,
  };
}

export function createState(demo = false): GameState {
  const zeroCd = Object.fromEntries(WEAPON_IDS.map((id) => [id, 0.4])) as Record<
    WeaponId,
    number
  >;
  const zeroPassives = Object.fromEntries(PASSIVE_IDS.map((id) => [id, 0])) as Record<
    PassiveId,
    number
  >;
  const s: GameState = {
    t: 0,
    demo,
    player: { x: 0, y: 0, vx: 0, vy: 0, r: 18, hp: 100, invuln: 0, face: 1, aim: 0, moving: false },
    cam: { x: 0, y: 0 },
    shake: 0,
    viewW: 1200,
    viewH: 800,
    weapons: demo ? { bread: 3, chicken: 3, zap: 2, aura: 2 } : { bread: 1 },
    weaponCd: zeroCd,
    passives: zeroPassives,
    stats: undefined as unknown as Stats,
    enemies: [],
    projs: [],
    bombs: [],
    gems: [],
    pickups: [],
    particles: [],
    texts: [],
    beams: [],
    bolts: [],
    rings: [],
    banner: null,
    chickenAngle: 0,
    auraTick: 0,
    level: 1,
    xp: 0,
    xpNeed: xpNeedFor(1),
    pendingLevelUps: 0,
    kills: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    meter: 0,
    spawnAcc: 0,
    nextSwarmAt: 45,
    swarmCount: 0,
    nextBossAt: 150,
    bossCount: 0,
    bossName: BOSS_NAMES[0],
    events: [],
    dying: 0,
    over: false,
    nextId: 1,
    grid: new Map(),
  };
  s.stats = computeStats(s);
  s.player.hp = s.stats.maxHp;
  if (!demo) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      spawnEnemy(s, i % 2 ? "mini" : "blob", Math.cos(a) * 300, Math.sin(a) * 300);
    }
  }
  return s;
}

export function rollChoices(s: GameState, n = 3): Choice[] {
  const pool: { c: Choice; w: number }[] = [];
  for (const id of WEAPON_IDS) {
    const lv = s.weapons[id] ?? 0;
    if (lv < MAX_LEVEL) pool.push({ c: { kind: "weapon", id, level: lv + 1 }, w: lv === 0 ? 1.3 : 1 });
  }
  for (const id of PASSIVE_IDS) {
    const lv = s.passives[id];
    if (lv < MAX_LEVEL) pool.push({ c: { kind: "passive", id, level: lv + 1 }, w: 0.8 });
  }
  const picks: Choice[] = [];
  while (picks.length < n && pool.length > 0) {
    const total = pool.reduce((sum, item) => sum + item.w, 0);
    let roll = Math.random() * total;
    let index = 0;
    for (; index < pool.length - 1; index++) {
      roll -= pool[index].w;
      if (roll <= 0) break;
    }
    picks.push(pool[index].c);
    pool.splice(index, 1);
  }
  if (picks.length === 0) return [{ kind: "snack" }, { kind: "gold" }];
  return picks;
}

export function choiceInfo(c: Choice): {
  emoji: string;
  name: string;
  tag: string;
  desc: string;
  isNew: boolean;
  kind: Choice["kind"];
} {
  switch (c.kind) {
    case "weapon": {
      const def = WEAPON_DEFS[c.id];
      return {
        emoji: def.emoji,
        name: def.name,
        tag: c.level === 1 ? "NEW!" : `LV ${c.level - 1} → ${c.level}`,
        desc: c.level === 1 ? def.blurb : def.levels[c.level - 1],
        isNew: c.level === 1,
        kind: c.kind,
      };
    }
    case "passive": {
      const def = PASSIVE_DEFS[c.id];
      return {
        emoji: def.emoji,
        name: def.name,
        tag: c.level === 1 ? "NEW!" : `LV ${c.level - 1} → ${c.level}`,
        desc: def.blurb,
        isNew: c.level === 1,
        kind: c.kind,
      };
    }
    case "snack":
      return { emoji: "🍉", name: "Giant Watermelon", tag: "SNACK", desc: "Full heal. Juicy.", isNew: false, kind: c.kind };
    case "gold":
      return { emoji: "💰", name: "Bag of Coins", tag: "BONUS", desc: "+2,500 score. Cha-ching.", isNew: false, kind: c.kind };
  }
}

export function applyChoice(s: GameState, c: Choice) {
  const p = s.player;
  switch (c.kind) {
    case "weapon":
      s.weapons[c.id] = c.level;
      if (c.level === 1) s.weaponCd[c.id] = 0.2;
      break;
    case "passive":
      s.passives[c.id] = c.level;
      break;
    case "snack":
      p.hp = s.stats.maxHp;
      break;
    case "gold":
      s.score += 2500;
      break;
  }
  s.stats = computeStats(s);
  if (c.kind === "passive" && c.id === "feathers") p.hp = s.stats.maxHp;
  p.hp = Math.min(p.hp, s.stats.maxHp);
}

function setBanner(s: GameState, text: string, sub: string, color: string, ttl = 2.6) {
  s.banner = { text, sub, color, ttl, max: ttl };
}

function addText(s: GameState, x: number, y: number, text: string, color: string, size: number, ttl = 0.7) {
  if (s.texts.length >= MAX_TEXTS) s.texts.shift();
  s.texts.push({ x, y, text, color, size, ttl, max: ttl });
}

function burst(s: GameState, x: number, y: number, n: number, colors: string[], speed: number, size: number) {
  for (let i = 0; i < n && s.particles.length < MAX_PARTICLES; i++) {
    const a = Math.random() * TAU;
    const v = speed * (0.35 + Math.random() * 0.8);
    const ttl = rand(0.3, 0.7);
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: size * rand(0.6, 1.3),
      color: colors[(Math.random() * colors.length) | 0],
      ttl,
      max: ttl,
    });
  }
}

function edgePos(s: GameState, margin: number) {
  const hw = s.viewW / 2 + margin;
  const hh = s.viewH / 2 + margin;
  const p = s.player;
  if (Math.random() < hw / (hw + hh)) {
    return { x: p.x + rand(-hw, hw), y: p.y + (Math.random() < 0.5 ? -hh : hh) };
  }
  return { x: p.x + (Math.random() < 0.5 ? -hw : hw), y: p.y + rand(-hh, hh) };
}

function spawnEnemy(s: GameState, kind: EnemyKind, x: number, y: number) {
  const base = ENEMY_BASE[kind];
  const hpScale = kind === "boss" ? 1 + s.bossCount * 1.6 : 1 + s.t / 120 + (s.t / 170) ** 2 + (s.t / 260) ** 3;
  const speedScale = kind === "boss" ? 1 : 1 + Math.min(0.4, s.t / 600);
  const dmgScale = 1 + s.t / 300;
  const hp = Math.round(base.hp * hpScale);
  const e: Enemy = {
    id: s.nextId++,
    kind,
    x,
    y,
    kx: 0,
    ky: 0,
    r: base.r,
    hp,
    maxHp: hp,
    speed: base.speed * speedScale * rand(0.9, 1.1),
    dmg: Math.round(base.dmg * dmgScale),
    xp: base.xp,
    flash: 0,
    seed: Math.random() * 100,
    dead: false,
    chickenCd: 0,
    attackCd: rand(1, 2.5),
    mode: "walk",
    modeTimer: 3,
    dx: 0,
    dy: 0,
  };
  s.enemies.push(e);
  return e;
}

function pickKind(s: GameState): EnemyKind {
  const t = s.t;
  const table: [EnemyKind, number][] = [
    ["blob", 10],
    ["mini", t < 60 ? 4 : 1],
    ["bat", t > 15 ? 5 : 0],
    ["spitter", t > 40 && s.enemies.filter((e) => e.kind === "spitter").length < 10 ? 1.5 : 0],
    ["splitter", t > 60 ? 3 : 0],
    ["brute", t > 80 ? 2 + t / 120 : 0],
  ];
  const total = table.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [kind, w] of table) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return "blob";
}

function updateSpawning(s: GameState, dt: number) {
  const bossAlive = s.enemies.some((e) => e.kind === "boss" && !e.dead);
  let rate = s.demo ? 6 : 1.6 + s.t / 20;
  if (bossAlive) rate *= 0.45;
  s.spawnAcc += dt * rate;
  const cap = s.demo ? 120 : 420;
  while (s.spawnAcc >= 1) {
    s.spawnAcc -= 1;
    if (s.enemies.length >= cap) continue;
    const pos = edgePos(s, 50);
    spawnEnemy(s, pickKind(s), pos.x, pos.y);
  }

  if (s.demo) return;
  const p = s.player;

  if (s.t >= s.nextSwarmAt) {
    s.swarmCount++;
    s.nextSwarmAt += 60;
    const R = Math.hypot(s.viewW, s.viewH) / 2 + 40;
    if (s.swarmCount % 2 === 1) {
      const n = 18 + s.swarmCount * 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        spawnEnemy(s, "bat", p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
      }
      setBanner(s, "BAT TORNADO!", "they're coming from everywhere", "#c084fc");
    } else {
      const a = Math.random() * TAU;
      const n = 22 + s.swarmCount * 4;
      const cx = p.x + Math.cos(a) * R;
      const cy = p.y + Math.sin(a) * R;
      const spread = Math.max(s.viewW, s.viewH) * 0.8;
      for (let i = 0; i < n; i++) {
        const off = (i / (n - 1) - 0.5) * spread;
        spawnEnemy(s, "blob", cx - Math.sin(a) * off, cy + Math.cos(a) * off);
      }
      setBanner(s, "BLOB STAMPEDE!", "a wall of goo approaches", "#86efac");
    }
    s.events.push("swarm");
  }

  if (s.t >= s.nextBossAt) {
    s.nextBossAt += 150;
    s.bossName = BOSS_NAMES[Math.min(s.bossCount, BOSS_NAMES.length - 1)];
    const pos = edgePos(s, 90);
    spawnEnemy(s, "boss", pos.x, pos.y);
    const subs = [
      "he is very big and very rude",
      "he's back. and he's mad.",
      "he brought a bigger crown",
      "this guy just doesn't quit",
    ];
    setBanner(s, `${s.bossName} ARRIVES!`, subs[Math.min(s.bossCount, subs.length - 1)], "#e879f9", 3.2);
    s.bossCount++;
    s.shake = Math.max(s.shake, 14);
    s.events.push("boss");
  }
}

function hurtPlayer(s: GameState, dmg: number) {
  const p = s.player;
  if (s.demo || s.dying > 0 || p.invuln > 0) return;
  p.hp -= dmg;
  p.invuln = 0.7;
  s.shake = Math.max(s.shake, 10);
  s.events.push("hurt");
  addText(s, p.x, p.y - 30, `-${dmg}`, "#ff5470", 22, 0.9);
  forEachNear(s, p.x, p.y, 100, (e) => {
    if (e.kind === "boss") return;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    e.kx += (dx / d) * 380;
    e.ky += (dy / d) * 380;
  });
  if (p.hp <= 0) {
    p.hp = 0;
    s.dying = 1.6;
    s.events.push("death");
    burst(s, p.x, p.y, 40, ["#ffd93d", "#ffffff", "#ff9f1c"], 420, 6);
  }
}

function forEachNear(s: GameState, x: number, y: number, r: number, fn: (e: Enemy) => void) {
  const reach = r + MAX_ENEMY_R;
  const x0 = Math.floor((x - reach) / CELL);
  const x1 = Math.floor((x + reach) / CELL);
  const y0 = Math.floor((y - reach) / CELL);
  const y1 = Math.floor((y + reach) / CELL);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const bucket = s.grid.get(cellKey(cx, cy));
      if (!bucket) continue;
      for (const e of bucket) {
        if (e.dead) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        const rr = r + e.r;
        if (dx * dx + dy * dy < rr * rr) fn(e);
      }
    }
  }
}

function buildGrid(s: GameState) {
  s.grid.clear();
  for (const e of s.enemies) {
    if (e.dead) continue;
    const key = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    const bucket = s.grid.get(key);
    if (bucket) bucket.push(e);
    else s.grid.set(key, [e]);
  }
}

function nearestEnemy(s: GameState, x: number, y: number, maxDist: number) {
  let best: Enemy | null = null;
  let bestD = maxDist * maxDist;
  for (const e of s.enemies) {
    if (e.dead) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function randomEnemyNear(s: GameState, x: number, y: number, maxDist: number) {
  const list: Enemy[] = [];
  const m = maxDist * maxDist;
  for (const e of s.enemies) {
    if (e.dead) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy < m) list.push(e);
  }
  return list.length ? list[(Math.random() * list.length) | 0] : null;
}

function dropGem(s: GameState, x: number, y: number, value: number) {
  if (s.gems.length >= MAX_GEMS) {
    s.gems[(Math.random() * s.gems.length) | 0].value += value;
    return;
  }
  s.gems.push({ x: x + rand(-6, 6), y: y + rand(-6, 6), value, speed: 0, pulled: false });
}

const ENEMY_SPLAT: Record<EnemyKind, string[]> = {
  blob: ["#6ee05a", "#2f9e44", "#b9f6a8"],
  mini: ["#b5f27a", "#5fa83a"],
  bat: ["#a78bfa", "#5b21b6", "#ddd6fe"],
  brute: ["#f87171", "#b91c1c", "#fecaca"],
  splitter: ["#5cc8ff", "#0369a1", "#e0f2fe"],
  spitter: ["#fdba74", "#c2410c", "#ffedd5"],
  boss: ["#c084fc", "#6b21a8", "#fde047", "#ffffff"],
};

function killEnemy(s: GameState, e: Enemy, chargesMeter = true) {
  e.dead = true;
  s.kills++;
  if (chargesMeter) {
    const gain = e.kind === "boss" ? METER_MAX : 1 / (1 + s.t / 60);
    s.meter = Math.min(METER_MAX, s.meter + gain);
  }
  s.combo = s.comboTimer > 0 ? s.combo + 1 : 1;
  s.comboTimer = 2;
  if (s.combo > s.bestCombo) s.bestCombo = s.combo;
  if (s.combo > 0 && (s.combo === 50 || s.combo === 100 || s.combo % 250 === 0)) {
    addText(s, s.player.x, s.player.y - 60, `${s.combo} COMBO! 🔥`, "#ffb703", 30, 1.4);
  }
  s.score += 10 * (1 + Math.floor(Math.min(s.combo, 200) / 10));
  burst(s, e.x, e.y, Math.min(16, 6 + e.r / 3), ENEMY_SPLAT[e.kind], 160 + e.r * 4, e.r * 0.28);
  s.events.push("kill");

  if (e.kind === "boss") {
    for (let i = 0; i < 30; i++) dropGem(s, e.x + rand(-60, 60), e.y + rand(-60, 60), 10);
    s.pickups.push({ kind: "chest", x: e.x, y: e.y, age: 0 });
    s.pickups.push({ kind: "pizza", x: e.x + 50, y: e.y + 20, age: 0 });
    s.score += 5000;
    s.shake = Math.max(s.shake, 22);
    s.rings.push({ x: e.x, y: e.y, r0: 20, r1: 400, ttl: 0.7, max: 0.7, color: "#f0abfc", width: 14 });
    burst(s, e.x, e.y, 80, ENEMY_SPLAT.boss, 600, 8);
    setBanner(s, `${s.bossName} DEFEATED!`, "+5,000 points • treasure dropped 🎁", "#fde047", 3);
    s.events.push("bossdown");
    return;
  }

  dropGem(s, e.x, e.y, e.xp);

  if (e.kind === "splitter") {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + Math.random();
      const m = spawnEnemy(s, "mini", e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12);
      m.kx = Math.cos(a) * 260;
      m.ky = Math.sin(a) * 260;
    }
  }

  const roll = Math.random();
  if (e.kind === "brute" && roll < 0.05) s.pickups.push({ kind: "chest", x: e.x, y: e.y, age: 0 });
  else if (roll < 0.012) s.pickups.push({ kind: "pizza", x: e.x, y: e.y, age: 0 });
  else if (roll < 0.018) s.pickups.push({ kind: "magnet", x: e.x, y: e.y, age: 0 });
  else if (roll < 0.022) s.pickups.push({ kind: "nuke", x: e.x, y: e.y, age: 0 });
}

function damageEnemy(s: GameState, e: Enemy, base: number, srcX: number, srcY: number, knock: number) {
  if (e.dead) return;
  let dmg = base * s.stats.dmgMul;
  const crit = Math.random() < s.stats.crit;
  if (crit) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.1;
  if (knock && e.kind !== "boss") {
    const dx = e.x - srcX;
    const dy = e.y - srcY;
    const d = Math.hypot(dx, dy) || 1;
    const k = knock * (e.kind === "brute" ? 0.35 : 1);
    e.kx += (dx / d) * k;
    e.ky += (dy / d) * k;
  }
  addText(s, e.x + rand(-8, 8), e.y - e.r, String(dmg), crit ? "#ffe14d" : "#ffffff", crit ? 22 : 15);
  s.events.push("hit");
  if (e.hp <= 0) killEnemy(s, e);
}

function blast(s: GameState, bossFraction: number) {
  const cx = s.cam.x;
  const cy = s.cam.y;
  const hw = s.viewW / 2 + 60;
  const hh = s.viewH / 2 + 60;
  const targets = s.enemies.filter(
    (e) => !e.dead && Math.abs(e.x - cx) < hw && Math.abs(e.y - cy) < hh,
  );
  for (const e of targets) {
    if (e.kind === "boss") {
      damageEnemy(s, e, (e.maxHp * bossFraction) / s.stats.dmgMul, cx, cy, 0);
    } else {
      killEnemy(s, e, false);
    }
  }
  const p = s.player;
  s.rings.push({ x: p.x, y: p.y, r0: 20, r1: Math.hypot(hw, hh), ttl: 0.6, max: 0.6, color: "#fde047", width: 26 });
  s.rings.push({ x: p.x, y: p.y, r0: 10, r1: Math.hypot(hw, hh) * 0.7, ttl: 0.45, max: 0.45, color: "#ffffff", width: 12 });
  s.shake = Math.max(s.shake, 24);
}

export function megaQuack(s: GameState) {
  if (s.meter < METER_MAX || s.dying > 0 || s.over) return false;
  s.meter = 0;
  blast(s, 0.15);
  for (const g of s.gems) g.pulled = true;
  setBanner(s, "QUACK!!!", "everything on screen: gone", "#fde047", 1.6);
  s.events.push("quack");
  return true;
}

function openChest(s: GameState) {
  const count = Math.random() < 0.25 ? 3 : Math.random() < 0.55 ? 2 : 1;
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const c = rollChoices(s, 1)[0];
    applyChoice(s, c);
    const info = choiceInfo(c);
    names.push(`${info.emoji} ${info.name}${"level" in c ? ` LV${c.level}` : ""}`);
  }
  setBanner(s, "TREASURE! 🎁", names.join("  •  "), "#fde047", 3.2);
  s.events.push("chest");
}

function updatePlayer(s: GameState, dt: number, move: MoveInput) {
  const p = s.player;
  const st = s.stats;
  p.invuln = Math.max(0, p.invuln - dt);
  if (s.dying > 0) {
    p.vx = 0;
    p.vy = 0;
    p.moving = false;
    return;
  }
  let mx = move.x;
  let my = move.y;
  if (s.demo) {
    mx = Math.cos(s.t * 0.6) * 0.8;
    my = Math.sin(s.t * 0.9) * 0.8;
  }
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  const k = 1 - Math.exp(-dt * 14);
  p.vx += (mx * st.speed - p.vx) * k;
  p.vy += (my * st.speed - p.vy) * k;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.moving = len > 0.1;
  if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1;
  p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
}

function updateBoss(s: GameState, e: Enemy, dt: number, dx: number, dy: number) {
  e.modeTimer -= dt;
  if (e.mode === "walk") {
    e.attackCd -= dt;
    if (e.attackCd <= 0) {
      e.attackCd = 3.2;
      const n = 8 + 4 * Math.min(3, s.bossCount - 1);
      const off = Math.random() * TAU;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * TAU;
        s.projs.push({
          kind: "spit",
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * 170,
          vy: Math.sin(a) * 170,
          r: 9,
          dmg: 10,
          pierce: 1,
          ttl: 5,
          spin: 0,
          hit: new Set(),
          returning: false,
          hostile: true,
          dead: false,
        });
      }
    }
    if (e.modeTimer <= 0) {
      e.mode = "windup";
      e.modeTimer = 0.75;
      e.dx = dx;
      e.dy = dy;
    }
    return { mx: dx, my: dy, spd: e.speed };
  }
  if (e.mode === "windup") {
    if (e.modeTimer <= 0) {
      e.mode = "charge";
      e.modeTimer = 0.75;
      s.shake = Math.max(s.shake, 6);
    }
    return { mx: 0, my: 0, spd: 0 };
  }
  if (e.modeTimer <= 0) {
    e.mode = "walk";
    e.modeTimer = rand(2.5, 4);
  }
  return { mx: e.dx, my: e.dy, spd: 480 };
}

function updateEnemies(s: GameState, dt: number) {
  const p = s.player;
  const auraR = s.stats.auraR;
  const farDist = Math.hypot(s.viewW, s.viewH) * 0.9;
  const kDecay = Math.exp(-dt * 8);
  for (const e of s.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.chickenCd -= dt;
    let dx = p.x - e.x;
    let dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    let spd = e.speed;
    let mx = dx;
    let my = dy;
    switch (e.kind) {
      case "bat": {
        const w = Math.sin(s.t * 6 + e.seed) * 0.7;
        mx = dx - dy * w;
        my = dy + dx * w;
        break;
      }
      case "spitter": {
        if (d < 150) {
          mx = -dx;
          my = -dy;
        } else if (d < 230) {
          mx = -dy;
          my = dx;
          spd *= 0.6;
        }
        e.attackCd -= dt;
        if (e.attackCd <= 0 && d < 420) {
          e.attackCd = 3.6;
          s.projs.push({
            kind: "spit",
            x: e.x,
            y: e.y,
            vx: dx * 200,
            vy: dy * 200,
            r: 7,
            dmg: 6,
            pierce: 1,
            ttl: 4,
            spin: 0,
            hit: new Set(),
            returning: false,
            hostile: true,
            dead: false,
          });
        }
        break;
      }
      case "boss": {
        const b = updateBoss(s, e, dt, dx, dy);
        mx = b.mx;
        my = b.my;
        spd = b.spd;
        break;
      }
    }
    if (auraR && d < auraR + e.r) spd *= 0.6;
    e.x += (mx * spd + e.kx) * dt;
    e.y += (my * spd + e.ky) * dt;
    e.kx *= kDecay;
    e.ky *= kDecay;

    if (d > farDist && e.kind !== "boss") {
      const pos = edgePos(s, 50);
      e.x = pos.x;
      e.y = pos.y;
      continue;
    }
    if (d < e.r + p.r * 0.75) hurtPlayer(s, e.dmg);
  }
}

function separate(s: GameState) {
  for (const e of s.enemies) {
    if (e.dead) continue;
    const cx = Math.floor(e.x / CELL);
    const cy = Math.floor(e.y / CELL);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = s.grid.get(cellKey(cx + ox, cy + oy));
        if (!bucket) continue;
        for (const o of bucket) {
          if (o.id <= e.id || o.dead) continue;
          const dx = o.x - e.x;
          const dy = o.y - e.y;
          const min = o.r + e.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 < 0.0001) continue;
          const d = Math.sqrt(d2);
          const push = (min - d) * 0.5;
          const nx = dx / d;
          const ny = dy / d;
          const we = e.kind === "boss" ? 0.05 : o.kind === "boss" ? 1.9 : (o.r / min) * 2;
          const wo = o.kind === "boss" ? 0.05 : e.kind === "boss" ? 1.9 : (e.r / min) * 2;
          e.x -= nx * push * we;
          e.y -= ny * push * we;
          o.x += nx * push * wo;
          o.y += ny * push * wo;
        }
      }
    }
  }
}

function makeProj(
  kind: Proj["kind"],
  x: number,
  y: number,
  angle: number,
  speed: number,
  r: number,
  dmg: number,
  pierce: number,
  ttl: number,
): Proj {
  return {
    kind,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r,
    dmg,
    pierce,
    ttl,
    spin: Math.random() * TAU,
    hit: new Set(),
    returning: false,
    hostile: false,
    dead: false,
  };
}

function updateWeapons(s: GameState, dt: number) {
  const p = s.player;
  const st = s.stats;
  if (s.dying > 0) return;

  for (const id of WEAPON_IDS) {
    const lv = s.weapons[id];
    if (!lv || id === "chicken" || id === "aura") continue;
    const i = lv - 1;
    s.weaponCd[id] -= dt;
    if (s.weaponCd[id] > 0) continue;

    switch (id) {
      case "bread": {
        const target = nearestEnemy(s, p.x, p.y, 700);
        if (!target) {
          s.weaponCd.bread = 0.1;
          break;
        }
        const base = Math.atan2(target.y - p.y, target.x - p.x);
        p.aim = base;
        const n = BREAD.count[i];
        for (let k = 0; k < n; k++) {
          const a = base + (k - (n - 1) / 2) * 0.18;
          s.projs.push(makeProj("bread", p.x, p.y, a, 580, 9 * st.areaMul, BREAD.dmg[i], BREAD.pierce[i], 1.3));
        }
        s.weaponCd.bread = BREAD.cd[i] * st.cdMul;
        s.events.push("shoot");
        break;
      }
      case "zap": {
        const first = randomEnemyNear(s, p.x, p.y, 420);
        if (!first) {
          s.weaponCd.zap = 0.2;
          break;
        }
        const hit = new Set<number>();
        const pts = [{ x: p.x, y: p.y }];
        let cur: Enemy | null = first;
        for (let c = 0; c < ZAP.chain[i] && cur; c++) {
          const from: Enemy = cur;
          hit.add(from.id);
          pts.push({ x: from.x, y: from.y });
          damageEnemy(s, from, ZAP.dmg[i], from.x, from.y, 0);
          burst(s, from.x, from.y, 3, ["#a5f3fc", "#ffffff"], 160, 2.5);
          let next: Enemy | null = null;
          let nextD = Infinity;
          forEachNear(s, from.x, from.y, 170, (e) => {
            if (hit.has(e.id)) return;
            const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
            if (d < nextD) {
              nextD = d;
              next = e;
            }
          });
          cur = next as Enemy | null;
        }
        s.bolts.push({ pts, ttl: 0.2, max: 0.2 });
        s.weaponCd.zap = ZAP.cd[i] * st.cdMul;
        s.events.push("zap");
        break;
      }
      case "bomb": {
        for (let k = 0; k < BOMB.count[i]; k++) {
          const t = randomEnemyNear(s, p.x, p.y, 450);
          const a = Math.random() * TAU;
          s.bombs.push({
            x0: p.x,
            y0: p.y,
            x1: t ? t.x : p.x + Math.cos(a) * 200,
            y1: t ? t.y : p.y + Math.sin(a) * 200,
            t: 0,
            dur: 0.55,
            dmg: BOMB.dmg[i],
            radius: BOMB.radius[i] * st.areaMul,
          });
        }
        s.weaponCd.bomb = BOMB.cd[i] * st.cdMul;
        s.events.push("throw");
        break;
      }
      case "laser": {
        const target = nearestEnemy(s, p.x, p.y, 800);
        if (!target) {
          s.weaponCd.laser = 0.2;
          break;
        }
        const base = Math.atan2(target.y - p.y, target.x - p.x);
        const n = LASER.beams[i];
        const width = LASER.width[i] * st.areaMul;
        const len = 1100;
        for (let k = 0; k < n; k++) {
          const a = base + (k * TAU) / n;
          const c = Math.cos(a);
          const sn = Math.sin(a);
          const victims = s.enemies.filter((e) => {
            if (e.dead) return false;
            const rx = e.x - p.x;
            const ry = e.y - p.y;
            const along = rx * c + ry * sn;
            if (along < 0 || along > len) return false;
            return Math.abs(-rx * sn + ry * c) < e.r + width / 2;
          });
          for (const e of victims) damageEnemy(s, e, LASER.dmg[i], p.x, p.y, 140);
          s.beams.push({ angle: a, len, width, ttl: 0.28, max: 0.28 });
        }
        s.shake = Math.max(s.shake, 3);
        s.weaponCd.laser = LASER.cd[i] * st.cdMul;
        s.events.push("laser");
        break;
      }
      case "flipflop": {
        for (let k = 0; k < FLIP.count[i]; k++) {
          const t = randomEnemyNear(s, p.x, p.y, 400);
          const a = (t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.random() * TAU) + (k ? rand(-0.5, 0.5) : 0);
          s.projs.push(makeProj("flipflop", p.x, p.y, a, 650, 14 * st.areaMul, FLIP.dmg[i], 9999, 3.5));
        }
        s.weaponCd.flipflop = FLIP.cd[i] * st.cdMul;
        s.events.push("throw");
        break;
      }
    }
  }

  const chickenLv = s.weapons.chicken;
  if (chickenLv) {
    const i = chickenLv - 1;
    s.chickenAngle += dt * 3.6;
    const n = CHICKEN.count[i];
    const cr = 13 * st.areaMul;
    for (let k = 0; k < n; k++) {
      const a = s.chickenAngle + (k * TAU) / n;
      const cx = p.x + Math.cos(a) * st.chickenR;
      const cy = p.y + Math.sin(a) * st.chickenR;
      forEachNear(s, cx, cy, cr, (e) => {
        if (e.chickenCd > 0) return;
        e.chickenCd = 0.4;
        damageEnemy(s, e, CHICKEN.dmg[i], p.x, p.y, 260);
        s.events.push("squeak");
      });
    }
  }

  const auraLv = s.weapons.aura;
  if (auraLv) {
    s.auraTick -= dt;
    if (s.auraTick <= 0) {
      s.auraTick = 0.4;
      forEachNear(s, p.x, p.y, st.auraR, (e) => damageEnemy(s, e, AURA.dmg[auraLv - 1], p.x, p.y, 60));
    }
  }
}

function updateProjs(s: GameState, dt: number) {
  const p = s.player;
  for (const pr of s.projs) {
    if (pr.dead) continue;
    pr.ttl -= dt;
    pr.spin += dt * (pr.kind === "flipflop" ? 18 : 8);
    if (pr.kind === "flipflop") {
      if (!pr.returning) {
        const sp = Math.hypot(pr.vx, pr.vy);
        const ns = sp - 900 * dt;
        if (ns <= 40) {
          pr.returning = true;
          pr.hit.clear();
        } else {
          pr.vx *= ns / sp;
          pr.vy *= ns / sp;
        }
      } else {
        const dx = p.x - pr.x;
        const dy = p.y - pr.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(900, Math.hypot(pr.vx, pr.vy) + 1600 * dt);
        pr.vx = (dx / d) * sp;
        pr.vy = (dy / d) * sp;
        if (d < p.r + 10) pr.dead = true;
      }
    }
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    if (pr.ttl <= 0) pr.dead = true;
    if (pr.dead) continue;

    if (pr.hostile) {
      const dx = p.x - pr.x;
      const dy = p.y - pr.y;
      const rr = pr.r + p.r * 0.7;
      if (dx * dx + dy * dy < rr * rr) {
        hurtPlayer(s, pr.dmg);
        pr.dead = true;
      }
      continue;
    }

    forEachNear(s, pr.x, pr.y, pr.r, (e) => {
      if (pr.dead || pr.hit.has(e.id)) return;
      pr.hit.add(e.id);
      damageEnemy(s, e, pr.dmg, pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05, pr.kind === "bread" ? 180 : 220);
      if (pr.kind === "bread") burst(s, pr.x, pr.y, 3, ["#f4c27a", "#c98a3c"], 120, 2.5);
      pr.pierce--;
      if (pr.pierce <= 0) pr.dead = true;
    });
  }
  s.projs = s.projs.filter((pr) => !pr.dead);
}

function updateBombs(s: GameState, dt: number) {
  for (const b of s.bombs) {
    b.t += dt;
    if (b.t < b.dur) continue;
    forEachNear(s, b.x1, b.y1, b.radius, (e) => damageEnemy(s, e, b.dmg, b.x1, b.y1, 320));
    burst(s, b.x1, b.y1, 18, ["#ff9f1c", "#ffd93d", "#ffffff", "#ff5d8f", "#7dd3fc"], 360, 5);
    s.rings.push({ x: b.x1, y: b.y1, r0: 10, r1: b.radius, ttl: 0.3, max: 0.3, color: "#ffd166", width: 10 });
    s.shake = Math.max(s.shake, 6);
    s.events.push("boom");
  }
  s.bombs = s.bombs.filter((b) => b.t < b.dur);
}

function collectXp(s: GameState, value: number) {
  s.xp += value;
  s.events.push("gem");
  while (s.xp >= s.xpNeed) {
    s.xp -= s.xpNeed;
    s.level++;
    s.xpNeed = xpNeedFor(s.level);
    s.pendingLevelUps++;
    s.events.push("levelup");
  }
}

function updateGems(s: GameState, dt: number) {
  const p = s.player;
  const magnet = s.stats.magnet;
  let write = 0;
  for (const g of s.gems) {
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const d = Math.hypot(dx, dy) || 1;
    if (g.pulled || d < magnet) {
      g.pulled = true;
      g.speed = Math.min(1100, g.speed + 2200 * dt);
      const step = Math.min(d, g.speed * dt);
      g.x += (dx / d) * step;
      g.y += (dy / d) * step;
    }
    if (d < p.r + 8 && s.dying <= 0) {
      collectXp(s, g.value);
      continue;
    }
    s.gems[write++] = g;
  }
  s.gems.length = write;
}

function updatePickups(s: GameState, dt: number) {
  const p = s.player;
  s.pickups = s.pickups.filter((pk) => {
    pk.age += dt;
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    if (dx * dx + dy * dy > (p.r + 26) ** 2 || s.dying > 0) return true;
    switch (pk.kind) {
      case "pizza":
        p.hp = Math.min(s.stats.maxHp, p.hp + 35);
        addText(s, p.x, p.y - 34, "+35 🍕", "#4ade80", 24, 1);
        s.events.push("pickup");
        break;
      case "magnet":
        for (const g of s.gems) g.pulled = true;
        setBanner(s, "MEGA MAGNET!", "all gems are coming to papa", "#60a5fa", 1.6);
        s.events.push("pickup");
        break;
      case "nuke":
        blast(s, 0.05);
        setBanner(s, "KABOOM!", "screen cleared", "#fb923c", 1.4);
        s.events.push("quack");
        break;
      case "chest":
        openChest(s);
        break;
    }
    return false;
  });
}

function updateFx(s: GameState, dt: number) {
  const fr = Math.exp(-dt * 4);
  let w = 0;
  for (const pt of s.particles) {
    pt.ttl -= dt;
    if (pt.ttl <= 0) continue;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= fr;
    pt.vy *= fr;
    s.particles[w++] = pt;
  }
  s.particles.length = w;

  w = 0;
  for (const tx of s.texts) {
    tx.ttl -= dt;
    if (tx.ttl <= 0) continue;
    tx.y -= 45 * dt;
    s.texts[w++] = tx;
  }
  s.texts.length = w;

  s.beams = s.beams.filter((b) => (b.ttl -= dt) > 0);
  s.bolts = s.bolts.filter((b) => (b.ttl -= dt) > 0);
  s.rings = s.rings.filter((r) => (r.ttl -= dt) > 0);
  if (s.banner) {
    s.banner.ttl -= dt;
    if (s.banner.ttl <= 0) s.banner = null;
  }
  s.shake *= Math.exp(-dt * 10);
  if (s.shake < 0.3) s.shake = 0;
}

export function tick(s: GameState, rawDt: number, move: MoveInput) {
  if (s.over) return;
  let dt = rawDt;
  if (s.dying > 0) {
    dt *= 0.3;
    s.dying -= rawDt;
    if (s.dying <= 0) {
      s.over = true;
      return;
    }
  }
  s.t += dt;

  updatePlayer(s, dt, move);
  updateSpawning(s, dt);
  updateEnemies(s, dt);
  buildGrid(s);
  separate(s);
  updateWeapons(s, dt);
  updateProjs(s, dt);
  updateBombs(s, dt);
  updateGems(s, dt);
  updatePickups(s, dt);
  updateFx(s, dt);

  s.enemies = s.enemies.filter((e) => !e.dead);

  s.comboTimer -= dt;
  if (s.comboTimer <= 0) s.combo = 0;

  const k = 1 - Math.exp(-dt * 10);
  s.cam.x += (s.player.x - s.cam.x) * k;
  s.cam.y += (s.player.y - s.cam.y) * k;
}

export function livingBoss(s: GameState) {
  return s.enemies.find((e) => e.kind === "boss" && !e.dead) ?? null;
}
