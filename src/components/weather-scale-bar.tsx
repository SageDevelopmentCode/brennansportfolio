type WeatherScaleBarProps = {
  label: string;
  value: number;
  suffix?: string;
};

export function WeatherScaleBar({ label, value, suffix }: WeatherScaleBarProps) {
  const clamped = Math.max(1, Math.min(10, value));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
          {label}
        </span>
        <span className="text-xs font-bold text-[var(--skyline-ink)]">
          {clamped}/10
          {suffix ? (
            <span className="font-medium text-[var(--skyline-muted)]">
              {" "}
              · {suffix}
            </span>
          ) : null}
        </span>
      </div>
      <div
        className="flex gap-1"
        role="meter"
        aria-label={`${label}: ${clamped} out of 10`}
        aria-valuenow={clamped}
        aria-valuemin={1}
        aria-valuemax={10}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm transition-colors ${
              i < clamped
                ? "bg-[var(--skyline-accent)]"
                : "bg-[var(--skyline-border)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
