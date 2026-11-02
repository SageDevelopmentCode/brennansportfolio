"use client";

import { Austin311BarChart } from "@/components/austin-311-bar-chart";
import { Austin311Map } from "@/components/austin-311-map";
import { Austin311RequestDetailSidebar } from "@/components/austin-311-request-detail-sidebar";
import { Austin311RequestLog } from "@/components/austin-311-request-log";
import type {
  Austin311DashboardData,
  Austin311Request,
} from "@/lib/austin-311";
import { useCallback, useEffect, useState } from "react";

function formatFetchedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Chicago",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ChartSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="austin311-glass-card animate-pulse rounded-2xl p-5">
      <div className="h-4 w-40 rounded bg-[var(--austin311-accent-soft)]" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-[var(--austin311-accent-soft)]" />
        ))}
      </div>
    </div>
  );
}

export function Austin311DashboardClient() {
  const [data, setData] = useState<Austin311DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Austin311Request | null>(
    null,
  );
  const [loadedRequests, setLoadedRequests] = useState<Austin311Request[]>([]);

  const handleMapSelect = useCallback(
    async (serviceRequestNumber: string) => {
      const cached = loadedRequests.find(
        (r) => r.serviceRequestNumber === serviceRequestNumber,
      );
      if (cached) {
        setSelectedRequest(cached);
        return;
      }

      try {
        const response = await fetch(
          `/api/austin-311/requests/${encodeURIComponent(serviceRequestNumber)}`,
        );
        if (!response.ok) return;
        const request = (await response.json()) as Austin311Request;
        setSelectedRequest(request);
      } catch {
        // ignore — popup still shows on map
      }
    },
    [loadedRequests],
  );

  const handleRequestsLoaded = useCallback((requests: Austin311Request[]) => {
    setLoadedRequests(requests);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/austin-311/dashboard");
      const json = (await response.json()) as Austin311DashboardData & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Request failed");
      }
      setData(json);
    } catch (err) {
      setData(null);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load Austin 311 data. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !data) {
    return (
      <div className="austin311-glass-card rounded-2xl p-8 text-center">
        <p className="text-lg font-semibold text-[var(--austin311-ink)]">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-full border-2 border-[var(--austin311-accent)] bg-[var(--austin311-accent-soft)] px-5 py-2 text-sm font-bold text-[var(--austin311-accent)] transition hover:bg-[var(--austin311-accent)] hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const topTypeCount = data?.topTypes.length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <Austin311RequestDetailSidebar
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !data ? (
          <>
            <ChartSkeleton rows={2} />
            <ChartSkeleton rows={2} />
            <ChartSkeleton rows={2} />
          </>
        ) : data ? (
          <>
            <div className="austin311-glass-card rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--austin311-muted)]">
                Open requests
              </p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums text-[var(--austin311-accent)]">
                {data.openCount.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-[var(--austin311-muted)]">
                Transportation &amp; Public Works · 311
              </p>
            </div>
            <div className="austin311-glass-card rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--austin311-muted)]">
                Top categories shown
              </p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums text-[var(--austin311-ink)]">
                {topTypeCount}
              </p>
              <p className="mt-2 text-sm text-[var(--austin311-muted)]">
                By service request type
              </p>
            </div>
            <div className="austin311-glass-card rounded-2xl p-5 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--austin311-muted)]">
                Last refreshed
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--austin311-ink)]">
                {formatFetchedAt(data.fetchedAt)}
              </p>
              <p className="mt-2 text-sm text-[var(--austin311-muted)]">
                Central Time · source updates ~2× daily
              </p>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="mt-4 rounded-full border border-[var(--austin311-border)] px-4 py-1.5 text-xs font-bold text-[var(--austin311-accent)] transition hover:border-[var(--austin311-accent)] disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {loading && !data ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton rows={3} />
          </>
        ) : data ? (
          <>
            <Austin311BarChart
              title="Top request types"
              orientation="horizontal"
              items={data.topTypes.map((row) => ({
                label: row.label,
                value: row.total,
              }))}
            />
            <Austin311BarChart
              title="Open vs closed (all time)"
              orientation="horizontal"
              items={data.statusMix.map((row) => ({
                label: row.label,
                value: row.total,
              }))}
            />
          </>
        ) : null}
      </div>

      {loading && !data ? (
        <ChartSkeleton rows={4} />
      ) : data ? (
        <Austin311BarChart
          title="Open requests by fiscal year"
          orientation="vertical"
          items={data.openByFiscalYear.map((row) => ({
            label: row.label,
            value: row.total,
          }))}
          barClassName="bg-gradient-to-t from-[#c2410c] to-[#0d9488]"
        />
      ) : null}

      <section>
        <Austin311RequestLog
          selectedNumber={selectedRequest?.serviceRequestNumber ?? null}
          onSelect={setSelectedRequest}
          onRequestsLoaded={handleRequestsLoaded}
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--austin311-ink)]">
              Open requests map
            </h2>
            <p className="text-sm text-[var(--austin311-muted)]">
              Up to 200 open cases with a mapped location
            </p>
          </div>
          {data ? (
            <span className="text-xs font-semibold text-[var(--austin311-muted)]">
              {data.mapPoints.length.toLocaleString()} pins
            </span>
          ) : null}
        </div>
        {loading && !data ? (
          <div className="flex h-[360px] animate-pulse items-center justify-center rounded-2xl border border-[var(--austin311-border)] bg-[var(--austin311-glass)] sm:h-[440px]">
            <span className="text-sm font-semibold text-[var(--austin311-muted)]">
              Loading map…
            </span>
          </div>
        ) : data ? (
          <Austin311Map
            points={data.mapPoints}
            onSelectRequest={(sr) => void handleMapSelect(sr)}
          />
        ) : null}
      </section>
    </div>
  );
}
