import type { Direction, Position } from "@/lib/snake";

const SNAKE_BASE = "#c9956a";
const SNAKE_DARK = "#4a3728";
const SNAKE_OUTLINE = "#3d2914";
const SNAKE_BELLY = "#e8d4b0";
const SNAKE_LIGHT = "#d4a574";

function rotationFromPositions(from: Position, to: Position): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 0 && dy === 0) {
    return 0;
  }

  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function directionRotation(direction: Direction): number {
  switch (direction) {
    case "right":
      return 0;
    case "down":
      return 90;
    case "left":
      return 180;
    case "up":
      return -90;
  }
}

type SpriteProps = {
  className?: string;
};

function DiamondMark({
  cx,
  cy,
  size,
  fill = SNAKE_DARK,
}: {
  cx: number;
  cy: number;
  size: number;
  fill?: string;
}) {
  return (
    <polygon
      points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
      fill={fill}
    />
  );
}

export function SnakeHeadSvg({
  direction,
  className = "",
}: SpriteProps & { direction: Direction }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`h-full w-full ${className}`}
      aria-hidden
    >
      <g transform={`rotate(${directionRotation(direction)} 50 50)`}>
        <ellipse
          cx="48"
          cy="50"
          rx="44"
          ry="11"
          fill={SNAKE_BASE}
          stroke={SNAKE_OUTLINE}
          strokeWidth="1.5"
        />
        <ellipse cx="46" cy="50" rx="36" ry="7" fill={SNAKE_BELLY} opacity="0.85" />
        <ellipse cx="72" cy="50" rx="14" ry="9" fill={SNAKE_BASE} stroke={SNAKE_OUTLINE} strokeWidth="1.2" />
        <ellipse cx="72" cy="43" rx="4" ry="5" fill="#fbbf24" opacity="0.35" />
        <ellipse cx="72" cy="57" rx="4" ry="5" fill="#fbbf24" opacity="0.35" />
        <ellipse cx="74" cy="43.5" rx="2.5" ry="3.5" fill={SNAKE_OUTLINE} />
        <ellipse cx="74" cy="56.5" rx="2.5" ry="3.5" fill={SNAKE_OUTLINE} />
        <rect x="73.5" y="42" width="0.8" height="3" fill="#fef3c7" />
        <rect x="73.5" y="55" width="0.8" height="3" fill="#fef3c7" />
        <path
          d="M86 50 L94 48 L94 52 L86 50 Z"
          fill="#ef4444"
          stroke={SNAKE_OUTLINE}
          strokeWidth="0.8"
        />
        <path d="M94 50 L99 48.5 M94 50 L99 51.5" stroke="#ef4444" strokeWidth="1" />
        <DiamondMark cx={52} cy={50} size={4} fill={SNAKE_DARK} />
        <DiamondMark cx={62} cy={50} size={3.5} fill={SNAKE_DARK} />
      </g>
    </svg>
  );
}

export function SnakeBodySvg({
  from,
  to,
  segmentIndex,
  className = "",
}: SpriteProps & {
  from: Position;
  current: Position;
  to: Position;
  segmentIndex: number;
}) {
  const rotation = rotationFromPositions(from, to);
  const offset = segmentIndex % 2 === 0 ? 0 : 8;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`h-full w-full ${className}`}
      aria-hidden
    >
      <g transform={`rotate(${rotation} 50 50)`}>
        <ellipse
          cx="50"
          cy="50"
          rx="48"
          ry="10"
          fill={SNAKE_BASE}
          stroke={SNAKE_OUTLINE}
          strokeWidth="1.2"
        />
        <ellipse cx="50" cy="50" rx="40" ry="6" fill={SNAKE_BELLY} opacity="0.8" />
        <DiamondMark cx={34 + offset} cy={50} size={3.5} />
        <DiamondMark cx={50 + offset} cy={50} size={4} />
        <DiamondMark cx={66 - offset} cy={50} size={3.5} />
      </g>
    </svg>
  );
}

export function SnakeTailSvg({
  from,
  current,
  className = "",
}: SpriteProps & { from: Position; current: Position }) {
  const rotation = rotationFromPositions(from, current);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`h-full w-full ${className}`}
      aria-hidden
    >
      <g transform={`rotate(${rotation} 50 50)`}>
        <ellipse
          cx="30"
          cy="50"
          rx="28"
          ry="9"
          fill={SNAKE_BASE}
          stroke={SNAKE_OUTLINE}
          strokeWidth="1.2"
        />
        <ellipse cx="28" cy="50" rx="20" ry="5.5" fill={SNAKE_BELLY} opacity="0.75" />
        <DiamondMark cx={30} cy={50} size={3} />
        <ellipse
          cx="58"
          cy="50"
          rx="10"
          ry="7"
          fill={SNAKE_LIGHT}
          stroke={SNAKE_OUTLINE}
          strokeWidth="0.8"
        />
        <ellipse
          cx="72"
          cy="50"
          rx="8"
          ry="6"
          fill={SNAKE_BASE}
          stroke={SNAKE_OUTLINE}
          strokeWidth="0.8"
        />
        <ellipse
          cx="84"
          cy="50"
          rx="7"
          ry="5"
          fill={SNAKE_LIGHT}
          stroke={SNAKE_OUTLINE}
          strokeWidth="0.8"
        />
        <ellipse
          cx="94"
          cy="50"
          rx="4"
          ry="3.5"
          fill={SNAKE_DARK}
          stroke={SNAKE_OUTLINE}
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}

export function AppleFoodSvg({ className = "" }: SpriteProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`snake-food-sprite h-full w-full ${className}`}
      aria-hidden
    >
      <ellipse cx="50" cy="58" rx="28" ry="30" fill="#dc2626" />
      <ellipse cx="44" cy="50" rx="10" ry="14" fill="#ef4444" opacity="0.55" />
      <ellipse cx="56" cy="62" rx="8" ry="10" fill="#991b1b" opacity="0.35" />
      <path d="M50 30 C48 22, 54 18, 58 24 C54 26, 52 28, 50 30 Z" fill="#22c55e" />
      <path d="M50 30 C50 24, 54 20, 56 26" stroke="#854d0e" strokeWidth="3" fill="none" />
      <circle cx="50" cy="28" r="2" fill="#854d0e" />
    </svg>
  );
}
