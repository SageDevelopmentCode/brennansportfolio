"use client";

import {
  formatAustin311Date,
  type Austin311Request,
} from "@/lib/austin-311";
import { useEffect, useRef } from "react";

type Austin311RequestDetailSidebarProps = {
  request: Austin311Request | null;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--austin311-border)] py-3 last:border-b-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--austin311-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[var(--austin311-ink)]">
        {value}
      </dd>
    </div>
  );
}

export function Austin311RequestDetailSidebar({
  request,
  onClose,
}: Austin311RequestDetailSidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    closeRef.current?.focus();
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [request, onClose]);

  if (!request) return null;

  const coords =
    request.latitude != null && request.longitude != null
      ? `${request.latitude.toFixed(5)}, ${request.longitude.toFixed(5)}`
      : "—";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="austin311-sidebar-title"
        className="austin311-sidebar-panel relative flex h-full w-full max-w-md flex-col border-l border-[var(--austin311-border)] bg-[var(--austin311-glass)] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--austin311-border)] p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--austin311-muted)]">
              Service request
            </p>
            <h2
              id="austin311-sidebar-title"
              className="mt-1 truncate text-xl font-extrabold text-[var(--austin311-ink)]"
            >
              {request.serviceRequestNumber}
            </h2>
            <span className="mt-2 inline-block rounded-full bg-[var(--austin311-accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--austin311-accent)]">
              {request.status}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[var(--austin311-border)] px-3 py-1.5 text-sm font-bold text-[var(--austin311-ink)] transition hover:border-[var(--austin311-accent)] hover:text-[var(--austin311-accent)]"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-base font-semibold leading-snug text-[var(--austin311-ink)]">
            {request.description}
          </p>

          <dl className="mt-6">
            <DetailRow label="Department" value={request.department || "—"} />
            <DetailRow
              label="Group"
              value={request.groupDescription || "—"}
            />
            <DetailRow
              label="Method received"
              value={request.methodReceived || "—"}
            />
            <DetailRow
              label="Created"
              value={formatAustin311Date(request.createdDate)}
            />
            <DetailRow
              label="Status changed"
              value={formatAustin311Date(request.statusChangeDate)}
            />
            <DetailRow
              label="Last update"
              value={formatAustin311Date(request.lastUpdateDate)}
            />
            <DetailRow
              label="Close date"
              value={formatAustin311Date(request.closeDate)}
            />
            <DetailRow label="Fiscal year" value={request.fiscalYear ?? "—"} />
            <DetailRow
              label="Response days"
              value={
                request.responseDays != null
                  ? String(request.responseDays)
                  : "—"
              }
            />
            <DetailRow label="Location" value={request.srLocation || "—"} />
            <DetailRow label="Coordinates" value={coords} />
          </dl>
        </div>

        <footer className="border-t border-[var(--austin311-border)] p-5">
          <a
            href="https://data.austintexas.gov/Transportation-and-Mobility/311-Service-Requests-Austin-Transportation-and-Public-/38mr-dwji"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[var(--austin311-accent)] underline-offset-2 hover:underline"
          >
            View dataset on data.austintexas.gov
          </a>
        </footer>
      </aside>
    </div>
  );
}
