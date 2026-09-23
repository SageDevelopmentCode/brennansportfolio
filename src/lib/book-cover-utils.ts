const GRADIENTS = [
  "linear-gradient(145deg, #7c3aed 0%, #f59e0b 100%)",
  "linear-gradient(145deg, #0d9488 0%, #fbbf24 100%)",
  "linear-gradient(145deg, #e11d48 0%, #6366f1 100%)",
  "linear-gradient(145deg, #1d4ed8 0%, #f97316 100%)",
  "linear-gradient(145deg, #be185d 0%, #a855f7 100%)",
  "linear-gradient(145deg, #065f46 0%, #fcd34d 100%)",
  "linear-gradient(145deg, #4338ca 0%, #ec4899 100%)",
  "linear-gradient(145deg, #b45309 0%, #7e22ce 100%)",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function coverGradient(title: string): string {
  return GRADIENTS[hashString(title) % GRADIENTS.length];
}

export function coverUrlForSize(
  coverId: number,
  size: "S" | "M" | "L",
): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}
