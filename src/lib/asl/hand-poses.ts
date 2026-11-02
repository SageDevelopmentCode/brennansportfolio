export type FingerPose = {
  mcp: number;
  pip: number;
  dip: number;
  spread: number;
};

export type HandPose = {
  wrist: { x: number; y: number; z: number };
  thumb: FingerPose;
  index: FingerPose;
  middle: FingerPose;
  ring: FingerPose;
  pinky: FingerPose;
};

const F = (mcp: number, pip: number, dip: number, spread = 0): FingerPose => ({
  mcp,
  pip,
  dip,
  spread,
});

const CURL = 1.45;
const HALF = 0.75;
const HOOK = 1.05;

const OPEN: FingerPose = F(0, 0, 0, 0);

function pose(
  wrist: HandPose["wrist"],
  thumb: FingerPose,
  index: FingerPose,
  middle: FingerPose,
  ring: FingerPose,
  pinky: FingerPose,
): HandPose {
  return { wrist, thumb, index, middle, ring, pinky };
}

/** Relaxed open palm — default rest. */
export const NEUTRAL_POSE: HandPose = pose(
  { x: -0.35, y: 0, z: 0 },
  F(0.35, 0.25, 0.15, -0.45),
  F(0.08, 0.05, 0.02, -0.12),
  F(0.05, 0.03, 0.01, -0.04),
  F(0.06, 0.04, 0.02, 0.04),
  F(0.1, 0.06, 0.03, 0.14),
);

const FIST: FingerPose = F(CURL, CURL * 0.92, CURL * 0.82, 0);
const FIST_TIGHT: FingerPose = F(CURL * 1.05, CURL, CURL * 0.95, 0.02);

