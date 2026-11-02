"use client";

import type { PortfolioEquityPoint, PortfolioRange } from "@/lib/portfolio-equity-history";
import { PAPER_STARTING_CASH } from "@/lib/stock-portfolio";
import { changeToneClass, formatUsdPrice } from "@/lib/stocks";
import {
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
} from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";

const RANGES: PortfolioRange[] = ["1W", "1M", "1Y"];

const RANGE_LABELS: Record<PortfolioRange, string> = {
  "1W": "Week",
  "1M": "Month",
  "1Y": "Year",
};

export function StockPortfolioChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [range, setRange] = useState<PortfolioRange>("1M");
  const [points, setPoints] = useState<PortfolioEquityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (selectedRange: PortfolioRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/stocks/portfolio/history?range=${encodeURIComponent(selectedRange)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load chart.");
        setPoints([]);
        return;
      }
      setPoints(data.points ?? []);
    } catch {
      setError("Could not load chart.");
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(range);
  }, [range, loadHistory]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(52, 211, 153, 0.08)" },
        horzLines: { color: "rgba(52, 211, 153, 0.08)" },
      },
      rightPriceScale: { borderColor: "rgba(52, 211, 153, 0.2)" },
      timeScale: { borderColor: "rgba(52, 211, 153, 0.2)" },
      height: 320,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#34d399",
      lineWidth: 2,
    });

    chartRef.current = chart;
    lineRef.current = lineSeries;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.applyOptions({ width: entry.contentRect.width });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      lineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lineSeries = lineRef.current;
    const chart = chartRef.current;
    if (!lineSeries || !chart) return;

    const lineData = points.map((p) => ({
      time: p.date,
      value: p.equity,
    }));
    lineSeries.setData(lineData);
    chart.timeScale().fitContent();
  }, [points]);

  const first = points[0]?.equity ?? PAPER_STARTING_CASH;
  const last = points[points.length - 1]?.equity ?? PAPER_STARTING_CASH;
  const rangeChange = last - first;

  return (
    <div className="market-glass-card mt-6 flex w-full max-w-4xl flex-col gap-4 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--market-ink)]">
            Portfolio performance
          </h2>
          {points.length > 1 && (
            <p className={`mt-1 text-sm font-bold ${changeToneClass(rangeChange)}`}>
              {rangeChange >= 0 ? "+" : ""}
              {formatUsdPrice(rangeChange)} over this {RANGE_LABELS[range].toLowerCase()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                range === option
                  ? "bg-[var(--market-accent)] text-[var(--market-bg)]"
                  : "border border-[var(--market-border)] text-[var(--market-muted)] hover:border-[var(--market-accent)]"
              }`}
            >
              {RANGE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => loadHistory(range)}
          disabled={loading}
          className="ml-auto rounded-full border border-[var(--market-border)] px-3 py-1 text-xs font-bold text-[var(--market-muted)] hover:border-[var(--market-accent)] disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div
        ref={containerRef}
        className={`w-full min-h-[320px] ${loading && points.length === 0 ? "opacity-40" : ""}`}
      />

      {error && (
        <p className="text-sm font-semibold text-[var(--market-down)]">{error}</p>
      )}

      {!loading && points.length <= 1 && !error && (
        <p className="text-sm text-[var(--market-muted)]">
          Make a practice trade to see how your total moves over time.
        </p>
      )}

      <p className="text-xs text-[var(--market-muted)]">
        End-of-day stock prices plus your practice trades. Not investment advice.
      </p>
    </div>
  );
}
