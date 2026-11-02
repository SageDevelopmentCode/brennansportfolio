/**
 * Balance targets: stock countryside jeep climbs the hills, wheelies without
 * looping on the first throttle tap, and reaches about 400–600 m before the
 * first tank runs dry (~25–30 s). Fuel cans then stretch that out.
 *
 * Terrain: SAMPLE_STEP=12 → segment trapezoids per 1200px chunk (see terrain.ts).
 */
/** World scale: pixels traveled → meters on HUD */
export const METERS_PER_PIXEL = 1 / 50;

/** Matter gravity multiplier before stage.gravity */
export const BASE_GRAVITY = 1.05;

/** Steady fuel drain per second, gas or not. 100 / 3.4 ≈ 29 s. */
export const FUEL_DRAIN_PER_SEC = 3.4;

/** Extra drain per second while the gas pedal is down */
export const FUEL_DRAIN_REV_PER_SEC = 0.45;

/** First fuel can, then each gap grows (meters along the run) */
export const FUEL_FIRST_M = 150;
export const FUEL_GAP_START_M = 190;
export const FUEL_GAP_GROW_M = 40;

/** Coast until slower than this (px/s) for COAST_STOP_SEC → Out of Fuel */
export const COAST_STOP_SPEED = 28;
export const COAST_STOP_SEC = 1.5;

/** Wheel motor: target spin (rad/s) and how fast spin can change (rad/s²) */
export const MOTOR_TARGET_OMEGA = 6;
export const MOTOR_ACCEL = 8;

/**
 * Chassis reaction to wheel spin-up. Positive wheel spin (clockwise, drive
 * forward) pushes the nose up. This is a small extra on top of the axle
 * constraint so a wheelie builds instead of looping.
 */
export const MOTOR_REACTION = 0;
export const MOTOR_REACTION_CAP = 0;

/** Grip-capped push so hills still climb if contact friction is weak */
export const DRIVE_ASSIST = 0.016;

/** Scales grip × stage friction for max tangential force per wheel */
export const TRACTION_GRIP_MUL = 1.0;

/** Converts vehicle mass + gravity into Matter force units per wheel */
export const TRACTION_NORMAL_SCALE = 0.0042;

/** Floor for tangential drive per wheel when onGround + gas (after traction cap) */
export const MIN_GROUNDED_DRIVE_FORCE = 0.01;

/** Slip: reduce grip cap when wheel tangent speed is high */
export const TRACTION_SLIP_SPEED = 14;
export const TRACTION_SLIP_FACTOR = 0.55;

/** Below this forward speed (px/s along the slope), brake drives in reverse */
export const REVERSE_SPEED = 36;

/** Brake: wheel spin decay per frame while still rolling forward */
export const BRAKE_WHEEL_DAMP = 0.82;

/** Brake reverse / slow-down force scale (capped by traction) */
export const BRAKE_FORCE_MUL = 0.008;

/** Reduce drive force as the chassis pitches (radians) so a wheelie does not loop */
export const WHEELIE_ANGLE_START_RAD = 0.62;
/** car2 starts cutting drive earlier so flat gas does not loop */
export const WHEELIE_ANGLE_START_RAD_CAR2 = 0.5;
export const WHEELIE_DRIVE_MIN_MUL = 0.28;

/** Head sensor radius */
export const HEAD_RADIUS = 10;

/** Head-to-ground gap (px) that still counts as a neck flip on landing */
export const NECK_GAP_PX = 40;

/** Fallback analytic ground when no collision contacts yet */
export const WHEEL_GROUND_ABOVE = 10;
export const WHEEL_GROUND_BELOW = 22;
export const WHEEL_GROUND_MAX_VY = 14;

/** Suspension constraint baselines (× stats.suspension × archetype mult) */
export const SUSPENSION_STIFFNESS_BASE = 0.48;
export const SUSPENSION_DAMPING_BASE = 0.08;
export const SUSPENSION_LENGTH_BASE = 4;