/** ASL manual alphabet (approximate 3D teaching poses). */
const LETTER_POSES: Record<string, HandPose> = {
  a: pose(
    { x: -0.4, y: 0.05, z: 0 },
    F(0.55, 0.35, 0.2, -0.65),
    FIST_TIGHT,
    FIST_TIGHT,
    FIST_TIGHT,
    FIST_TIGHT,
  ),
  b: pose(
    { x: -0.32, y: 0, z: 0 },
    F(0.95, 0.55, 0.35, -0.15),
    OPEN,
    OPEN,
    OPEN,
    OPEN,
  ),
  c: pose(
    { x: -0.38, y: 0.08, z: 0.12 },
    F(0.45, 0.35, 0.25, -0.35),
    F(0.55, 0.45, 0.35, -0.08),
    F(0.58, 0.48, 0.38, 0),
    F(0.6, 0.5, 0.4, 0.06),
    F(0.62, 0.52, 0.42, 0.12),
  ),
  d: pose(
    { x: -0.38, y: 0, z: 0 },
    F(0.75, 0.45, 0.25, -0.25),
    OPEN,
    FIST_TIGHT,
    FIST_TIGHT,
    FIST_TIGHT,
  ),
  e: pose(
    { x: -0.42, y: 0.05, z: 0 },
    F(0.85, 0.5, 0.3, -0.1),
    F(HALF, HALF, HALF, -0.04),
    F(HALF, HALF, HALF, 0),
    F(HALF, HALF, HALF, 0.04),
    F(HALF, HALF, HALF, 0.08),
  ),
  f: pose(
    { x: -0.36, y: 0.05, z: 0.05 },
    F(0.35, 0.55, 0.45, -0.55),
    F(0.85, 0.65, 0.45, -0.08),
    OPEN,
    OPEN,
    OPEN,
  ),
  g: pose(
    { x: -0.3, y: -0.35, z: 0.15 },
    F(0.4, 0.35, 0.25, -0.5),
    OPEN,
    FIST,
    FIST,
    FIST,
  ),
  h: pose(
    { x: -0.32, y: -0.25, z: 0.1 },
    F(0.55, 0.35, 0.2, -0.35),
    OPEN,
    OPEN,
    FIST,
    FIST,
  ),
  i: pose(
    { x: -0.4, y: 0.05, z: 0 },
    F(0.55, 0.35, 0.2, -0.55),
    FIST,
    FIST,
    FIST,
    OPEN,
  ),
  j: pose(
    { x: -0.38, y: 0.15, z: 0.25 },
    F(0.55, 0.35, 0.2, -0.55),
    FIST,
    FIST,
    FIST,
    F(HOOK, 0.55, 0.35, 0.18),
  ),
  k: pose(
    { x: -0.34, y: 0.05, z: 0.05 },
    F(0.25, 0.45, 0.35, -0.75),
    OPEN,
    OPEN,
    FIST,
    FIST,
  ),
  l: pose(
    { x: -0.32, y: 0.05, z: 0 },
    F(0.15, 0.25, 0.15, -0.85),
    OPEN,
    FIST,
    FIST,
    FIST,
  ),
  m: pose(
    { x: -0.45, y: 0.12, z: 0 },
    F(0.15, 0.85, 0.65, -0.95),
    FIST_TIGHT,
    FIST_TIGHT,
    FIST_TIGHT,
    FIST,
  ),
  n: pose(
    { x: -0.44, y: 0.1, z: 0 },
    F(0.2, 0.75, 0.55, -0.9),
    FIST_TIGHT,
    FIST_TIGHT,
    FIST,
    FIST,
  ),
  o: pose(
    { x: -0.4, y: 0.1, z: 0.15 },
    F(0.75, 0.65, 0.55, -0.25),
    F(0.95, 0.85, 0.65, -0.02),
    F(0.95, 0.85, 0.65, 0),
    F(0.95, 0.85, 0.65, 0.02),
    F(0.95, 0.85, 0.65, 0.05),
  ),
  p: pose(
    { x: -0.55, y: 0.15, z: 0.35 },
    F(0.25, 0.45, 0.35, -0.75),
    OPEN,
    OPEN,
    FIST,
    FIST,
  ),
  q: pose(
    { x: -0.55, y: -0.2, z: 0.25 },
    F(0.4, 0.35, 0.25, -0.5),
    OPEN,
    FIST,
    FIST,
    FIST,
  ),
  r: pose(
    { x: -0.36, y: 0.05, z: 0.08 },
    F(0.55, 0.35, 0.2, -0.45),
    F(0.35, 0.25, 0.15, -0.06),
    F(0.55, 0.45, 0.3, 0.02),
    FIST,
    FIST,
  ),
  s: pose(
    { x: -0.42, y: 0.05, z: 0 },
    F(0.65, 0.45, 0.25, -0.55),
    FIST_TIGHT,
    FIST_TIGHT,
    FIST_TIGHT,
    FIST_TIGHT,
  ),
  t: pose(
    { x: -0.43, y: 0.08, z: 0 },
    F(0.35, 0.95, 0.55, -0.75),
    FIST_TIGHT,
    FIST_TIGHT,
    FIST_TIGHT,
    FIST_TIGHT,
  ),
  u: pose(
    { x: -0.34, y: 0, z: 0 },
    F(0.75, 0.45, 0.25, -0.25),
    OPEN,
    OPEN,
    FIST,
    FIST,
  ),
  v: pose(
    { x: -0.34, y: 0, z: 0 },
    F(0.75, 0.45, 0.25, -0.25),
    OPEN,
    OPEN,
    FIST,
    FIST,
  ),
  w: pose(
    { x: -0.32, y: 0, z: 0 },
    F(0.75, 0.45, 0.25, -0.2),
    OPEN,
    OPEN,
    OPEN,
    FIST,
  ),
  x: pose(
    { x: -0.38, y: 0.05, z: 0 },
    F(0.65, 0.45, 0.25, -0.45),
    F(HOOK, HOOK * 0.85, HOOK * 0.7, -0.08),
    FIST,
    FIST,
    FIST,
  ),
  y: pose(
    { x: -0.36, y: 0.05, z: 0 },
    F(0.15, 0.25, 0.15, -0.85),
    FIST,
    FIST,
    FIST,
    OPEN,
  ),
  z: pose(
    { x: -0.32, y: -0.15, z: 0.35 },
    F(0.55, 0.35, 0.2, -0.45),
    OPEN,
    FIST,
    FIST,
    FIST,
  ),
};

