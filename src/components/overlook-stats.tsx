"use client";

type OverlookStatsProps = {
  eventCount: number;
  rsvpCount: number;
  nextEvent: { name: string; date: string } | null;
};

export function OverlookStats({
  eventCount,
  rsvpCount,
  nextEvent,
}: OverlookStatsProps) {
  return (
    <div
      className="relative z-10 grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="overlook-stat-card animate-pop-in rounded-2xl border-2 border-accent-coral/40 bg-white/90 px-4 py-4 shadow-md backdrop-blur-sm">
        <p className="text-2xl" aria-hidden>🎊</p>
        <p className="font-display text-3xl font-bold text-accent-coral">
          {eventCount}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Events
        </p>
      </div>
      <div
        className="overlook-stat-card animate-pop-in rounded-2xl border-2 border-accent-purple/40 bg-white/90 px-4 py-4 shadow-md backdrop-blur-sm"
        style={{ animationDelay: "80ms" }}
      >
        <p className="text-2xl" aria-hidden>🙋</p>
        <p className="font-display text-3xl font-bold text-accent-purple">
          {rsvpCount}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          RSVPs
        </p>
      </div>
      <div
        className="overlook-stat-card animate-pop-in rounded-2xl border-2 border-accent-mint/50 bg-white/90 px-4 py-4 shadow-md backdrop-blur-sm"
        style={{ animationDelay: "160ms" }}
      >
        <p className="text-2xl" aria-hidden>📅</p>
        {nextEvent ? (
          <>
            <p
              className="truncate font-display text-sm font-bold text-foreground"
              title={nextEvent.name}
            >
              {nextEvent.name}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              {nextEvent.date}
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-3xl font-bold text-foreground/30">
              —
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Next up
            </p>
          </>
        )}
      </div>
    </div>
  );
}
