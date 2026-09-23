import { scoreToStars } from "@/lib/books";
import type {
  BookPreview,
  HomeworkPreview,
  LibraryPreview,
  OverlookPreview,
  Project,
  SkylinePreview,
} from "@/lib/projects";
import Link from "next/link";

type ProjectCardProps = {
  project: Project;
  overlookPreview?: OverlookPreview;
  bookPreview?: BookPreview;
  libraryPreview?: LibraryPreview;
  skylinePreview?: SkylinePreview;
  homeworkPreview?: HomeworkPreview;
  index?: number;
};

function StarRow({ score }: { score: number }) {
  const filled = scoreToStars(score);
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-lg ${i < filled ? "text-amber-300 drop-shadow-sm" : "text-white/25"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function cardGradient(theme: Project["theme"]): string {
  switch (theme) {
    case "overlook":
      return "bg-gradient-to-br from-accent-coral via-accent-purple to-indigo-600 hover:shadow-[0_24px_60px_rgba(255,107,107,0.35)]";
    case "library":
      return "bg-gradient-to-br from-amber-600 via-orange-600 to-yellow-700 hover:shadow-[0_24px_60px_rgba(217,119,6,0.35)]";
    case "skyline":
      return "bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-400 hover:shadow-[0_24px_60px_rgba(14,165,233,0.35)]";
    case "homework":
      return "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-lime-400 hover:shadow-[0_24px_60px_rgba(139,92,246,0.35)]";
    case "roadtrip":
      return "bg-gradient-to-br from-emerald-500 via-green-500 to-orange-400 hover:shadow-[0_24px_60px_rgba(5,150,105,0.35)]";
    case "math":
      return "bg-gradient-to-br from-sky-500 via-blue-500 to-orange-400 hover:shadow-[0_24px_60px_rgba(14,165,233,0.35)]";
    case "snake":
      return "bg-gradient-to-br from-lime-500 via-emerald-600 to-green-900 hover:shadow-[0_24px_60px_rgba(34,197,94,0.35)]";
    case "torch":
      return "bg-gradient-to-br from-orange-500 via-red-600 to-purple-900 hover:shadow-[0_24px_60px_rgba(249,115,22,0.35)]";
    case "eggs":
      return "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 hover:shadow-[0_24px_60px_rgba(251,191,36,0.35)]";
    case "chess":
      return "bg-gradient-to-br from-emerald-700 via-green-800 to-amber-700 hover:shadow-[0_24px_60px_rgba(45,90,39,0.35)]";
    case "history":
      return "bg-gradient-to-br from-amber-700 via-orange-800 to-stone-700 hover:shadow-[0_24px_60px_rgba(180,83,9,0.35)]";
    default:
      return "bg-gradient-to-br from-teal-400 via-emerald-500 to-amber-400 hover:shadow-[0_24px_60px_rgba(16,185,129,0.35)]";
  }
}

export function ProjectCard({
  project,
  overlookPreview,
  bookPreview,
  libraryPreview,
  skylinePreview,
  homeworkPreview,
  index = 0,
}: ProjectCardProps) {
  const { title, description, emoji, href, comingSoon, theme } = project;

  if (comingSoon) {
    return (
      <div
        className="hub-glass flex min-h-72 flex-col gap-4 rounded-3xl p-8 opacity-50"
        aria-disabled
      >
        <span className="text-5xl">{emoji}</span>
        <div>
          <h2 className="font-display text-2xl font-semibold text-white/70">
            {title}
          </h2>
          <p className="text-sm text-white/50">{description}</p>
        </div>
      </div>
    );
  }

  const isOverlook = theme === "overlook";
  const isBooks = theme === "books";
  const isLibrary = theme === "library";
  const isSkyline = theme === "skyline";
  const isHomework = theme === "homework";
  const isMath = theme === "math";
  const isSnake = theme === "snake";
  const isTorch = theme === "torch";
  const isEggs = theme === "eggs";
  const isChess = theme === "chess";

  return (
    <Link
      href={href!}
      className={`hub-card-shine group relative flex min-h-72 flex-col justify-between overflow-hidden rounded-3xl p-8 shadow-2xl transition duration-500 hover:-translate-y-3 hover:scale-[1.03] animate-pop-in ${cardGradient(theme)}`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl transition group-hover:bg-white/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-black/10 blur-xl"
        aria-hidden
      />

      <div className="relative z-10">
        <span
          className="inline-block text-6xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)] transition duration-500 group-hover:scale-125 group-hover:rotate-12"
        >
          {emoji}
        </span>
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-white drop-shadow-md">
          {title}
        </h2>
        <p className="mt-2 text-base font-medium text-white/85">{description}</p>
      </div>

      <div className="relative z-10 mt-6 space-y-4">
        {isOverlook && overlookPreview ? (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Next event
            </p>
            <p className="mt-1 truncate text-lg font-bold text-white">
              {overlookPreview.name}
            </p>
            <p className="text-sm text-white/75">{overlookPreview.date}</p>
          </div>
        ) : isOverlook ? (
          <p className="text-sm font-medium text-white/60">
            No events yet — be the first!
          </p>
        ) : null}

        {isBooks && bookPreview ? (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            {bookPreview.topBook ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Top rated
                </p>
                <StarRow score={bookPreview.topBook.score} />
                <p className="mt-1 truncate text-lg font-bold text-white">
                  {bookPreview.topBook.name}
                </p>
                <p className="text-sm text-white/75">
                  {bookPreview.count} {bookPreview.count === 1 ? "book" : "books"}{" "}
                  on the shelf
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-white/75">
                {bookPreview.count === 0
                  ? "Empty shelf — add your first book!"
                  : `${bookPreview.count} books waiting for ratings`}
              </p>
            )}
          </div>
        ) : null}

        {isLibrary && libraryPreview ? (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Your favorites
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {libraryPreview.favoriteCount}{" "}
              {libraryPreview.favoriteCount === 1 ? "book" : "books"} saved
            </p>
            <p className="text-sm text-white/75">
              Search authors &amp; discover works
            </p>
          </div>
        ) : null}

        {isSkyline && skylinePreview ? (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Your cities
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {skylinePreview.favoriteCount}{" "}
              {skylinePreview.favoriteCount === 1 ? "city" : "cities"} saved
            </p>
            <p className="text-sm text-white/75">
              {skylinePreview.latestCity
                ? `Latest: ${skylinePreview.latestCity}`
                : "Search cities & check the weather"}
            </p>
          </div>
        ) : null}

        {isHomework && homeworkPreview ? (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Your hub
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {homeworkPreview.urgentCount} urgent task
              {homeworkPreview.urgentCount === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-white/75">
              {homeworkPreview.savingsPercent > 0
                ? `${homeworkPreview.savingsPercent}% toward your savings goal`
                : "Track homework, chores & savings"}
            </p>
          </div>
        ) : isHomework ? (
          <p className="text-sm font-medium text-white/75">
            Log in to track homework, chores & savings
          </p>
        ) : null}

        {isMath && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Times tables
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              Practice multiplication!
            </p>
            <p className="text-sm text-white/75">
              Streaks, badges & speed rounds
            </p>
          </div>
        )}

        {isSnake && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Red dot arena
            </p>
            <div
              className="mt-3 grid aspect-square w-20 gap-1"
              style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
              aria-hidden
            >
              {Array.from({ length: 25 }, (_, i) => {
                const x = i % 5;
                const y = Math.floor(i / 5);
                const isBorder = x === 0 || y === 0 || x === 4 || y === 4;
                const isFood = x === 2 && y === 2;
                const isSnakeBody = x === 1 && y === 2;

                let className = "rounded-full";
                if (isBorder) {
                  className += " bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.8)]";
                } else if (isFood) {
                  className += " bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.9)]";
                } else if (isSnakeBody) {
                  className += " bg-emerald-300";
                }

                return <div key={i} className={className} />;
              })}
            </div>
            <p className="mt-3 text-sm text-white/75">
              Eat yellow dots, avoid the red border
            </p>
          </div>
        )}

        {isTorch && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Cave arena
            </p>
            <div className="mt-3 flex items-end justify-center gap-3" aria-hidden>
              <span className="text-2xl">🧍</span>
              <span className="text-xl">🔥</span>
              <span className="text-3xl opacity-80">🫧</span>
              <span className="text-2xl opacity-60">🫧</span>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Throw torches, pop bubbles, chase high scores
            </p>
          </div>
        )}

        {isEggs && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Kitchen arena
            </p>
            <div className="mt-3 flex items-end justify-center gap-3" aria-hidden>
              <span className="text-2xl">🧑‍🍳</span>
              <span className="text-xl">🥚</span>
              <span className="text-xl">🥚</span>
              <span className="text-lg opacity-70">🔺</span>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Whack 100 eggs, dodge falling spikes
            </p>
          </div>
        )}

        {isChess && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Royal board
            </p>
            <div
              className="mt-3 grid aspect-square w-20 gap-0.5 overflow-hidden rounded-md"
              style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
              aria-hidden
            >
              {Array.from({ length: 16 }, (_, i) => {
                const file = i % 4;
                const rank = Math.floor(i / 4);
                const isLight = (file + rank) % 2 === 0;
                const isKing = i === 12;
                const isPawn = i === 9;

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-center text-sm ${
                      isLight ? "bg-amber-100/90" : "bg-amber-700/90"
                    }`}
                  >
                    {isKing ? "♔" : isPawn ? "♟" : ""}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-white/75">
              Full rules vs the computer
            </p>
          </div>
        )}

        <span className="hub-launch-btn">
          Enter
          <span aria-hidden className="transition group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