/** Iconic word signs — reuse letters where close enough. */
const WORD_POSES: Record<string, HandPose> = {
  hello: pose(
    { x: -0.28, y: 0.25, z: -0.15 },
    F(0.35, 0.25, 0.15, -0.45),
    F(0.05, 0.03, 0.01, -0.1),
    F(0.04, 0.02, 0.01, -0.03),
    F(0.05, 0.03, 0.02, 0.05),
    F(0.08, 0.05, 0.03, 0.12),
  ),
  thank_you: LETTER_POSES.b,
  please: LETTER_POSES.b,
  sorry: LETTER_POSES.b,
  yes: LETTER_POSES.s,
  no: pose(
    { x: -0.34, y: 0.05, z: 0.05 },
    F(0.55, 0.35, 0.2, -0.45),
    OPEN,
    OPEN,
    FIST,
    FIST,
  ),
  help: LETTER_POSES.a,
  name: LETTER_POSES.h,
  friend: LETTER_POSES.b,
  family: LETTER_POSES.f,
  love: pose(
    { x: -0.34, y: 0.05, z: 0 },
    F(0.15, 0.25, 0.15, -0.85),
    FIST,
    FIST,
    FIST,
    OPEN,
  ),
  like: LETTER_POSES.b,
  want: LETTER_POSES.b,
  need: LETTER_POSES.x,
  go: LETTER_POSES.g,
  come: LETTER_POSES.b,
  stop: LETTER_POSES.b,
  wait: LETTER_POSES.b,
  eat: LETTER_POSES.o,
  drink: LETTER_POSES.c,
  water: LETTER_POSES.w,
  food: LETTER_POSES.o,
  home: LETTER_POSES.h,
  school: LETTER_POSES.b,
  work: LETTER_POSES.w,
  teacher: LETTER_POSES.l,
  student: LETTER_POSES.b,
  learn: LETTER_POSES.l,
  read: LETTER_POSES.v,
  write: LETTER_POSES.b,
  talk: LETTER_POSES.l,
  hear: LETTER_POSES.c,
  deaf: LETTER_POSES.i,
  happy: LETTER_POSES.h,
  sad: LETTER_POSES.b,
  angry: LETTER_POSES.b,
  tired: LETTER_POSES.b,
  good: LETTER_POSES.g,
  bad: LETTER_POSES.b,
  morning: LETTER_POSES.b,
  night: LETTER_POSES.b,
  today: LETTER_POSES.y,
  tomorrow: LETTER_POSES.b,
  yesterday: LETTER_POSES.b,
  where: LETTER_POSES.b,
  what: LETTER_POSES.w,
  who: LETTER_POSES.l,
  why: LETTER_POSES.b,
  how: LETTER_POSES.b,
  when: LETTER_POSES.b,
  bathroom: LETTER_POSES.t,
  doctor: LETTER_POSES.d,
  mother: LETTER_POSES.m,
  father: LETTER_POSES.f,
  boy: LETTER_POSES.b,
  girl: LETTER_POSES.b,
  man: LETTER_POSES.m,
  woman: LETTER_POSES.w,
  child: LETTER_POSES.c,
  baby: LETTER_POSES.b,
  dog: LETTER_POSES.d,
  cat: LETTER_POSES.c,
  understand: LETTER_POSES.v,
  know: LETTER_POSES.b,
  fine: LETTER_POSES.f,
  ok: LETTER_POSES.o,
  open: NEUTRAL_POSE,
};

const ALL_POSES: Record<string, HandPose> = {
  neutral: NEUTRAL_POSE,
  ...LETTER_POSES,
  ...WORD_POSES,
};

export function getHandPose(poseId: string): HandPose {
  const key = poseId.toLowerCase();
  return ALL_POSES[key] ?? NEUTRAL_POSE;
}

export function resolvePoseIdForToken(poseId: string, kind: "word" | "letter"): string {
  const key = poseId.toLowerCase();
  if (kind === "letter" && LETTER_POSES[key]) return key;
  if (kind === "word" && (WORD_POSES[key] || LETTER_POSES[key])) return key;
  if (LETTER_POSES[key]) return key;
  return "neutral";
}
