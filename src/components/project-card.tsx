import type {
  HomeworkPreview,
  LibraryPreview,
  OverlookPreview,
  Project,
  SkylinePreview,
  MarketPreview,
} from "@/lib/projects";
import Link from "next/link";

type ProjectCardProps = {
  project: Project;
  overlookPreview?: OverlookPreview;
  libraryPreview?: LibraryPreview;
  skylinePreview?: SkylinePreview;
  marketPreview?: MarketPreview;
  homeworkPreview?: HomeworkPreview;
  index?: number;
};

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
      return "bg-gradient-to-br from-sky-400 via-cyan-500 to-orange-400 hover:shadow-[0_24px_60px_rgba(14,165,233,0.35)]";
    case "typing":
      return "bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-violet-600 hover:shadow-[0_24px_60px_rgba(34,211,238,0.35)]";
    case "squad":
      return "bg-gradient-to-br from-sky-400 via-blue-500 to-slate-200 hover:shadow-[0_24px_60px_rgba(0,122,255,0.35)]";
    case "snake":
      return "bg-gradient-to-br from-lime-500 via-emerald-600 to-green-900 hover:shadow-[0_24px_60px_rgba(34,197,94,0.35)]";
    case "torch":
      return "bg-gradient-to-br from-orange-500 via-red-600 to-purple-900 hover:shadow-[0_24px_60px_rgba(249,115,22,0.35)]";
    case "rocketfist":
      return "bg-gradient-to-br from-rose-500 via-red-600 to-blue-600 hover:shadow-[0_24px_60px_rgba(239,68,68,0.4)]";
    case "eggs":
      return "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 hover:shadow-[0_24px_60px_rgba(251,191,36,0.35)]";
    case "chess":
      return "bg-gradient-to-br from-emerald-700 via-green-800 to-amber-700 hover:shadow-[0_24px_60px_rgba(45,90,39,0.35)]";
    case "history":
      return "bg-gradient-to-br from-amber-700 via-orange-800 to-stone-700 hover:shadow-[0_24px_60px_rgba(180,83,9,0.35)]";
    case "workout":
      return "bg-gradient-to-br from-orange-600 via-red-600 to-stone-800 hover:shadow-[0_24px_60px_rgba(234,88,12,0.35)]";
    case "spelling":
      return "bg-gradient-to-br from-amber-500 via-orange-500 to-emerald-600 hover:shadow-[0_24px_60px_rgba(217,119,6,0.35)]";
    case "sign":
      return "bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-700 hover:shadow-[0_24px_60px_rgba(56,189,248,0.35)]";
    case "allergies":
      return "bg-gradient-to-br from-rose-400 via-orange-400 to-amber-200 hover:shadow-[0_24px_60px_rgba(251,113,133,0.35)]";
    case "blockrealm":
      return "bg-gradient-to-br from-lime-400 via-emerald-700 to-stone-700 hover:shadow-[0_24px_60px_rgba(34,197,94,0.35)]";
    case "shelter":
      return "bg-gradient-to-br from-teal-400 via-emerald-500 to-lime-600 hover:shadow-[0_24px_60px_rgba(20,184,166,0.35)]";
    case "gym":
      return "bg-gradient-to-br from-zinc-800 via-orange-600 to-amber-500 hover:shadow-[0_24px_60px_rgba(234,88,12,0.35)]";
    case "market":
      return "bg-gradient-to-br from-slate-900 via-emerald-800 to-lime-500 hover:shadow-[0_24px_60px_rgba(52,211,153,0.35)]";
    case "delivery":
      return "bg-gradient-to-br from-orange-500 via-amber-500 to-teal-500 hover:shadow-[0_24px_60px_rgba(249,115,22,0.35)]";
    case "physics":
      return "bg-gradient-to-br from-slate-800 via-violet-700 to-indigo-500 hover:shadow-[0_24px_60px_rgba(139,92,246,0.35)]";
    case "austin311":
      return "bg-gradient-to-br from-teal-600 via-orange-500 to-amber-200 hover:shadow-[0_24px_60px_rgba(13,148,136,0.35)]";
    case "hillclimb":
      return "bg-gradient-to-br from-lime-500 via-green-600 to-amber-500 hover:shadow-[0_24px_60px_rgba(34,197,94,0.35)]";
    case "solarsystem":
      return "bg-gradient-to-br from-indigo-950 via-violet-900 to-amber-400 hover:shadow-[0_24px_60px_rgba(99,102,241,0.4)]";
    case "familycalendar":
      return "bg-gradient-to-br from-yellow-300 via-pink-500 to-indigo-600 hover:shadow-[0_24px_60px_rgba(236,72,153,0.55)] hover:scale-[1.02] transition-transform";
    default:
      return "bg-gradient-to-br from-teal-400 via-emerald-500 to-amber-400 hover:shadow-[0_24px_60px_rgba(16,185,129,0.35)]";
  }
}

