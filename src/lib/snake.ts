export const GRID_SIZE = 25;
export const TICK_MS = 200;
export const HIGH_SCORE_STORAGE_KEY = "snake-high-score";

export type Direction = "up" | "down" | "left" | "right";

export type Position = {
  x: number;
  y: number;
};

export type SnakeGameState = {
  snake: Position[];
  direction: Direction;
  food: Position;
  score: number;
  gameOver: boolean;
};

const DIRECTION_DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function isBorder(x: number, y: number): boolean {
  return (
    x === 0 ||
    y === 0 ||
    x === GRID_SIZE - 1 ||
    y === GRID_SIZE - 1
  );
}

export function isInterior(x: number, y: number): boolean {
  return !isBorder(x, y);
}

export type BorderWallSide = "top" | "right" | "bottom" | "left";

export function getBorderWallSides(x: number, y: number): BorderWallSide[] {
  if (!isBorder(x, y)) {
    return [];
  }

  const sides: BorderWallSide[] = [];

  if (y === 0) {
    sides.push("top");
  }
  if (x === GRID_SIZE - 1) {
    sides.push("right");
  }
  if (y === GRID_SIZE - 1) {
    sides.push("bottom");
  }
  if (x === 0) {
    sides.push("left");
  }

  return sides;
}

function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function snakeOccupies(snake: Position[], pos: Position): boolean {
  return snake.some((segment) => positionsEqual(segment, pos));
}

export function spawnFood(snake: Position[]): Position {
  const emptyCells: Position[] = [];

  for (let y = 1; y < GRID_SIZE - 1; y++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      const cell = { x, y };
      if (!snakeOccupies(snake, cell)) {
        emptyCells.push(cell);
      }
    }
  }

  if (emptyCells.length === 0) {
    return { x: 1, y: 1 };
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

export function createInitialState(): SnakeGameState {
  const centerY = Math.floor(GRID_SIZE / 2);
  const centerX = Math.floor(GRID_SIZE / 2);

  const snake: Position[] = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ];

  return {
    snake,
    direction: "right",
    food: spawnFood(snake),
    score: 0,
    gameOver: false,
  };
}

export function resolveDirection(
  current: Direction,
  next: Direction
): Direction {
  if (OPPOSITE[current] === next) {
    return current;
  }
  return next;
}

export function tick(
  state: SnakeGameState,
  nextDirection: Direction
): SnakeGameState {
  if (state.gameOver) {
    return state;
  }

  const direction = resolveDirection(state.direction, nextDirection);
  const head = state.snake[0];
  const delta = DIRECTION_DELTA[direction];
  const newHead = { x: head.x + delta.x, y: head.y + delta.y };

  if (isBorder(newHead.x, newHead.y)) {
    return { ...state, direction, gameOver: true };
  }

  const ateFood = positionsEqual(newHead, state.food);
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);

  if (snakeOccupies(bodyToCheck, newHead)) {
    return { ...state, direction, gameOver: true };
  }

  const snake = [newHead, ...state.snake];
  if (!ateFood) {
    snake.pop();
  }

  const score = ateFood ? state.score + 1 : state.score;
  const food = ateFood ? spawnFood(snake) : state.food;

  return {
    snake,
    direction,
    food,
    score,
    gameOver: false,
  };
}

export type CellKind = "border" | "empty" | "snake" | "head" | "food";

export type SnakeSegmentRole = "head" | "body" | "tail";

export type SnakeSegmentInfo = {
  role: SnakeSegmentRole;
  index: number;
  direction?: Direction;
  from?: Position;
  to?: Position;
};

export function getSnakeSegmentIndex(
  state: SnakeGameState,
  x: number,
  y: number
): number {
  return state.snake.findIndex((segment) => positionsEqual(segment, { x, y }));
}

export function getSnakeSegmentInfo(
  state: SnakeGameState,
  x: number,
  y: number
): SnakeSegmentInfo | null {
  const index = getSnakeSegmentIndex(state, x, y);
  if (index === -1) {
    return null;
  }

  const current = state.snake[index];
  const isHead = index === 0;
  const isTail = index === state.snake.length - 1;

  if (isHead) {
    return {
      role: "head",
      index,
      direction: state.direction,
      from: state.snake[1],
    };
  }

  if (isTail) {
    return {
      role: "tail",
      index,
      from: state.snake[index - 1],
      to: current,
    };
  }

  return {
    role: "body",
    index,
    from: state.snake[index - 1],
    to: state.snake[index + 1],
  };
}

export function getCellKind(
  state: SnakeGameState,
  x: number,
  y: number
): CellKind {
  if (isBorder(x, y)) {
    return "border";
  }

  if (positionsEqual(state.food, { x, y })) {
    return "food";
  }

  if (positionsEqual(state.snake[0], { x, y })) {
    return "head";
  }

  if (state.snake.slice(1).some((segment) => positionsEqual(segment, { x, y }))) {
    return "snake";
  }

  return "empty";
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

export function directionFromKey(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}
