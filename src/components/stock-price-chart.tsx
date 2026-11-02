"use client";

import type { StockEodBar } from "@/lib/stocks";
import {
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  CandlestickSeries,
  LineSeries,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

export type ChartRange = "1M" | "3M" | "1Y" | "5Y";

const RANGE_DAYS: Record<ChartRange, number> = {
  "1M": 22,
  "3M": 66,
  "1Y": 252,
  "5Y": 1260,
};

type StockPriceChartProps = {
  symbol: string;
  initialHistory: StockEodBar[];
  initialError?: string | null;
};

function sliceHistory(history: StockEodBar[], range: ChartRange): StockEodBar[] {
  const days = RANGE_DAYS[range];
  if (history.length <= days) return history;
  return history.slice(-days);
}

export function StockPriceChart({
  symbol,
  initialHistory,
  initialError = null,
}: StockPriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [range, setRange] = useState<ChartRange>("1Y");
  const [mode, setMode] = useState<"candle" | "line">("line");
  const [history, setHistory] = useState(initialHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    setHistory(initialHistory);
    setError(initialError);
  }, [initialHistory, initialError]);

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
      height: 360,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#f87171",
      borderVisible: false,
      wickUpColor: "#34d399",
      wickDownColor: "#f87171",
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#34d399",
      lineWidth: 2,
    });

    chartRef.current = chart;
    candleRef.current = candleSeries;
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
      candleRef.current = null;
      lineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candleSeries = candleRef.current;
    const lineSeries = lineRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !lineSeries || !chart) return;

    const slice = sliceHistory(history, range);
    const candleData = slice.map((bar) => ({
      time: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));
    const lineData = slice.map((bar) => ({
      time: bar.date,
      value: bar.close,
    }));

    candleSeries.setData(candleData);
    lineSeries.setData(lineData);
    candleSeries.applyOptions({ visible: mode === "candle" });
    lineSeries.applyOptions({ visible: mode === "line" });
    chart.timeScale().fitContent();
  }, [history, range, mode]);

  async function refreshHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/stocks/${encodeURIComponent(symbol)}/history`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not refresh chart.");
        return;
      }
      setHistory(data.history ?? []);
    } catch {
      setError("Could not refresh chart.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="market-glass-card flex flex-col gap-4 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-[var(--market-ink)]">
          Price chart
        </h2>
        <div className="flex flex-wrap gap-2">
          {(["1M", "3M", "1Y", "5Y"] as ChartRange[]).map((option) => (
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
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("line")}
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            mode === "line"
              ? "bg-[var(--market-accent-soft)] text-[var(--market-accent)]"
              : "text-[var(--market-muted)]"
          }`}
        >
          Line
        </button>
        <button
          type="button"
          onClick={() => setMode("candle")}
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            mode === "candle"
              ? "bg-[var(--market-accent-soft)] text-[var(--market-accent)]"
              : "text-[var(--market-muted)]"
          }`}
        >
          Candles
        </button>
        <button
          type="button"
          onClick={refreshHistory}
          disabled={loading}
          className="ml-auto rounded-full border border-[var(--market-border)] px-3 py-1 text-xs font-bold text-[var(--market-muted)] hover:border-[var(--market-accent)] disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div ref={containerRef} className="w-full min-h-[360px]" />

      {error && (
        <p className="text-sm font-semibold text-[var(--market-down)]">{error}</p>
      )}

      <p className="text-xs text-[var(--market-muted)]">
        End-of-day prices from Financial Modeling Prep. Not investment advice.
      </p>
    </div>
  );
}