export function ProjectCard({
  project,
  overlookPreview,
  libraryPreview,
  skylinePreview,
  marketPreview,
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
  const isLibrary = theme === "library";
  const isSkyline = theme === "skyline";
  const isMarket = theme === "market";
  const isHomework = theme === "homework";
  const isSnake = theme === "snake";
  const isTorch = theme === "torch";
  const isRocketFist = theme === "rocketfist";
  const isEggs = theme === "eggs";
  const isChess = theme === "chess";
  const isTyping = theme === "typing";
  const isBlockrealm = theme === "blockrealm";

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

        {isMarket && marketPreview ? (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Your watchlist
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {marketPreview.watchlistCount}{" "}
              {marketPreview.watchlistCount === 1 ? "ticker" : "tickers"} saved
            </p>
            <p className="text-sm text-white/75">
              {marketPreview.latestSymbol
                ? `Latest: ${marketPreview.latestSymbol}`
                : "Search stocks & chart prices"}
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

        {isRocketFist && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Junkyard arena
            </p>
            <div className="mt-3 flex items-end justify-center gap-3" aria-hidden>
              <span className="text-2xl">👊</span>
              <span className="text-xl">🤖</span>
              <span className="text-2xl">🍕</span>
              <span className="text-2xl">🦖</span>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Punch, dash, and survive the bosses
            </p>
          </div>
        )}

        {isEggs && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Jungle lanes
            </p>
            <div className="mt-3 flex items-end justify-center gap-3" aria-hidden>
              <span className="text-2xl">🦍</span>
              <span className="text-xl">🍌</span>
              <span className="text-xl">🍌</span>
              <span className="text-lg opacity-70">🪵</span>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Strafe, jump, grab bananas — don&apos;t starve
            </p>
          </div>
        )}

        {isTyping && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Neon keys
            </p>
            <div
              className="mt-3 flex flex-wrap items-center justify-center gap-1 font-mono text-sm font-bold"
              aria-hidden
            >
              {["Q", "W", "E", "R", "T", "Y"].map((key) => (
                <span
                  key={key}
                  className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-white/90"
                >
                  {key}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-white/75">
              60s WPM tests, word drops &amp; key drills
            </p>
          </div>
        )}

        {isBlockrealm && (
          <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
              Little lands
            </p>
            <div
              className="mt-3 flex items-end justify-center gap-1"
              aria-hidden
            >
              <span className="h-5 w-5 rounded-sm bg-stone-500 shadow-md" />
              <span className="h-6 w-6 rounded-sm bg-amber-800 shadow-md" />
              <span className="h-7 w-7 rounded-sm bg-lime-500 shadow-md" />
              <span className="h-6 w-6 rounded-sm bg-sky-400/80 shadow-md" />
            </div>
            <p className="mt-3 text-sm text-white/75">
              Build a tiny world, then watch the sky fade to night
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
