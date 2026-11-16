"use client";

import { FinancingTracker } from "@/components/dealership-financing-tracker";
import {
  type CatalogVehicle,
  formatDollars,
  formatMileage,
  saleProfit,
  vehicleSpecs,
} from "@/lib/dealership";
import { type SaleLogEntry, formatPaymentPlan, formatSaleDate } from "@/lib/dealership-crm";
import type { Employee } from "@/lib/dealership-staff";
import { useEffect, useRef } from "react";

type SaleLogDetailSidebarProps = {
  entry: SaleLogEntry;
  vehicle: CatalogVehicle | null;
  imageUrl: string | undefined;
  assignedEmployee: Employee | null;
  onMarkPayment: (saleLogId: string) => void;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dealership-spec-row">
      <dt className="text-xs font-bold uppercase tracking-widest text-[var(--lot-muted)]">{label}</dt>
      <dd className="font-semibold text-[var(--lot-ink)]">{value}</dd>
    </div>
  );
}

function SaleStatusBadge({ status }: { status: SaleLogEntry["status"] }) {
  const label = status === "restocked" ? "Restocked" : "Completed";
  return (
    <span
      className={
        status === "restocked"
          ? "dealership-status-badge dealership-status-restocked"
          : "dealership-status-badge dealership-status-done"
      }
    >
      {label}
    </span>
  );
}

export function SaleLogDetailSidebar({
  entry,
  vehicle,
  imageUrl,
  assignedEmployee,
  onMarkPayment,
  onClose,
}: SaleLogDetailSidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const specs = vehicle ? vehicleSpecs(vehicle.id, vehicle.color) : null;
  const snap = entry.customerSnapshot;

  useEffect(() => {
    closeRef.current?.focus();
  }, [entry.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close sale details"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-log-sidebar-title"
        className="dealership-sidebar-panel relative flex h-full w-full max-w-md flex-col shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--lot-border)] p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--lot-muted)]">
              Sales log
            </p>
            <h2
              id="sale-log-sidebar-title"
              className="mt-1 text-xl font-extrabold text-[var(--lot-ink)]"
            >
              {entry.vehicleName}
            </h2>
            <div className="mt-2">
              <SaleStatusBadge status={entry.status} />
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="dealership-btn-ghost shrink-0"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {imageUrl ? (
            <div className="mb-4 overflow-hidden rounded-xl bg-[var(--lot-sky)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-40 w-full object-contain" />
            </div>
          ) : null}

          <section className="flex flex-col gap-1" aria-labelledby="sale-detail-vehicle">
            <h3 id="sale-detail-vehicle" className="text-sm font-extrabold text-[var(--lot-ink)]">
              Vehicle
            </h3>
            <dl className="dealership-specs">
              {specs ? (
                <>
                  <DetailRow label="Model" value={entry.vehicleName} />
                  <DetailRow label="VIN" value={specs.vin} />
                  <DetailRow label="Year" value={String(specs.year)} />
                  <DetailRow label="Color" value={specs.colorLabel} />
                  <DetailRow label="Mileage" value={formatMileage(specs.mileage)} />
                  <DetailRow label="Condition" value={specs.condition} />
                </>
              ) : (
                <>
                  <DetailRow label="Model" value={entry.vehicleName} />
                  <DetailRow label="Vehicle ID" value={entry.vehicleId} />
                </>
              )}
            </dl>
          </section>

          <section className="mt-6 flex flex-col gap-1" aria-labelledby="sale-detail-sale">
            <h3 id="sale-detail-sale" className="text-sm font-extrabold text-[var(--lot-ink)]">
              Sale
            </h3>
            <dl className="dealership-specs">
              <DetailRow label="Sold" value={formatSaleDate(entry.soldAt)} />
              <DetailRow label="Sale price" value={formatDollars(entry.ask)} />
              <DetailRow label="Your cost" value={formatDollars(entry.cost)} />
              <DetailRow
                label="Profit"
                value={formatDollars(saleProfit(entry.ask, entry.cost))}
              />
            </dl>
          </section>

          <section className="mt-6 flex flex-col gap-2" aria-labelledby="sale-detail-payment">
            <h3 id="sale-detail-payment" className="text-sm font-extrabold text-[var(--lot-ink)]">
              Payment
            </h3>
            <p className="text-sm text-[var(--lot-muted)]">{formatPaymentPlan(entry)}</p>
            <FinancingTracker entry={entry} onMarkPayment={onMarkPayment} />
            {entry.financing && entry.financing.termMonths > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 rounded-xl border border-[var(--lot-border)] bg-white/70 p-3">
                {entry.financing.installmentsPaid.map((paid, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[var(--lot-ink)]">Month {index + 1}</span>
                    <span
                      className={
                        paid
                          ? "font-bold text-[var(--lot-accent)]"
                          : "text-[var(--lot-muted)]"
                      }
                    >
                      {paid ? "Paid" : "Open"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="mt-6 flex flex-col gap-1" aria-labelledby="sale-detail-buyer">
            <h3 id="sale-detail-buyer" className="text-sm font-extrabold text-[var(--lot-ink)]">
              Buyer
            </h3>
            <dl className="dealership-specs">
              <DetailRow label="Name" value={snap.name} />
              <DetailRow label="Email" value={snap.email || "—"} />
              <DetailRow label="Phone" value={snap.phone || "—"} />
              <DetailRow label="Address" value={snap.address || "—"} />
              <DetailRow
                label="Age"
                value={snap.age !== null ? String(snap.age) : "—"}
              />
              {snap.notes ? <DetailRow label="Notes" value={snap.notes} /> : null}
            </dl>
          </section>

          <section className="mt-6 flex flex-col gap-1" aria-labelledby="sale-detail-staff">
            <h3 id="sale-detail-staff" className="text-sm font-extrabold text-[var(--lot-ink)]">
              Lot staff
            </h3>
            {assignedEmployee ? (
              <p className="text-sm text-[var(--lot-ink)]">
                Assigned salesperson:{" "}
                <span className="font-bold">{assignedEmployee.name}</span>
                {assignedEmployee.role ? (
                  <span className="text-[var(--lot-muted)]"> · {assignedEmployee.role}</span>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-[var(--lot-muted)]">No salesperson assigned to this car.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
