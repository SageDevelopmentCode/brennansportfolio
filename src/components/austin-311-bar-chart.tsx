export type BarChartItem = {
  label: string;
  value: number;
};

type Austin311BarChartProps = {
  title: string;
  items: BarChartItem[];
  orientation: "horizontal" | "vertical";
  valueFormatter?: (value: number) => string;
  barClassName?: string;
};

function defaultFormatter(value: number): string {
  return value.toLocaleString();
}

function truncateLabel(label: string, max = 42): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

export function Austin311BarChart({
  title,
  items,
  orientation,
  valueFormatter = defaultFormatter,
  barClassName = "bg-[var(--austin311-accent)]",
}: Austin311BarChartProps) {
  const max = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return (
      <div className="austin311-glass-card rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--austin311-muted)]">
          {title}
        </h2>
        <p className="mt-4 text-sm text-[var(--austin311-muted)]">No data yet.</p>
      </div>
    );
  }

  if (orientation === "vertical") {
    return (
      <div className="austin311-glass-card rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--austin311-muted)]">
          {title}
        </h2>
        <div
          className="mt-6 flex items-end justify-between gap-2 sm:gap-3"
          role="img"
          aria-label={title}
        >
          {items.map((item) => {
            const heightPct = Math.max(4, (item.value / max) * 100);
            return (
              <div
                key={item.label}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
                title={`${item.label}: ${valueFormatter(item.value)}`}
              >
                <span className="text-[10px] font-bold tabular-nums text-[var(--austin311-ink)] sm:text-xs">
                  {valueFormatter(item.value)}
                </span>
                <div className="flex h-36 w-full items-end justify-center sm:h-44">
                  <div
                    className={`w-full max-w-10 rounded-t-md ${barClassName} transition-all`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="w-full truncate text-center text-[10px] font-semibold text-[var(--austin311-muted)] sm:text-xs">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="austin311-glass-card rounded-2xl p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--austin311-muted)]">
        {title}
      </h2>
      <ul className="mt-4 space-y-3" role="list">
        {items.map((item) => {
          const widthPct = Math.max(2, (item.value / max) * 100);
          return (
            <li key={item.label} title={`${item.label}: ${valueFormatter(item.value)}`}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs sm:text-sm">
                <span className="min-w-0 truncate font-semibold text-[var(--austin311-ink)]">
                  {truncateLabel(item.label)}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-[var(--austin311-accent)]">
                  {valueFormatter(item.value)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--austin311-accent-soft)]">
                <div
                  className={`h-full rounded-full ${barClassName}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
