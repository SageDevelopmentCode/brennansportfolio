import type { EffectiveVehicleStats } from "@/lib/hill-climb/upgrades";
import { getStageById } from "@/lib/hill-climb/stages";
import { getVehicleById } from "@/lib/hill-climb/vehicles";
import {
  buildChunkSurfacePoints,
  CHUNK_WIDTH,
  createTerrainSegmentBody,
  GROUND_DEPTH,
  isValidTerrainBody,
  surfaceAngleAt,
  surfaceYAt,
} from "@/lib/hill-climb/terrain";
import {
  AIR_TIME_COIN,
  AIR_TORQUE_BRAKE,
  AIR_TORQUE_GAS,
  BACKFLIP_COIN,
  BASE_GRAVITY,
  BRAKE_FORCE_MUL,
  BRAKE_WHEEL_DAMP,
  CAMERA_AIR_LIFT,
  CAMERA_LOOKAHEAD,
  CAMERA_LOOKAHEAD_BASE,
  CAMERA_LOOKAHEAD_MAX,
  CAMERA_LOOKAHEAD_MIN,
  CAMERA_X_BIAS,
  CAMERA_Y_BIAS,
  COAST_STOP_SEC,
  COAST_STOP_SPEED,
  DRIVE_ASSIST,
  FRONTFLIP_COIN,
  FUEL_DRAIN_PER_SEC,
  FUEL_DRAIN_REV_PER_SEC,
  CAR2_FOURWD_FRONT_BONUS,
  CAR2_FRONT_DRIVE_RATIO,
  CAR2_FRONT_DRIVE_SPEED_FADE,
  fuelStationDistanceM,
  GROUND_PITCH_BRAKE_MUL,
  GROUND_PITCH_FLAT_SLOPE_RAD,
  GROUND_PITCH_GAS_MAX,
  GROUND_PITCH_STEEP_SLOPE_RAD,
  HEAD_RADIUS,
  METERS_PER_PIXEL,
  MIN_GROUNDED_DRIVE_FORCE,
  NECK_GAP_PX,
  NECKFLIP_COIN,
  REVERSE_DRIVE_MUL,
  REVERSE_NOSE_DOWN,
  REVERSE_SPEED,
  SUSPENSION_ARCHETYPE,
  SUSPENSION_DAMPING_BASE,
  SUSPENSION_LENGTH_BASE,
  SUSPENSION_STIFFNESS_BASE,
  TRACTION_GRIP_MUL,
  TRACTION_NORMAL_SCALE,
  TRACTION_SLIP_FACTOR,
  TRACTION_SLIP_SPEED,
  WHEEL_GROUND_ABOVE,
  WHEEL_GROUND_BELOW,
  WHEEL_GROUND_MAX_VY,
  WHEEL_RESTITUTION,
  WHEELIE_ANGLE_START_RAD,
  WHEELIE_ANGLE_START_RAD_CAR2,
  WHEELIE_DRIVE_MIN_MUL,
} from "@/lib/hill-climb/tuning";
import type {
  BonusEvent,
  BonusKind,
  CoinDenomination,
  GameInput,
  PickupKind,
  RunSnapshot,
  StageHazardKind,
  VehicleUpgradeLevels,
} from "@/lib/hill-climb/types";
import type { Body, Constraint, Engine, IEventCollision, World } from "matter-js";

type PickupEntity = {
  body: Body;
  kind: PickupKind;
  value: number;
  collected: boolean;
  fuelIndex?: number;
};

type HazardEntity = {
  body: Body;
  kind: StageHazardKind;
};

type ChunkRecord = {
  index: number;
  bodies: Body[];
};

