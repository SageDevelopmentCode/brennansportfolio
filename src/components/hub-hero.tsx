export function HubHero() {
  return (
    <header className="relative z-10 w-full max-w-5xl text-center sm:text-left">
      <div className="hub-sparkle left-[10%] top-0" style={{ animationDelay: "0s" }} />
      <div className="hub-sparkle right-[15%] top-8" style={{ animationDelay: "1s" }} />
      <div className="hub-sparkle left-[40%] top-16 hidden sm:block" style={{ animationDelay: "2s" }} />

      <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        Live portfolio
      </span>

      <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] sm:text-7xl md:text-8xl">
        <span className="hub-title-gradient drop-shadow-[0_0_40px_rgba(132,94,247,0.4)]">
          Brennan&apos;s
        </span>
        <br />
        <span className="text-white drop-shadow-lg">Projects</span>
      </h1>

      <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60 sm:text-xl">
        Four worlds. One hub. Jump into neighborhood events, climb the reading
        leaderboard, explore the stacks, or check the weather.
      </p>
    </header>
  );
}