export const SUSPENSION_ARCHETYPE = {
  bike: { length: 1.2, stiff: 0.72, damp: 0.92, wheelDensity: 0.0011, chassisDensity: 0.0017 },
  car2: { length: 1.05, stiff: 1.0, damp: 1.18, wheelDensity: 0.0014, chassisDensity: 0.00215 },
  car4: { length: 0.95, stiff: 1.12, damp: 1.08, wheelDensity: 0.0016, chassisDensity: 0.0023 },
  tank: { length: 0.9, stiff: 1.18, damp: 1.12, wheelDensity: 0.0017, chassisDensity: 0.0025 },
  hover: { length: 1.05, stiff: 0.85, damp: 1.0, wheelDensity: 0.0012, chassisDensity: 0.0019 },
  rocket: { length: 1.0, stiff: 0.9, damp: 0.95, wheelDensity: 0.0013, chassisDensity: 0.002 },
  special: { length: 1.0, stiff: 1.0, damp: 1.0, wheelDensity: 0.0014, chassisDensity: 0.002 },
} as const;

export const WHEEL_RESTITUTION = 0.08;

/** Camera: car sits this far across the view (0 = left) */
export const CAMERA_X_BIAS = 0.32;
export const CAMERA_Y_BIAS = 0.58;

/** Base look-ahead in world px (added to velocity-based term) */
export const CAMERA_LOOKAHEAD_BASE = 100;
export const CAMERA_LOOKAHEAD_MIN = 80;
export const CAMERA_LOOKAHEAD_MAX = 140;

/** Camera lookahead: extra pixels per (px/s) horizontal velocity */
export const CAMERA_LOOKAHEAD = 0.08;

/** Client-side camera lerp (0–1 per frame at 60fps) */
export const CAMERA_LERP = 0.14;

/** Max vertical camera step per frame so a wheelie does not throw the hill away */
export const CAMERA_MAX_DY = 14;

/** Pull camera up when airborne (px per px above ground) */
export const CAMERA_AIR_LIFT = 0.35;

/** HUD React commit interval (ms) */
export const HUD_COMMIT_MS = 80;

/** Hold the hill after a crash so the ragdoll can tumble before the summary */
export const GAME_OVER_DELAY_MS = 1100;

/** Screen shake duration on crash (ms) */
export const CRASH_SHAKE_MS = 220;

/**
 * Chassis pitch in air (rad/s²). Gas nose-up, brake nose-down.
 * On ground, pitch is slope-scaled only (zero on flat run-outs).
 */
export const AIR_TORQUE_GAS = 16;
export const AIR_TORQUE_BRAKE = 16;

/** Below this |ground slope| (rad), no gas pitch torque on ground */
export const GROUND_PITCH_FLAT_SLOPE_RAD = 0.12;
/** Slope (rad) at which full ground gas pitch applies */
export const GROUND_PITCH_STEEP_SLOPE_RAD = 0.42;
/** Max nose-up rate on steep ground (rad/s), not applied on flat */
export const GROUND_PITCH_GAS_MAX = 0.16;
export const GROUND_PITCH_BRAKE_MUL = 1.15;

/** car2: front axle drive share (rear gets 1 - this at low speed) */
export const CAR2_FRONT_DRIVE_RATIO = 0.28;
/** Front assist fades out by this speed (px/s) */
export const CAR2_FRONT_DRIVE_SPEED_FADE = 260;
/** Extra front share per 4WD stat point (0–1 scale on stats.fourWd) */
export const CAR2_FOURWD_FRONT_BONUS = 0.22;
export const REVERSE_DRIVE_MUL = 0.62;
/** Nose-down bias while reversing slowly (rad/s) */
export const REVERSE_NOSE_DOWN = 0.35;

export const AIR_TIME_COIN = 50;
export const BACKFLIP_COIN = 100;
export const FRONTFLIP_COIN = 100;
export const NECKFLIP_COIN = 500;

/** Screen shake on hard landing (ms) */
export const LANDING_SHAKE_MS = 120;

/** Dev-only: stroke physics terrain top in draw.ts */
export const DEBUG_DRAW_PHYSICS_SURFACE = false;

/** Distance in meters of fuel can i (0 = first can). */
export function fuelStationDistanceM(index: number): number {
  let distance = FUEL_FIRST_M;
  let gap = FUEL_GAP_START_M;
  for (let i = 0; i < index; i++) {
    distance += gap;
    gap += FUEL_GAP_GROW_M;
  }
  return distance;
}