export type HazardRender = {
  kind: StageHazardKind;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WheelRender = { x: number; y: number; angle: number; r: number; speed: number };

export type RagdollPartRender = {
  kind: "head" | "torso" | "limb";
  x: number;
  y: number;
  angle: number;
  w: number;
  h: number;
};

export type HillClimbEngineOptions = {
  stageId: string;
  vehicleId: string;
  stats: EffectiveVehicleStats;
  seed?: number;
  upgradeLevels?: VehicleUpgradeLevels;
};

export type VehicleVisualState = {
  upgradeLevels: VehicleUpgradeLevels;
  compression: number[];
  gasDown: boolean;
  airborne: number;
};

const VEHICLE_CATEGORY = 0x0004;
const RAGDOLL_CATEGORY = 0x0008;
const EMPTY_BONUSES = (): Record<BonusKind, number> => ({
  airTime: 0,
  backflip: 0,
  frontflip: 0,
  neckFlip: 0,
});

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function coinValueAt(distanceM: number): CoinDenomination {
  if (distanceM < 250) return 5;
  if (distanceM < 600) return 25;
  if (distanceM < 1200) return 100;
  return 500;
}

export class HillClimbEngine {
  private Matter: typeof import("matter-js");
  private engine: Engine;
  private world: World;
  private stageId: string;
  private vehicleId: string;
  private stats: EffectiveVehicleStats;
  private seed: number;
  private upgradeLevels: VehicleUpgradeLevels;
  private wheelRadiusScale = 1;
  private suspensionRestLengths: number[] = [];

  private chassis!: Body;
  private wheels: Body[] = [];
  private constraints: Constraint[] = [];
  private headSensor!: Body;
  private collisionHandler!: (ev: IEventCollision<Engine>) => void;
  private wheelTouchHandler!: (ev: IEventCollision<Engine>) => void;
  private wheelSepHandler!: (ev: IEventCollision<Engine>) => void;
  private wheelsTouchingTerrain = new Set<Body>();

  private chunks: ChunkRecord[] = [];
  private pickups: PickupEntity[] = [];
  private hazards: HazardEntity[] = [];
  private collectedFuel = new Set<number>();

  private fuel = 100;
  private fuelMax = 100;
  private fuelEmpty = false;
  private coastStillTime = 0;
  private coinsThisRun = 0;
  private diamondsThisRun = 0;
  private distanceM = 0;
  private alive = true;
  private gameOverReason: "fuel" | "crash" | null = null;
  private coinsAtLastCollect = 0;
  private fuelAtLastCollect = false;
  private wasAirborne = false;
  private airStartAngle = 0;
  private airTime = 0;
  private prevOnGround = false;
  private landingImpactStrength = 0;
  private collectFx: { x: number; y: number; kind: PickupKind; until: number; value?: number }[] = [];
  private bonusQueue: BonusEvent[] = [];
  private bonusTotals: Record<BonusKind, number> = EMPTY_BONUSES();
  private ragdoll: { body: Body; kind: RagdollPartRender["kind"]; w: number; h: number }[] = [];

  private input: GameInput = { gas: false, brake: false };
  private startX = 280;

  constructor(matter: typeof import("matter-js"), options: HillClimbEngineOptions) {
    this.Matter = matter;
    this.stageId = options.stageId;
    this.vehicleId = options.vehicleId;
    this.stats = options.stats;
    this.seed = options.seed ?? 42;
    this.upgradeLevels = options.upgradeLevels ?? {};
    const tiresL = this.upgradeLevels.tires ?? 0;
    this.wheelRadiusScale = 1 + Math.min(16, tiresL) * 0.04;

    const stage = getStageById(this.stageId);
    this.engine = matter.Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = BASE_GRAVITY * stage.gravity;

    this.fuelMax = this.stats.fuelCapacity;
    this.fuel = this.fuelMax;

    this.ensureChunksAround(0);
    this.spawnVehicle();
    this.setupCollisionHandler();
    this.setupWheelContactHandlers();
    this.settleSpawnPhysics();
  }

  /** Let suspension compress so frame 0 does not explode constraints */
  private settleSpawnPhysics() {
    const { Engine } = this.Matter;
    const stepMs = 1000 / 60;
    for (let i = 0; i < 4; i++) {
      Engine.update(this.engine, stepMs);
    }
  }

  private suspensionArch(archetype: string) {
    const key = archetype as keyof typeof SUSPENSION_ARCHETYPE;
    return SUSPENSION_ARCHETYPE[key] ?? SUSPENSION_ARCHETYPE.car2;
  }

  private isWheelGrounded(wheel: Body, stage: ReturnType<typeof getStageById>, wheelR: number): boolean {
    if (this.wheelsTouchingTerrain.has(wheel)) return true;
    const groundY = surfaceYAt(wheel.position.x, stage, this.seed);
    const wheelBottom = wheel.position.y + wheelR;
    return (
      wheelBottom >= groundY - WHEEL_GROUND_ABOVE &&
      wheelBottom <= groundY + WHEEL_GROUND_BELOW &&
      Math.abs(wheel.velocity.y) < WHEEL_GROUND_MAX_VY
    );
  }

  /** Loose analytic band for drive fallback when contacts lag the visual hill */
  private isWheelNearSurface(
    wheel: Body,
    stage: ReturnType<typeof getStageById>,
    wheelR: number
  ): boolean {
    if (this.wheelsTouchingTerrain.has(wheel)) return true;
    const groundY = surfaceYAt(wheel.position.x, stage, this.seed);
    const wheelBottom = wheel.position.y + wheelR;
    return (
      wheelBottom >= groundY - WHEEL_GROUND_ABOVE - 4 &&
      wheelBottom <= groundY + WHEEL_GROUND_BELOW + 6
    );
  }

  private maxTractionForce(stage: ReturnType<typeof getStageById>, vehicle: ReturnType<typeof getVehicleById>): number {
    const grav = BASE_GRAVITY * stage.gravity;
    const normalPerWheel =
      vehicle.base.mass * grav * TRACTION_NORMAL_SCALE * (4 / Math.max(1, this.wheels.length));
    const mu = this.stats.grip * stage.groundFriction * TRACTION_GRIP_MUL;
    return mu * normalPerWheel;
  }

  getSeed() {
    return this.seed;
  }

  getStartX() {
    return this.startX;
  }

  setInput(input: GameInput) {
    this.input = input;
  }

  pollCoinCollect(): boolean {
    if (this.coinsThisRun > this.coinsAtLastCollect) {
      this.coinsAtLastCollect = this.coinsThisRun;
      return true;
    }
    return false;
  }

  pollFuelCollect(): boolean {
    if (this.fuelAtLastCollect) {
      this.fuelAtLastCollect = false;
      return true;
    }
    return false;
  }

  pollBonusEvents(): BonusEvent[] {
    const queued = this.bonusQueue;
    this.bonusQueue = [];
    return queued;
  }

  private spawnVehicle() {
    const { Bodies, Composite, Constraint } = this.Matter;
    const vehicle = getVehicleById(this.vehicleId);
    const stage = getStageById(this.stageId);

    const w = vehicle.base.chassisWidth;
    const h = vehicle.base.chassisHeight;
    const r = vehicle.base.wheelRadius * this.wheelRadiusScale;
    const archetype = vehicle.archetype;
    const wheelOffsets = this.getWheelOffsets(archetype, w, h);

    const surfaceY = surfaceYAt(this.startX, stage, this.seed);
    const maxWheelDown = Math.max(...wheelOffsets.map((o) => o.y));
    const y = surfaceY - r - maxWheelDown;

    const arch = this.suspensionArch(archetype);
    const vehicleFilter = { category: VEHICLE_CATEGORY, mask: 0xffff };
    this.chassis = Bodies.rectangle(this.startX, y, w, h, {
      density: arch.chassisDensity * vehicle.base.mass,
      friction: 0.35,
      frictionAir: 0.012,
      label: "chassis",
      collisionFilter: vehicleFilter,
    });

    this.headSensor = Bodies.circle(this.startX, y - h * 0.55, HEAD_RADIUS, {
      isSensor: true,
      label: "head",
      collisionFilter: { category: VEHICLE_CATEGORY, mask: 0x0001 },
    });
    const headLink = Constraint.create({
      bodyA: this.chassis,
      pointA: { x: 0, y: -h * 0.55 },
      bodyB: this.headSensor,
      stiffness: 1,
      length: 0,
    });
    Composite.add(this.world, [this.headSensor, headLink]);

    const wheelOpts = {
      friction: Math.min(1.2, this.stats.grip * stage.groundFriction),
      frictionAir: 0.015,
      density: arch.wheelDensity * vehicle.base.mass,
      restitution: WHEEL_RESTITUTION,
      label: "wheel",
      collisionFilter: vehicleFilter,
    };

    this.wheels = [];
    this.constraints = [];

    for (const off of wheelOffsets) {
      const wheel = Bodies.circle(this.startX + off.x, y + off.y, r, wheelOpts);
      this.wheels.push(wheel);
      const restLen = SUSPENSION_LENGTH_BASE * arch.length + r * 0.15;
      const stiff = Math.min(
        0.94,
        SUSPENSION_STIFFNESS_BASE * arch.stiff * (0.65 + this.stats.suspension * 0.35)
      );
      const damp =
        SUSPENSION_DAMPING_BASE * arch.damp * (0.7 + (1 - Math.min(1, this.stats.suspension)) * 0.5);
      this.constraints.push(
        Constraint.create({
          bodyA: this.chassis,
          pointA: { x: off.x, y: off.y },
          bodyB: wheel,
          stiffness: stiff,
          damping: damp,
          length: restLen,
        })
      );
      this.suspensionRestLengths.push(restLen);
    }

    Composite.add(this.world, [this.chassis, ...this.wheels, ...this.constraints]);
  }

  private getWheelOffsets(archetype: string, w: number, h: number) {
    if (archetype === "car4" || archetype === "tank") {
      return [
        { x: -w * 0.35, y: h * 0.45 },
        { x: -w * 0.12, y: h * 0.45 },
        { x: w * 0.12, y: h * 0.45 },
        { x: w * 0.35, y: h * 0.45 },
      ];
    }
    if (archetype === "bike") {
      return [
        { x: 0, y: h * 0.5 },
        { x: -w * 0.35, y: h * 0.45 },
      ];
    }
    return [
      { x: -w * 0.32, y: h * 0.45 },
      { x: w * 0.32, y: h * 0.45 },
    ];
  }

  private setupCollisionHandler() {
    const { Events } = this.Matter;
    this.collisionHandler = (ev: IEventCollision<Engine>) => {
      if (!this.alive) return;
      for (const pair of ev.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (
          labels.includes("head") &&
          (labels.includes("terrain") || labels.includes("hazard") || labels.includes("lava"))
        ) {
          const stage = getStageById(this.stageId);
          const groundY = surfaceYAt(this.headSensor.position.x, stage, this.seed);
          const headBottom = this.headSensor.position.y + HEAD_RADIUS;
          const hitGround = labels.includes("terrain") && headBottom >= groundY - 8;
          const hitHazard = labels.includes("hazard") || labels.includes("lava");
          if (hitGround || hitHazard) this.endRun("crash");
        }
        if (labels.includes("lava")) {
          const other = pair.bodyA.label === "lava" ? pair.bodyB : pair.bodyA;
          if (other === this.chassis || this.wheels.includes(other)) {
            this.endRun("crash");
          }
        }
        const pickup = this.pickups.find(
          (p) => !p.collected && (p.body === pair.bodyA || p.body === pair.bodyB)
        );
        if (
          pickup &&
          (pair.bodyA === this.chassis ||
            pair.bodyB === this.chassis ||
            this.wheels.some((wh) => wh === pair.bodyA || wh === pair.bodyB))
        ) {
          this.collectPickup(pickup);
        }
      }
    };
    Events.on(this.engine, "collisionStart", this.collisionHandler);
  }

  private setupWheelContactHandlers() {
    const { Events } = this.Matter;
    const markTouch = (bodyA: Body, bodyB: Body) => {
      if (bodyA.label === "wheel" && bodyB.label === "terrain") {
        this.wheelsTouchingTerrain.add(bodyA);
      }
      if (bodyB.label === "wheel" && bodyA.label === "terrain") {
        this.wheelsTouchingTerrain.add(bodyB);
      }
    };
    const markSep = (bodyA: Body, bodyB: Body) => {
      if (bodyA.label === "wheel" && bodyB.label === "terrain") {
        this.wheelsTouchingTerrain.delete(bodyA);
      }
      if (bodyB.label === "wheel" && bodyA.label === "terrain") {
        this.wheelsTouchingTerrain.delete(bodyB);
      }
    };
    this.wheelTouchHandler = (ev) => {
      for (const pair of ev.pairs) {
        markTouch(pair.bodyA, pair.bodyB);
      }
    };
    this.wheelSepHandler = (ev) => {
      for (const pair of ev.pairs) {
        markSep(pair.bodyA, pair.bodyB);
      }
    };
    Events.on(this.engine, "collisionStart", this.wheelTouchHandler);
    Events.on(this.engine, "collisionActive", this.wheelTouchHandler);
    Events.on(this.engine, "collisionEnd", this.wheelSepHandler);
  }

  private collectPickup(pickup: PickupEntity) {
    pickup.collected = true;
    const { x, y } = pickup.body.position;
    const until = performance.now() + 160;
    this.collectFx.push({
      x,
      y,
      kind: pickup.kind,
      until,
      value: pickup.kind === "coin" ? pickup.value : undefined,
    });
    this.Matter.Composite.remove(this.world, pickup.body);
    if (pickup.kind === "coin") this.coinsThisRun += pickup.value;
    if (pickup.kind === "fuel") {
      this.fuel = this.fuelMax;
      this.fuelEmpty = false;
      this.coastStillTime = 0;
      this.fuelAtLastCollect = true;
      if (pickup.fuelIndex != null) this.collectedFuel.add(pickup.fuelIndex);
    }
    if (pickup.kind === "diamond") this.diamondsThisRun += pickup.value;
  }

  private grantBonus(kind: BonusKind, coins: number, count: number) {
    if (coins <= 0 || count <= 0) return;
    this.coinsThisRun += coins;
    this.bonusTotals[kind] += coins;
    this.bonusQueue.push({ kind, coins, count });
  }

  private resolveAirBonuses() {
    const delta = this.chassis.angle - this.airStartAngle;
    const turns = delta / (Math.PI * 2);
    const front = Math.floor(turns + 1e-4);
    const back = Math.floor(-turns + 1e-4);

    if (this.airTime >= 1) {
      const seconds = Math.max(1, Math.floor(this.airTime));
      this.grantBonus("airTime", AIR_TIME_COIN * seconds, seconds);
    }

    const flips = Math.max(0, front) + Math.max(0, back);
    if (flips <= 0) return;

    const stage = getStageById(this.stageId);
    const groundY = surfaceYAt(this.headSensor.position.x, stage, this.seed);
    const gap = groundY - (this.headSensor.position.y + HEAD_RADIUS);
    const neck = gap < NECK_GAP_PX && gap > -6;
    if (neck) {
      this.grantBonus("neckFlip", NECKFLIP_COIN * flips, flips);
      return;
    }
    if (back >= front && back > 0) this.grantBonus("backflip", BACKFLIP_COIN * back, back);
    else if (front > 0) this.grantBonus("frontflip", FRONTFLIP_COIN * front, front);
  }

  private endRun(reason: "fuel" | "crash") {
    if (!this.alive) return;
    this.alive = false;
    this.gameOverReason = reason;
    if (reason === "crash") this.spawnRagdoll();
  }

  private spawnRagdoll() {
    const { Bodies, Composite, Constraint, Body } = this.Matter;
    const vehicle = getVehicleById(this.vehicleId);
    const ang = this.chassis.angle;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const localX = vehicle.archetype === "bike" ? -vehicle.base.chassisWidth * 0.05 : vehicle.base.chassisWidth * 0.02;
    const localY = -vehicle.base.chassisHeight * 0.55;
    const originX = this.chassis.position.x + localX * cos - localY * sin;
    const originY = this.chassis.position.y + localX * sin + localY * cos;
    const vx = this.chassis.velocity.x;
    const vy = this.chassis.velocity.y - 2;

    const filter = { group: -1, category: RAGDOLL_CATEGORY, mask: 0x0001 };
    const opts = {
      friction: 0.4,
      frictionAir: 0.01,
      restitution: 0.15,
      label: "ragdoll",
      collisionFilter: filter,
      density: 0.0015,
    };

    const head = Bodies.circle(originX, originY - 8, 8, opts);
    const torso = Bodies.rectangle(originX, originY + 8, 14, 18, opts);
    const armL = Bodies.rectangle(originX - 12, originY + 6, 6, 16, opts);
    const armR = Bodies.rectangle(originX + 12, originY + 6, 6, 16, opts);
    const legL = Bodies.rectangle(originX - 5, originY + 24, 6, 16, opts);
    const legR = Bodies.rectangle(originX + 5, originY + 24, 6, 16, opts);
    const parts: { body: Body; kind: RagdollPartRender["kind"]; w: number; h: number }[] = [
      { body: head, kind: "head", w: 16, h: 16 },
      { body: torso, kind: "torso", w: 14, h: 18 },
      { body: armL, kind: "limb", w: 6, h: 16 },
      { body: armR, kind: "limb", w: 6, h: 16 },
      { body: legL, kind: "limb", w: 6, h: 16 },
      { body: legR, kind: "limb", w: 6, h: 16 },
    ];
    const links = [
      Constraint.create({ bodyA: head, bodyB: torso, stiffness: 0.25, damping: 0.06, length: 16 }),
      Constraint.create({ bodyA: torso, bodyB: armL, stiffness: 0.15, damping: 0.05, length: 12 }),
      Constraint.create({ bodyA: torso, bodyB: armR, stiffness: 0.15, damping: 0.05, length: 12 }),
      Constraint.create({ bodyA: torso, bodyB: legL, stiffness: 0.18, damping: 0.05, length: 16 }),
      Constraint.create({ bodyA: torso, bodyB: legR, stiffness: 0.18, damping: 0.05, length: 16 }),
    ];
    for (const part of parts) {
      Body.setVelocity(part.body, { x: vx + (Math.random() - 0.5) * 3, y: vy });
      Body.setAngularVelocity(part.body, (Math.random() - 0.5) * 0.4);
    }
    Composite.add(
      this.world,
      parts.map((p) => p.body)
    );
    Composite.add(this.world, links);
    this.ragdoll = parts;
  }

  private ensureChunksAround(chunkIndex: number) {
    const needed = new Set([chunkIndex - 1, chunkIndex, chunkIndex + 1, chunkIndex + 2]);
    for (const idx of needed) {
      if (this.chunks.some((c) => c.index === idx)) continue;
      this.spawnChunk(idx);
    }
    const minIdx = chunkIndex - 2;
    const minX = minIdx * CHUNK_WIDTH;
    this.chunks = this.chunks.filter((c) => {
      if (c.index < minIdx) {
        for (const b of c.bodies) this.Matter.Composite.remove(this.world, b);
        return false;
      }
      return true;
    });
    const dropFar = (body: Body) => body.position.x < minX;
    this.pickups = this.pickups.filter((p) => {
      if (p.collected) return false;
      if (dropFar(p.body)) {
        this.Matter.Composite.remove(this.world, p.body);
        return false;
      }
      return true;
    });
    this.hazards = this.hazards.filter((h) => {
      if (dropFar(h.body)) {
        this.Matter.Composite.remove(this.world, h.body);
        return false;
      }
      return true;
    });
  }

  private spawnChunk(index: number) {
    const { Composite } = this.Matter;
    const stage = getStageById(this.stageId);
    const top = buildChunkSurfacePoints(index, stage, this.seed);
    const segmentOpts = {
      friction: stage.groundFriction,
      frictionStatic: Math.min(1, stage.groundFriction + 0.15),
      label: "terrain",
    };
    const bodies: Body[] = [];
    for (let i = 0; i < top.length - 1; i++) {
      const body = createTerrainSegmentBody(this.Matter, top[i], top[i + 1], GROUND_DEPTH, segmentOpts);
      if (isValidTerrainBody(body)) bodies.push(body);
    }
    Composite.add(this.world, bodies);
    this.chunks.push({ index, bodies });
    this.spawnPickupsForChunk(index, stage);
    this.spawnHazardsForChunk(index, stage);
  }

  private spawnPickupsForChunk(index: number, stage: ReturnType<typeof getStageById>) {
    const { Bodies, Composite } = this.Matter;
    const startX = index * CHUNK_WIDTH + 80;
    const endX = (index + 1) * CHUNK_WIDTH - 40;
    const rng = (x: number) => Math.sin(x * 0.03 + index * 7 + this.seed) * 0.5 + 0.5;

    const placePickup = (px: number, py: number, k: PickupKind, v: number, fuelIndex?: number) => {
      const body = Bodies.circle(px, py, 14, {
        isSensor: true,
        isStatic: true,
        label: `pickup-${k}`,
      });
      Composite.add(this.world, body);
      this.pickups.push({ body, kind: k, value: v, collected: false, fuelIndex });
    };

    for (let i = 0; i < 48; i++) {
      const meters = fuelStationDistanceM(i);
      const x = this.startX + meters / METERS_PER_PIXEL;
      if (x < index * CHUNK_WIDTH || x >= (index + 1) * CHUNK_WIDTH) continue;
      if (this.collectedFuel.has(i)) continue;
      const y = surfaceYAt(x, stage, this.seed) - 46;
      placePickup(x, y, "fuel", 1, i);
    }

    for (let x = startX; x < endX; x += 210 + rng(x) * 70) {
      const distM = (x - this.startX) * METERS_PER_PIXEL;
      if (distM < 40) continue;
      const nearFuel = this.pickups.some(
        (p) => p.kind === "fuel" && Math.abs(p.body.position.x - x) < 70
      );
      if (nearFuel) continue;

      const diamondChance = stage.diamondChance ?? 0.035;
      if (distM > 220 && rng(x + 9) < diamondChance) {
        const sy = surfaceYAt(x, stage, this.seed);
        placePickup(x, sy - 56, "diamond", 1);
        continue;
      }

      const value = coinValueAt(distM);
      const cluster = 5 + Math.floor(rng(x + 4) * 4);
      for (let i = 0; i < cluster; i++) {
        const px = x + i * 24;
        const sy = surfaceYAt(px, stage, this.seed);
        const arc = Math.sin((i / (cluster - 1 || 1)) * Math.PI) * 36;
        placePickup(px, sy - 34 - arc, "coin", value);
      }
    }
  }

  private spawnHazardsForChunk(index: number, stage: ReturnType<typeof getStageById>) {
    const { Bodies, Composite } = this.Matter;
    const startX = index * CHUNK_WIDTH;
    const hazards = stage.hazards;

    const addHazard = (kind: StageHazardKind, x: number, y: number, w: number, h: number) => {
      const body = Bodies.rectangle(x, y, w, h, {
        isStatic: true,
        label: kind === "lava" ? "lava" : "hazard",
        isSensor: kind === "lava",
      });
      Composite.add(this.world, body);
      this.hazards.push({ body, kind });
    };

    if (hazards.includes("ceiling")) {
      for (let x = startX + 200; x < startX + CHUNK_WIDTH - 100; x += 350) {
        const surface = surfaceYAt(x, stage, this.seed);
        addHazard("ceiling", x, surface - 120, 280, 24);
      }
    }
    if (hazards.includes("logs")) {
      for (let x = startX + 180; x < startX + CHUNK_WIDTH; x += 260) {
        const surface = surfaceYAt(x, stage, this.seed);
        addHazard("logs", x, surface - 16, 78, 22);
      }
    }
    if (hazards.includes("lava")) {
      for (let x = startX + 300; x < startX + CHUNK_WIDTH; x += 400) {
        const surface = surfaceYAt(x, stage, this.seed);
        addHazard("lava", x, surface + 25, 120, 40);
      }
    }
    if (hazards.includes("asteroid")) {
      for (let x = startX + 100; x < startX + CHUNK_WIDTH; x += 280) {
        const y = surfaceYAt(x, stage, this.seed) - 180 - (index % 3) * 40;
        addHazard("asteroid", x, y, 36, 36);
      }
    }
  }

  private getDriveWheels(archetype: string): Body[] {
    const fourWd = this.stats.fourWd > 0.05;
    if (archetype === "car4" || archetype === "tank") return this.wheels;
    if (archetype === "bike") return [this.wheels[this.wheels.length - 1]];
    if (archetype === "car2") return this.wheels;
    if (fourWd && this.wheels.length >= 2) return this.wheels;
    return [this.wheels[this.wheels.length - 1]];
  }

  /** Drive force weight for car2 split axle (front vs rear). */
  private car2WheelDriveWeight(wheelIndex: number): number {
    const c = this.constraints[wheelIndex];
    const localX = c?.pointA?.x ?? 0;
    const speed = Math.hypot(this.chassis.velocity.x, this.chassis.velocity.y);
    const speedFade = Math.max(0, 1 - speed / CAR2_FRONT_DRIVE_SPEED_FADE);
    const front =
      CAR2_FRONT_DRIVE_RATIO * speedFade + Math.min(0.28, this.stats.fourWd * CAR2_FOURWD_FRONT_BONUS);
    const rear = 1 - CAR2_FRONT_DRIVE_RATIO * 0.4 * speedFade;
    return localX < -1 ? Math.max(0.12, front) : Math.max(0.55, rear);
  }

  private distanceToNextFuel(): number {
    for (let i = 0; i < 48; i++) {
      if (this.collectedFuel.has(i)) continue;
      const station = fuelStationDistanceM(i);
      if (station > this.distanceM + 1) return station - this.distanceM;
    }
    return 0;
  }

  step(dt: number) {
    const { Body, Engine } = this.Matter;
    const clamped = Math.min(dt, 1 / 30);

    if (this.ragdoll.length > 0) {
      Engine.update(this.engine, clamped * 1000);
      return;
    }
    if (!this.alive) return;

    const vehicle = getVehicleById(this.vehicleId);
    const wheelR = vehicle.base.wheelRadius * this.wheelRadiusScale;
    const stage = getStageById(this.stageId);
    const power = clamp(this.stats.torque / 0.0018, 0.45, 2.4);

    const onGround = this.wheels.some((w) => this.isWheelGrounded(w, stage, wheelR));
    const gas = this.input.gas && !this.fuelEmpty;
    const brake = this.input.brake;

    if (!this.fuelEmpty) {
      const drain = FUEL_DRAIN_PER_SEC + (gas ? FUEL_DRAIN_REV_PER_SEC : 0);
      this.fuel = Math.max(0, this.fuel - drain * clamped);
      if (this.fuel <= 0) {
        this.fuel = 0;
        this.fuelEmpty = true;
      }
    }

    const driveWheelCandidates = this.getDriveWheels(vehicle.archetype);
    let driveWheels = driveWheelCandidates.filter((w) => this.isWheelGrounded(w, stage, wheelR));
    if (gas && driveWheels.length === 0) {
      if (onGround) driveWheels = driveWheelCandidates;
      else driveWheels = driveWheelCandidates.filter((w) => this.isWheelNearSurface(w, stage, wheelR));
    }
    const driveCount = Math.max(1, driveWheels.length);
    const pitch = Math.abs(wrapAngle(this.chassis.angle));
    const wheelieStart =
      vehicle.archetype === "car2" ? WHEELIE_ANGLE_START_RAD_CAR2 : WHEELIE_ANGLE_START_RAD;
    const wheelieMul =
      pitch > wheelieStart
        ? Math.max(WHEELIE_DRIVE_MIN_MUL, 1 - (pitch - wheelieStart) * 1.15)
        : 1;

    const gripCap = this.maxTractionForce(stage, vehicle);

    const driveWeights = driveWheels.map((wheel) => {
      const idx = this.wheels.indexOf(wheel);
      if (vehicle.archetype === "car2" && idx >= 0) return this.car2WheelDriveWeight(idx);
      return 1;
    });
    const weightSum = driveWeights.reduce((s, w) => s + w, 0) || 1;

    let anyReversing = false;

    for (let i = 0; i < driveWheels.length; i++) {
      const wheel = driveWheels[i];
      const driveWeight = driveWeights[i] / weightSum;
      const slope = surfaceAngleAt(wheel.position.x, stage, this.seed);
      const tx = Math.cos(slope);
      const ty = Math.sin(slope);
      const vTangent = wheel.velocity.x * tx + wheel.velocity.y * ty;
      const reversing = brake && !gas && vTangent < REVERSE_SPEED;
      if (reversing) anyReversing = true;

      if (brake && !gas && !reversing) {
        Body.setAngularVelocity(wheel, wheel.angularVelocity * BRAKE_WHEEL_DAMP);
        const slow = Math.min(BRAKE_FORCE_MUL * power, gripCap);
        Body.applyForce(wheel, wheel.position, { x: -tx * slow, y: -ty * slow });
      }

      if (gas || reversing) {
        const dir = gas ? 1 : -1;
        let force = Math.min(DRIVE_ASSIST * power * wheelieMul * driveWeight, gripCap);
        if (onGround && gas) force = Math.max(force, (MIN_GROUNDED_DRIVE_FORCE * driveWeight) / driveCount);
        if (reversing) force *= REVERSE_DRIVE_MUL;
        Body.applyForce(wheel, wheel.position, { x: tx * force * dir, y: ty * force * dir });
      }
    }

    if (anyReversing && onGround && vehicle.archetype === "car2") {
      Body.setAngularVelocity(
        this.chassis,
        this.chassis.angularVelocity + REVERSE_NOSE_DOWN * clamped
      );
    }

    const airMul = this.stats.midAirControl;
    const maxSpin = 3.2;
    const airGap = surfaceYAt(this.chassis.position.x, stage, this.seed) - this.chassis.position.y;
    const flying = !onGround && airGap > 180;
    const nose = wrapAngle(this.chassis.angle);
    const groundSlope = Math.abs(surfaceAngleAt(this.chassis.position.x, stage, this.seed));
    const slopePitchFactor =
      groundSlope <= GROUND_PITCH_FLAT_SLOPE_RAD
        ? 0
        : Math.min(
            1,
            (groundSlope - GROUND_PITCH_FLAT_SLOPE_RAD) /
              Math.max(0.01, GROUND_PITCH_STEEP_SLOPE_RAD - GROUND_PITCH_FLAT_SLOPE_RAD)
          );

    if (flying) {
      if (gas) {
        const next = this.chassis.angularVelocity - AIR_TORQUE_GAS * airMul * clamped;
        Body.setAngularVelocity(this.chassis, Math.max(-maxSpin, next));
      } else if (brake) {
        const next = this.chassis.angularVelocity + AIR_TORQUE_BRAKE * airMul * clamped;
        Body.setAngularVelocity(this.chassis, Math.min(maxSpin, next));
      }
    } else if (onGround && nose > -1.0 && nose < 0.85 && slopePitchFactor > 0) {
      const tip = GROUND_PITCH_GAS_MAX * slopePitchFactor * clamped;
      if (gas) Body.setAngularVelocity(this.chassis, this.chassis.angularVelocity - tip);
      if (brake)
        Body.setAngularVelocity(
          this.chassis,
          this.chassis.angularVelocity + tip * GROUND_PITCH_BRAKE_MUL
        );
    } else if (!flying && Math.abs(this.chassis.angularVelocity) > 0.85) {
      Body.setAngularVelocity(this.chassis, Math.sign(this.chassis.angularVelocity) * 0.85);
    }

    if (!onGround) {
      if (!this.wasAirborne) {
        this.wasAirborne = true;
        this.airStartAngle = this.chassis.angle;
        this.airTime = 0;
      }
      this.airTime += clamped;
    } else if (this.wasAirborne) {
      this.resolveAirBonuses();
      this.wasAirborne = false;
      this.airTime = 0;
    }

    if (vehicle.archetype === "hover" && !this.fuelEmpty) {
      Body.applyForce(this.chassis, this.chassis.position, {
        x: 0,
        y: -0.0025 * (1 + this.stats.downforce) * 40,
      });
    }
    if (vehicle.archetype === "rocket" && gas) {
      const thrust = 0.0025;
      Body.applyForce(this.chassis, this.chassis.position, {
        x: Math.cos(this.chassis.angle - Math.PI / 2) * thrust,
        y: Math.sin(this.chassis.angle - Math.PI / 2) * thrust,
      });
    }

    if (this.fuelEmpty) {
      const drag = Math.max(0, 1 - 0.55 * clamped);
      Body.setVelocity(this.chassis, { x: this.chassis.velocity.x * drag, y: this.chassis.velocity.y });
    }

    const angleBefore = this.chassis.angle;
    Engine.update(this.engine, clamped * 1000);

    const noseBefore = wrapAngle(angleBefore);
    const flatGround = groundSlope <= GROUND_PITCH_FLAT_SLOPE_RAD;
    let maxAngleStep = flying ? 0.12 : flatGround ? 0.038 : 0.024;
    const angleDelta = this.chassis.angle - angleBefore;
    if (!flying && noseBefore < -0.95 && angleDelta < 0) maxAngleStep = 0.004;
    if (!flying && noseBefore > 0.85 && angleDelta > 0) maxAngleStep = 0.004;
    if (Math.abs(angleDelta) > maxAngleStep) {
      const sign = Math.sign(angleDelta) || 1;
      Body.setAngle(this.chassis, angleBefore + sign * maxAngleStep);
      Body.setAngularVelocity(this.chassis, flying ? sign * 2.2 : 0);
    }

    if (onGround && !this.prevOnGround && this.chassis.velocity.y > 5) {
      this.landingImpactStrength = Math.min(1, (this.chassis.velocity.y - 5) / 12);
    }
    this.prevOnGround = onGround;

    const cx = this.chassis.position.x;
    this.distanceM = Math.max(0, (cx - this.startX) * METERS_PER_PIXEL);
    this.ensureChunksAround(Math.floor(cx / CHUNK_WIDTH));

    if (this.fuelEmpty) {
      const speed = Math.hypot(this.chassis.velocity.x, this.chassis.velocity.y);
      if (speed < COAST_STOP_SPEED) this.coastStillTime += clamped;
      else this.coastStillTime = 0;
      if (this.coastStillTime >= COAST_STOP_SEC) this.endRun("fuel");
    }
  }

  getSnapshot(): RunSnapshot {
    const rpm = Math.min(1, this.wheels.reduce((s, w) => s + Math.abs(w.angularVelocity), 0) / (this.wheels.length * 28));
    const speedKmh = Math.hypot(this.chassis.velocity.x, this.chassis.velocity.y) * METERS_PER_PIXEL * 3.6;
    return {
      distanceM: this.distanceM,
      fuel: this.fuel,
      fuelMax: this.fuelMax,
      rpm,
      speedKmh,
      coinsThisRun: this.coinsThisRun,
      diamondsThisRun: this.diamondsThisRun,
      distanceToNextFuelM: this.distanceToNextFuel(),
      bonusTotals: { ...this.bonusTotals },
      alive: this.alive,
      gameOverReason: this.gameOverReason,
    };
  }

  getCameraX(viewWidth: number): number {
    const vx = this.chassis.velocity.x;
    const dir = vx >= 0 ? 1 : -1;
    const speed = Math.abs(vx);
    const look =
      CAMERA_LOOKAHEAD_BASE +
      speed * CAMERA_LOOKAHEAD +
      dir * (speed > 40 ? CAMERA_LOOKAHEAD_MAX - CAMERA_LOOKAHEAD_BASE : 0);
    const clamped = Math.max(CAMERA_LOOKAHEAD_MIN, Math.min(CAMERA_LOOKAHEAD_MAX, Math.abs(look))) * dir;
    return this.chassis.position.x - viewWidth * CAMERA_X_BIAS + clamped;
  }

  getCameraY(viewHeight: number): number {
    const stage = getStageById(this.stageId);
    const ground = surfaceYAt(this.chassis.position.x, stage, this.seed);
    const air = Math.max(0, ground - this.chassis.position.y);
    return this.chassis.position.y - viewHeight * CAMERA_Y_BIAS - air * CAMERA_AIR_LIFT;
  }

  /** 1 = normal, lower = zoomed out at speed or in the air */
  getZoom(): number {
    const stage = getStageById(this.stageId);
    const speed = Math.hypot(this.chassis.velocity.x, this.chassis.velocity.y);
    const ground = surfaceYAt(this.chassis.position.x, stage, this.seed);
    const air = Math.max(0, ground - this.chassis.position.y);
    const zoom = 1 - Math.max(0, speed - 140) / 2200 - Math.max(0, air - 40) / 900;
    return clamp(zoom, 0.82, 1);
  }

  getSuspensionCompression(): number[] {
    const { Vector } = this.Matter;
    const out: number[] = [];
    for (let i = 0; i < this.wheels.length; i++) {
      const wheel = this.wheels[i];
      const c = this.constraints[i];
      if (!wheel || !c) {
        out.push(0);
        continue;
      }
      const anchor = Vector.add(this.chassis.position, Vector.rotate(c.pointA as { x: number; y: number }, this.chassis.angle));
      const dist = Vector.magnitude(Vector.sub(wheel.position, anchor));
      const rest = this.suspensionRestLengths[i] ?? c.length ?? 1;
      out.push(clamp((rest - dist) / Math.max(1, rest), 0, 1));
    }
    return out;
  }

  getVisualState(gasDown: boolean): VehicleVisualState {
    const stage = getStageById(this.stageId);
    const ground = surfaceYAt(this.chassis.position.x, stage, this.seed);
    const airborne = Math.max(0, ground - this.chassis.position.y);
    return {
      upgradeLevels: this.upgradeLevels,
      compression: this.getSuspensionCompression(),
      gasDown,
      airborne,
    };
  }

  isDriveWheelGrounded(): boolean {
    const stage = getStageById(this.stageId);
    const vehicle = getVehicleById(this.vehicleId);
    const wheelR = vehicle.base.wheelRadius * this.wheelRadiusScale;
    const drives = this.getDriveWheels(vehicle.archetype);
    return drives.some((w) => this.isWheelGrounded(w, stage, wheelR));
  }

  getChassisVelocity() {
    return { x: this.chassis.velocity.x, y: this.chassis.velocity.y };
  }

  getChassisPosition() {
    return {
      x: this.chassis.position.x,
      y: this.chassis.position.y,
      angle: this.chassis.angle,
      angularVelocity: this.chassis.angularVelocity,
    };
  }

  getWheelRenderState(): WheelRender[] {
    const r = getVehicleById(this.vehicleId).base.wheelRadius * this.wheelRadiusScale;
    return this.wheels.map((w) => ({
      x: w.position.x,
      y: w.position.y,
      angle: w.angle,
      r,
      speed: Math.hypot(w.velocity.x, w.velocity.y),
    }));
  }

  getRagdollRender(): RagdollPartRender[] {
    return this.ragdoll.map((part) => ({
      kind: part.kind,
      x: part.body.position.x,
      y: part.body.position.y,
      angle: part.body.angle,
      w: part.w,
      h: part.h,
    }));
  }

  getHazardsForRender(): HazardRender[] {
    return this.hazards.map((h) => {
      const b = h.body.bounds;
      return {
        kind: h.kind,
        x: (b.min.x + b.max.x) / 2,
        y: (b.min.y + b.max.y) / 2,
        w: b.max.x - b.min.x,
        h: b.max.y - b.min.y,
      };
    });
  }

  getPickups() {
    return this.pickups.filter((p) => !p.collected);
  }

  getCollectFx(now: number) {
    this.collectFx = this.collectFx.filter((f) => f.until > now);
    return this.collectFx.map((f) => ({
      x: f.x,
      y: f.y,
      kind: f.kind,
      t: (f.until - now) / 160,
      value: f.value,
    }));
  }

  /** 0–1 impact strength for landing shake; consumed once per poll */
  pollLandingImpact(): number {
    const s = this.landingImpactStrength;
    this.landingImpactStrength = 0;
    return s;
  }

  destroy() {
    const { Engine, World, Events } = this.Matter;
    if (this.collisionHandler) {
      Events.off(this.engine, "collisionStart", this.collisionHandler);
    }
    if (this.wheelTouchHandler) {
      Events.off(this.engine, "collisionStart", this.wheelTouchHandler);
      Events.off(this.engine, "collisionActive", this.wheelTouchHandler);
    }
    if (this.wheelSepHandler) {
      Events.off(this.engine, "collisionEnd", this.wheelSepHandler);
    }
    this.wheelsTouchingTerrain.clear();
    World.clear(this.world, false);
    Engine.clear(this.engine);
    this.chunks = [];
    this.pickups = [];
    this.hazards = [];
    this.ragdoll = [];
  }
}
