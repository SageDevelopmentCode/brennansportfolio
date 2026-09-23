export type Book = {
  id: string;
  name: string;
  score: number | null;
  pages: number | null;
  series: boolean;
};

export function scoreToStars(score: number): number {
  return Math.round(score / 2);
}

export function averageScore(books: Book[]): number | null {
  const scored = books.filter((book) => book.score !== null);
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, book) => sum + (book.score ?? 0), 0);
  return Math.round((total / scored.length) * 10) / 10;
}

export function getTopBook(books: Book[]): Book | null {
  const scored = books.filter((book) => book.score !== null);
  if (scored.length === 0) return null;
  return scored.reduce((best, book) =>
    (book.score ?? 0) > (best.score ?? 0) ? book : best,
  );
}

export function getRankStyle(rank: number): {
  badge: string;
  border: string;
} {
  if (rank === 1) {
    return {
      badge: "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30",
      border: "border-l-amber-400",
    };
  }
  if (rank === 2) {
    return {
      badge: "bg-slate-300 text-slate-800 shadow-md shadow-slate-300/30",
      border: "border-l-slate-400",
    };
  }
  if (rank === 3) {
    return {
      badge: "bg-orange-400 text-orange-950 shadow-md shadow-orange-400/30",
      border: "border-l-orange-400",
    };
  }
  return {
    badge: "bg-indigo-100 text-indigo-800",
    border: "border-l-indigo-400",
  };
}
