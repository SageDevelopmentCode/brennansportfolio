"use client";

import { formatAustin311Date, type Austin311Request } from "@/lib/austin-311";
import { useCallback, useEffect, useState } from "react";

type Austin311RequestLogProps = {
  selectedNumber: string | null;
  onSelect: (request: Austin311Request) => void;
  onRequestsLoaded?: (requests: Austin311Request[]) => void;
};

function truncate(text: string, max = 56): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function Austin311RequestLog({
  selectedNumber,
  onSelect,
  onRequestsLoaded,
}: Austin311RequestLogProps) {
  const [requests, setRequests] = useState<Austin311Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/austin-311/logs");
      const json = (await response.json()) as {
        requests?: Austin311Request[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Request failed");
      }
      const list = json.requests ?? [];
      setRequests(list);
      onRequestsLoaded?.(list);
    } catch (err) {
      setRequests([]);
      setError(
        err instanceof Error ? err.message : "Could not load request log.",
      );
    } finally {
      setLoading(false);
    }
  }, [onRequestsLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && requests.length === 0) {
    return (
      <div className="austin311-glass-card rounded-2xl p-6 text-center">
        <p className="font-semibold text-[var(--austin311-ink)]">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-full border-2 border-[var(--austin311-accent)] px-4 py-1.5 text-sm font-bold text-[var(--austin311-accent)]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="austin311-glass-card overflow-hidden rounded-2xl">
      <div className="border-b border-[var(--austin311-border)] px-5 py-4">
        <h2 className="text-lg font-extrabold text-[var(--austin311-ink)]">
          Request log
        </h2>
        <p className="text-sm text-[var(--austin311-muted)]">
          Open requests, newest first · click a row for details
        </p>
      </div>

      {loading && requests.length === 0 ? (
        <ul className="divide-y divide-[var(--austin311-border)] p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="animate-pulse px-3 py-4">
              <div className="h-4 w-28 rounded bg-[var(--austin311-accent-soft)]" />
              <div className="mt-2 h-3 w-full rounded bg-[var(--austin311-accent-soft)]" />
            </li>
          ))}
        </ul>
      ) : (
        <ul
          className="max-h-[420px] divide-y divide-[var(--austin311-border)] overflow-y-auto"
          role="list"
        >
          {requests.map((request) => {
            const selected =
              selectedNumber === request.serviceRequestNumber;
            return (
              <li key={request.serviceRequestNumber}>
                <button
                  type="button"
                  onClick={() => onSelect(request)}
                  className={`austin311-log-row flex w-full flex-col gap-1 px-5 py-4 text-left transition ${
                    selected
                      ? "bg-[var(--austin311-accent-soft)] ring-2 ring-inset ring-[var(--austin311-accent)]"
                      : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-[var(--austin311-accent)]">
                      {request.serviceRequestNumber}
                    </span>
                    <span className="rounded-full bg-[var(--austin311-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--austin311-accent)]">
                      {request.status}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--austin311-ink)]">
                    {truncate(request.description)}
                  </span>
                  <span className="text-xs text-[var(--austin311-muted)]">
                    {request.department} ·{" "}
                    {formatAustin311Date(request.createdDate)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
